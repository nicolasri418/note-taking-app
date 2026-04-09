using Microsoft.AspNetCore.Mvc;
using Moq;
using NoteTakingApp.API.Controllers;
using NoteTakingApp.API.DTOs;
using NoteTakingApp.API.Models;
using NoteTakingApp.API.Repositories;
using Xunit;

namespace NoteTakingApp.Tests;

/// <summary>
/// Unit tests for NotesController using a Moq'd INoteRepository.
/// These tests are fast and focus on HTTP response codes and DTO mapping.
/// </summary>
public class NotesControllerTests
{
    private static Note SampleNote(int id = 1) => new()
    {
        Id = id,
        Title = "Test Note",
        Body = "Body text",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        NoteTags = new List<NoteTag>
        {
            new() { Tag = new Tag { Id = 1, Name = "test" }, NoteId = id, TagId = 1 }
        },
        TodoItems = new List<TodoItem>()
    };

    // ── GetAll ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsOkWithNotes()
    {
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.GetAllAsync(null, null))
            .ReturnsAsync(new[] { SampleNote() });

        var ctrl = new NotesController(repo.Object);
        var result = await ctrl.GetAll(null, null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dtos = Assert.IsAssignableFrom<IEnumerable<NoteDto>>(ok.Value);
        Assert.Single(dtos);
    }

