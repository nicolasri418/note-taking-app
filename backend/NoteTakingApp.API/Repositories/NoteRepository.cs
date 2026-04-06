using Microsoft.EntityFrameworkCore;
using NoteTakingApp.API.Data;
using NoteTakingApp.API.Models;

namespace NoteTakingApp.API.Repositories;

public class NoteRepository(NoteDbContext db) : INoteRepository
{
    // ── Base query with all necessary includes ────────────────────────────────
    private IQueryable<Note> NotesWithIncludes() =>
        db.Notes
          .Include(n => n.NoteTags).ThenInclude(nt => nt.Tag)
          .Include(n => n.TodoItems.OrderBy(t => t.SortOrder));

    // ── Queries ───────────────────────────────────────────────────────────────

    public async Task<IEnumerable<Note>> GetAllAsync(string? search = null, string? tag = null)
    {
        var query = NotesWithIncludes().AsQueryable();

        // Full-text search across title and body (US-4)
        if (!string.IsNullOrWhiteSpace(search))
        {
            var lower = search.ToLower();
            query = query.Where(n =>
                n.Title.ToLower().Contains(lower) ||
                n.Body.ToLower().Contains(lower));
        }

        // Filter by tag name (US-5)
        if (!string.IsNullOrWhiteSpace(tag))
        {
            var lower = tag.ToLower();
            query = query.Where(n =>
                n.NoteTags.Any(nt => nt.Tag.Name.ToLower() == lower));
        }

        return await query
            .OrderByDescending(n => n.UpdatedAt)
            .ToListAsync();
    }

    public async Task<Note?> GetByIdAsync(int id) =>
        await NotesWithIncludes().FirstOrDefaultAsync(n => n.Id == id);

    public async Task<IEnumerable<Tag>> GetAllTagsAsync() =>
        await db.Tags.OrderBy(t => t.Name).ToListAsync();

    // ── Commands ──────────────────────────────────────────────────────────────

    public async Task<Note> CreateAsync(Note note)
    {
        note.CreatedAt = DateTime.UtcNow;
        note.UpdatedAt = DateTime.UtcNow;
        db.Notes.Add(note);
        await db.SaveChangesAsync();
        return (await GetByIdAsync(note.Id))!;
    }

    public async Task<Note> UpdateAsync(Note note)
    {
        note.UpdatedAt = DateTime.UtcNow;
        db.Notes.Update(note);
        await db.SaveChangesAsync();
        return (await GetByIdAsync(note.Id))!;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var note = await db.Notes.FindAsync(id);
        if (note is null) return false;

        db.Notes.Remove(note);
        await db.SaveChangesAsync();
        return true;
    }

    // ── Tag resolution ────────────────────────────────────────────────────────

    public async Task<Tag> GetOrCreateTagAsync(string name)
    {
        var normalized = name.Trim().ToLower();
        var existing = await db.Tags.FirstOrDefaultAsync(t => t.Name == normalized);
        if (existing is not null) return existing;

        var tag = new Tag { Name = normalized };
        db.Tags.Add(tag);
        await db.SaveChangesAsync();
        return tag;
    }
}
