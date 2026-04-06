namespace NoteTakingApp.API.Models;

/// <summary>
/// Represents a single checklist item within a note (US-8).
/// Supports one level of nesting via ParentId (null = root item).
/// SortOrder controls display sequence within the same parent level.
/// </summary>
public class TodoItem
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public int SortOrder { get; set; }

    // Nullable self-reference for nesting
    public int? ParentId { get; set; }
    public TodoItem? Parent { get; set; }
    public ICollection<TodoItem> Children { get; set; } = new List<TodoItem>();

    // Foreign key to owning note
    public int NoteId { get; set; }
    public Note Note { get; set; } = null!;
}
