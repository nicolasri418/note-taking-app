namespace NoteTakingApp.API.Models;

/// <summary>
/// Core domain entity representing a note.
/// Tags use a many-to-many relationship via the NoteTag join table.
/// TodoItems are owned entities (one-to-many, cascade delete).
/// </summary>
public class Note
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<NoteTag> NoteTags { get; set; } = new List<NoteTag>();
    public ICollection<TodoItem> TodoItems { get; set; } = new List<TodoItem>();
}

/// <summary>Join entity for the Note <-> Tag many-to-many relationship.</summary>
public class NoteTag
{
    public int NoteId { get; set; }
    public Note Note { get; set; } = null!;

    public int TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}
