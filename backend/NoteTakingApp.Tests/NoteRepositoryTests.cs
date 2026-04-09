using Microsoft.EntityFrameworkCore;
using NoteTakingApp.API.Data;
using NoteTakingApp.API.Models;
using NoteTakingApp.API.Repositories;
using Xunit;

namespace NoteTakingApp.Tests;

/// <summary>
/// Integration-style tests for NoteRepository using EF Core InMemory provider.
/// Each test gets a fresh database via a unique DbName.
/// </summary>
public class NoteRepositoryTests
{
    private static NoteDbContext CreateDb(string name)
    {
        var opts = new DbContextOptionsBuilder<NoteDbContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new NoteDbContext(opts);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_PersistsNote_AndReturnsWithId()
    {
        using var db = CreateDb(nameof(CreateAsync_PersistsNote_AndReturnsWithId));
        var repo = new NoteRepository(db);

        var note = new Note { Title = "Hello", Body = "World" };
        var created = await repo.CreateAsync(note);

        Assert.True(created.Id > 0);
        Assert.Equal("Hello", created.Title);
    }

    // ── GetAll with search ────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_SearchFilter_ReturnsMatchingNotes()
    {
        using var db = CreateDb(nameof(GetAllAsync_SearchFilter_ReturnsMatchingNotes));
        var repo = new NoteRepository(db);

        await repo.CreateAsync(new Note { Title = "Groceries", Body = "Milk and eggs" });
        await repo.CreateAsync(new Note { Title = "Work", Body = "Finish quarterly report" });

        var results = await repo.GetAllAsync(search: "milk");

        Assert.Single(results);
        Assert.Equal("Groceries", results.First().Title);
    }

    [Fact]
    public async Task GetAllAsync_SearchFilter_IsCaseInsensitive()
    {
        using var db = CreateDb(nameof(GetAllAsync_SearchFilter_IsCaseInsensitive));
        var repo = new NoteRepository(db);

        await repo.CreateAsync(new Note { Title = "UPPER CASE TITLE", Body = "" });

        var results = await repo.GetAllAsync(search: "upper case");

        Assert.Single(results);
    }

    // ── GetAll with tag filter ────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_TagFilter_ReturnsOnlyTaggedNotes()
    {
        using var db = CreateDb(nameof(GetAllAsync_TagFilter_ReturnsOnlyTaggedNotes));
        var repo = new NoteRepository(db);

        var tag = new Tag { Name = "work" };
        db.Tags.Add(tag);
        await db.SaveChangesAsync();

        var workNote = new Note { Title = "Work Note", Body = "" };
        workNote.NoteTags.Add(new NoteTag { Tag = tag });
        await repo.CreateAsync(workNote);
        await repo.CreateAsync(new Note { Title = "Personal Note", Body = "" });

        var results = await repo.GetAllAsync(tag: "work");

        Assert.Single(results);
        Assert.Equal("Work Note", results.First().Title);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_ChangesTitle_AndUpdatesTimestamp()
    {
        using var db = CreateDb(nameof(UpdateAsync_ChangesTitle_AndUpdatesTimestamp));
        var repo = new NoteRepository(db);

        var note = await repo.CreateAsync(new Note { Title = "Old Title", Body = "" });
        var before = note.UpdatedAt;

        await Task.Delay(5); // ensure timestamp differs
        note.Title = "New Title";
        var updated = await repo.UpdateAsync(note);

        Assert.Equal("New Title", updated.Title);
        Assert.True(updated.UpdatedAt >= before);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_ExistingNote_ReturnsTrue()
    {
        using var db = CreateDb(nameof(DeleteAsync_ExistingNote_ReturnsTrue));
        var repo = new NoteRepository(db);

        var note = await repo.CreateAsync(new Note { Title = "Delete Me", Body = "" });
        var result = await repo.DeleteAsync(note.Id);

        Assert.True(result);
        Assert.Null(await repo.GetByIdAsync(note.Id));
    }

    [Fact]
    public async Task DeleteAsync_NonExistentNote_ReturnsFalse()
    {
        using var db = CreateDb(nameof(DeleteAsync_NonExistentNote_ReturnsFalse));
        var repo = new NoteRepository(db);

        var result = await repo.DeleteAsync(9999);

        Assert.False(result);
    }

    // ── Tag deduplication ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetOrCreateTagAsync_SameNameTwice_ReturnsSameEntity()
    {
        using var db = CreateDb(nameof(GetOrCreateTagAsync_SameNameTwice_ReturnsSameEntity));
        var repo = new NoteRepository(db);

        var first = await repo.GetOrCreateTagAsync("Work");
        var second = await repo.GetOrCreateTagAsync("work"); // different casing

        Assert.Equal(first.Id, second.Id);
        Assert.Single(db.Tags);
    }

    // ── GetAllTagsAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllTagsAsync_ReturnsTagsOrderedByName()
    {
        using var db = CreateDb(nameof(GetAllTagsAsync_ReturnsTagsOrderedByName));
        var repo = new NoteRepository(db);

        db.Tags.Add(new Tag { Name = "work" });
        db.Tags.Add(new Tag { Name = "personal" });
        await db.SaveChangesAsync();

        var tags = (await repo.GetAllTagsAsync()).ToList();

        Assert.Equal(2, tags.Count);
        Assert.Equal("personal", tags[0].Name); // alphabetical
        Assert.Equal("work",     tags[1].Name);
    }

    // ── TodoItem persistence ──────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_WithTodoItems_PersistsHierarchy()
    {
        using var db = CreateDb(nameof(CreateAsync_WithTodoItems_PersistsHierarchy));
        var repo = new NoteRepository(db);

        var parent = new TodoItem { Text = "Parent Task", IsCompleted = false, SortOrder = 0 };
        var child = new TodoItem { Text = "Child Task", IsCompleted = false, SortOrder = 0, Parent = parent };

        var note = new Note { Title = "Todo Note", Body = "" };
        note.TodoItems.Add(parent);
        note.TodoItems.Add(child);

        var created = await repo.CreateAsync(note);

        Assert.Equal(2, created.TodoItems.Count);
    }

    // ── US-6: Persistence round-trip ──────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_AfterCreate_ReturnsPersistednote()
    {
        using var db = CreateDb(nameof(GetByIdAsync_AfterCreate_ReturnsPersistednote));
        var repo = new NoteRepository(db);

        var note = await repo.CreateAsync(new Note { Title = "Round Trip", Body = "Persisted body" });
        var fetched = await repo.GetByIdAsync(note.Id);

        Assert.NotNull(fetched);
        Assert.Equal("Round Trip", fetched!.Title);
        Assert.Equal("Persisted body", fetched.Body);
    }

    [Fact]
    public async Task GetByIdAsync_AfterUpdate_ReturnsUpdatedNote()
    {
        using var db = CreateDb(nameof(GetByIdAsync_AfterUpdate_ReturnsUpdatedNote));
        var repo = new NoteRepository(db);

        var note = await repo.CreateAsync(new Note { Title = "Original", Body = "Old body" });
        note.Title = "Updated Title";
        note.Body  = "New body";
        await repo.UpdateAsync(note);

        var fetched = await repo.GetByIdAsync(note.Id);

        Assert.NotNull(fetched);
        Assert.Equal("Updated Title", fetched!.Title);
        Assert.Equal("New body",      fetched.Body);
    }

    [Fact]
    public async Task CreateAsync_WithTags_PersistsTagAssociation()
    {
        using var db = CreateDb(nameof(CreateAsync_WithTags_PersistsTagAssociation));
        var repo = new NoteRepository(db);

        var tag = await repo.GetOrCreateTagAsync("persistence");
        var note = new Note { Title = "Tagged Note", Body = "" };
        note.NoteTags.Add(new NoteTag { Tag = tag });
        var created = await repo.CreateAsync(note);

        var fetched = await repo.GetByIdAsync(created.Id);

        Assert.NotNull(fetched);
        Assert.Single(fetched!.NoteTags);
        Assert.Equal("persistence", fetched.NoteTags.First().Tag.Name);
    }

    [Fact]
    public async Task DeleteAsync_RemovesNoteFromGetAllResults()
    {
        using var db = CreateDb(nameof(DeleteAsync_RemovesNoteFromGetAllResults));
        var repo = new NoteRepository(db);

        var note = await repo.CreateAsync(new Note { Title = "To Delete", Body = "" });
        await repo.DeleteAsync(note.Id);

        var allNotes = await repo.GetAllAsync();
        Assert.Empty(allNotes);
    }
}