    // ── GetById ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_ExistingId_ReturnsOk()
    {
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(SampleNote());

        var ctrl = new NotesController(repo.Object);
        var result = await ctrl.GetById(1);

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetById_MissingId_ReturnsNotFound()
    {
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((Note?)null);

        var ctrl = new NotesController(repo.Object);
        var result = await ctrl.GetById(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_ValidDto_Returns201Created()
    {
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.CreateAsync(It.IsAny<Note>())).ReturnsAsync(SampleNote());
        repo.Setup(r => r.GetOrCreateTagAsync(It.IsAny<string>()))
            .ReturnsAsync(new Tag { Id = 1, Name = "test" });

        var ctrl = new NotesController(repo.Object);
        var dto = new CreateNoteDto("New Note", "Body", new List<string> { "test" }, null);

        var result = await ctrl.Create(dto);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(201, created.StatusCode);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_ExistingNote_ReturnsOkWithUpdatedData()
    {
        var note = SampleNote();
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(note);
        repo.Setup(r => r.UpdateAsync(It.IsAny<Note>())).ReturnsAsync(note);

        var ctrl = new NotesController(repo.Object);
        var dto = new UpdateNoteDto("Updated Title", "Updated Body");

        var result = await ctrl.Update(1, dto);

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task Update_NonExistentNote_ReturnsNotFound()
    {
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((Note?)null);

        var ctrl = new NotesController(repo.Object);
        var result = await ctrl.Update(99, new UpdateNoteDto("T", "B"));

        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_ExistingNote_Returns204NoContent()
    {
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var ctrl = new NotesController(repo.Object);
        var result = await ctrl.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_NonExistentNote_ReturnsNotFound()
    {
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.DeleteAsync(99)).ReturnsAsync(false);

        var ctrl = new NotesController(repo.Object);
        var result = await ctrl.Delete(99);

        Assert.IsType<NotFoundResult>(result);
    }

    // ── DTO mapping ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_MapsTagsCorrectly()
    {
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.GetAllAsync(null, null))
            .ReturnsAsync(new[] { SampleNote() });

        var ctrl = new NotesController(repo.Object);
        var result = await ctrl.GetAll(null, null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dtos = Assert.IsAssignableFrom<IEnumerable<NoteDto>>(ok.Value).ToList();
        Assert.Single(dtos[0].Tags);
        Assert.Equal("test", dtos[0].Tags[0].Name);
        // Access all NoteDto properties to ensure DTO getters are covered
        Assert.Equal(1,       dtos[0].Id);
        Assert.Equal("Test Note",  dtos[0].Title);
        Assert.Equal("Body text",  dtos[0].Body);
        Assert.NotEqual(default,   dtos[0].CreatedAt);
        Assert.NotEqual(default,   dtos[0].UpdatedAt);
        Assert.NotNull(dtos[0].TodoItems);
    }

    // ── Search & tag filter (US-4 / US-5) ────────────────────────────────────

    [Fact]
    public async Task GetAll_WithSearchParam_PassesSearchToRepository()
    {
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.GetAllAsync("keyword", null))
            .ReturnsAsync(new[] { SampleNote() });

        var ctrl = new NotesController(repo.Object);
        var result = await ctrl.GetAll("keyword", null);

        repo.Verify(r => r.GetAllAsync("keyword", null), Times.Once);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Single(Assert.IsAssignableFrom<IEnumerable<NoteDto>>(ok.Value));
    }

    [Fact]
    public async Task GetAll_WithTagParam_PassesTagToRepository()
    {
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.GetAllAsync(null, "work"))
            .ReturnsAsync(new[] { SampleNote() });

        var ctrl = new NotesController(repo.Object);
        var result = await ctrl.GetAll(null, "work");

        repo.Verify(r => r.GetAllAsync(null, "work"), Times.Once);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Single(Assert.IsAssignableFrom<IEnumerable<NoteDto>>(ok.Value));
    }

    [Fact]
    public async Task GetAll_WithNoFilters_ReturnsAllNotes()
    {
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.GetAllAsync(null, null))
            .ReturnsAsync(new[] { SampleNote(1), SampleNote(2) });

        var ctrl = new NotesController(repo.Object);
        var result = await ctrl.GetAll(null, null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(2, Assert.IsAssignableFrom<IEnumerable<NoteDto>>(ok.Value).Count());
    }

    // ── GetTags ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetTags_ReturnsOkWithAllTags()
    {
        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.GetAllTagsAsync())
            .ReturnsAsync(new[] { new Tag { Id = 1, Name = "work" }, new Tag { Id = 2, Name = "personal" } });

        var ctrl = new NotesController(repo.Object);
        var result = await ctrl.GetTags();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var tags = Assert.IsAssignableFrom<IEnumerable<TagDto>>(ok.Value).ToList();
        Assert.Equal(2, tags.Count);
        Assert.Equal(1, tags[0].Id);
        Assert.Equal("work", tags[0].Name);
    }

    // ── TodoItem hierarchy (AttachTodoItems + MapToDto tree) ──────────────────

    [Fact]
    public async Task Create_WithTodoItems_BuildsHierarchyAndMapsDto()
    {
        // The returned note contains three todo items to exercise all MapToDto branches:
        //   parent (Id=10, ParentId=null)  → becomes a root
        //   child  (Id=11, ParentId=10)    → nested under parent (ParentId found in todoMap)
        //   orphan (Id=12, ParentId=99)    → becomes a root (ParentId=99 not in todoMap)
        var parentItem = new TodoItem { Id = 10, Text = "Parent", IsCompleted = false, SortOrder = 0 };
        var childItem  = new TodoItem { Id = 11, Text = "Child",  IsCompleted = true,  SortOrder = 0, ParentId = 10 };
        var orphanItem = new TodoItem { Id = 12, Text = "Orphan", IsCompleted = false, SortOrder = 2, ParentId = 99 };

        var returned = new Note
        {
            Id = 1, Title = "Todo Note", Body = "Body",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        returned.TodoItems.Add(parentItem);
        returned.TodoItems.Add(childItem);
        returned.TodoItems.Add(orphanItem);

        var repo = new Mock<INoteRepository>();
        repo.Setup(r => r.CreateAsync(It.IsAny<Note>())).ReturnsAsync(returned);

        var ctrl = new NotesController(repo.Object);

        // Input DTOs exercise all AttachTodoItems branches:
        //   item1: Id=10  → added to entityMap; ParentId=null → no parent wired
        //   item2: Id=11  → added to entityMap; ParentId=10 found in map → Parent set
        //   item3: Id=null → NOT added to entityMap; ParentId=99 NOT in map → no parent wired
        var dto = new CreateNoteDto("Todo Note", "Body", null, new List<TodoItemWriteDto>
        {
            new(10,   "Parent", false, 0, null),
            new(11,   "Child",  true,  0, 10),
            new(null, "Orphan", false, 2, 99),
        });

        var result = await ctrl.Create(dto);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var noteDto = Assert.IsType<NoteDto>(created.Value);

        // Verify all NoteDto properties are accessible (covers DTO getters)
        Assert.Equal(1,           noteDto.Id);
        Assert.Equal("Todo Note", noteDto.Title);
        Assert.Equal("Body",      noteDto.Body);
        Assert.NotEqual(default,  noteDto.CreatedAt);
        Assert.NotEqual(default,  noteDto.UpdatedAt);
        Assert.NotNull(noteDto.TodoItems);

        // Two roots: parent (SortOrder=0) and orphan (SortOrder=2)
        Assert.Equal(2, noteDto.TodoItems.Count);

        var parentDto = noteDto.TodoItems.First(t => t.Text == "Parent");
        Assert.Equal(10,   parentDto.Id);
        Assert.Null(parentDto.ParentId);
        Assert.Equal(0,    parentDto.SortOrder);
        Assert.Single(parentDto.Children);

        var childDto = parentDto.Children[0];
        Assert.Equal("Child", childDto.Text);
        Assert.Equal(11,      childDto.Id);
        Assert.True(childDto.IsCompleted);
        Assert.Equal(10,      childDto.ParentId);
        Assert.Equal(0,       childDto.SortOrder);
        Assert.Empty(childDto.Children);

        var orphanDto = noteDto.TodoItems.First(t => t.Text == "Orphan");
        Assert.Equal(12, orphanDto.Id);
        Assert.Empty(orphanDto.Children);
    }
}
