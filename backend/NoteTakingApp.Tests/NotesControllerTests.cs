using Microsoft.AspNetCore.Mvc;
using Moq;
using NoteTakingApp.API.Controllers;
using NoteTakingApp.API.DTOs;
using NoteTakingApp.API.Models;
using NoteTakingApp.API.Repositories;

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
    }
}
