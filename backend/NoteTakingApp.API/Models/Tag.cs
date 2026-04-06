namespace NoteTakingApp.API.Models;

/// <summary>
/// Represents a label/tag that can be applied to multiple notes.
/// Names are stored lowercase-trimmed to ensure uniqueness by value.
/// </summary>
public class Tag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<NoteTag> NoteTags { get; set; } = new List<NoteTag>();
}
