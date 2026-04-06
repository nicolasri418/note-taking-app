using NoteTakingApp.API.Models;

namespace NoteTakingApp.API.Repositories;

/// <summary>
/// Repository abstraction for all Note persistence operations.
/// Keeping the interface narrow to what the API actually needs makes
/// it straightforward to swap backing stores (SQLite → Postgres, etc.).
/// </summary>
public interface INoteRepository
{
    // ── Query ─────────────────────────────────────────────────────────────────
    Task<IEnumerable<Note>> GetAllAsync(string? search = null, string? tag = null);
    Task<Note?> GetByIdAsync(int id);
    Task<IEnumerable<Tag>> GetAllTagsAsync();

    // ── Command ───────────────────────────────────────────────────────────────
    Task<Note> CreateAsync(Note note);
    Task<Note> UpdateAsync(Note note);
    Task<bool> DeleteAsync(int id);

    // ── Tag helpers (used by controller to resolve tag names → entities) ──────
    Task<Tag> GetOrCreateTagAsync(string name);
}
