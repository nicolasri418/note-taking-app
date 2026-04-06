using System.ComponentModel.DataAnnotations;

namespace NoteTakingApp.API.DTOs;

// ─── Read DTOs ────────────────────────────────────────────────────────────────

public record TagDto(int Id, string Name);

public record TodoItemDto(
    int Id,
    string Text,
    bool IsCompleted,
    int SortOrder,
    int? ParentId,
    List<TodoItemDto> Children
);

public record NoteDto(
    int Id,
    string Title,
    string Body,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<TagDto> Tags,
    List<TodoItemDto> TodoItems
);

// ─── Write DTOs ───────────────────────────────────────────────────────────────

public record TodoItemWriteDto(
    int? Id,                 // null = new item
    [Required] string Text,
    bool IsCompleted,
    int SortOrder,
    int? ParentId
);

public record CreateNoteDto(
    [Required][MaxLength(200)] string Title,
    string Body = "",
    List<string>? Tags = null,
    List<TodoItemWriteDto>? TodoItems = null
);

public record UpdateNoteDto(
    [Required][MaxLength(200)] string Title,
    string Body = "",
    List<string>? Tags = null,
    List<TodoItemWriteDto>? TodoItems = null
);
