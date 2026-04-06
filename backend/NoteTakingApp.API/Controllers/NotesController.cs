using Microsoft.AspNetCore.Mvc;
using NoteTakingApp.API.DTOs;
using NoteTakingApp.API.Models;
using NoteTakingApp.API.Repositories;

namespace NoteTakingApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class NotesController(INoteRepository repo) : ControllerBase
{
    // ── GET /api/notes?search=&tag= ───────────────────────────────────────────
    /// <summary>Returns all notes. Supports ?search= (US-4) and ?tag= (US-5) filters.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<NoteDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? tag)
    {
        var notes = await repo.GetAllAsync(search, tag);
        return Ok(notes.Select(MapToDto));
    }

    // ── GET /api/notes/{id} ───────────────────────────────────────────────────
    [HttpGet("{id:int}")]
    public async Task<ActionResult<NoteDto>> GetById(int id)
    {
        var note = await repo.GetByIdAsync(id);
        return note is null ? NotFound() : Ok(MapToDto(note));
    }

    // ── GET /api/notes/tags ───────────────────────────────────────────────────
    /// <summary>Returns all distinct tag names for the filter sidebar (US-5).</summary>
    [HttpGet("tags")]
    public async Task<ActionResult<IEnumerable<TagDto>>> GetTags()
    {
        var tags = await repo.GetAllTagsAsync();
        return Ok(tags.Select(t => new TagDto(t.Id, t.Name)));
    }

    // ── POST /api/notes ───────────────────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<NoteDto>> Create([FromBody] CreateNoteDto dto)
    {
        var note = new Note { Title = dto.Title, Body = dto.Body };
        await AttachTagsAsync(note, dto.Tags);
        AttachTodoItems(note, dto.TodoItems);

        var created = await repo.CreateAsync(note);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, MapToDto(created));
    }

    // ── PUT /api/notes/{id} ───────────────────────────────────────────────────
    [HttpPut("{id:int}")]
    public async Task<ActionResult<NoteDto>> Update(int id, [FromBody] UpdateNoteDto dto)
    {
        var note = await repo.GetByIdAsync(id);
        if (note is null) return NotFound();

        note.Title = dto.Title;
        note.Body = dto.Body;

        // Replace tags
        note.NoteTags.Clear();
        await AttachTagsAsync(note, dto.Tags);

        // Replace todo items
        note.TodoItems.Clear();
        AttachTodoItems(note, dto.TodoItems);

        var updated = await repo.UpdateAsync(note);
        return Ok(MapToDto(updated));
    }

    // ── DELETE /api/notes/{id} ────────────────────────────────────────────────
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await repo.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task AttachTagsAsync(Note note, List<string>? tagNames)
    {
        if (tagNames is null || tagNames.Count == 0) return;

        foreach (var name in tagNames.Where(n => !string.IsNullOrWhiteSpace(n)).Distinct())
        {
            var tag = await repo.GetOrCreateTagAsync(name);
            note.NoteTags.Add(new NoteTag { Tag = tag });
        }
    }

    /// <summary>
    /// Converts the flat DTO list into the entity hierarchy.
    /// Items with a null ParentId become root-level; others are nested under
    /// the TodoItem whose DTO Id matches their ParentId.
    /// </summary>
    private static void AttachTodoItems(Note note, List<TodoItemWriteDto>? items)
    {
        if (items is null || items.Count == 0) return;

        // Two-pass: first create all entities, then wire up parent references
        var entityMap = new Dictionary<int, TodoItem>();
        var entities = new List<TodoItem>();

        foreach (var dto in items)
        {
            var entity = new TodoItem
            {
                Text = dto.Text,
                IsCompleted = dto.IsCompleted,
                SortOrder = dto.SortOrder,
                NoteId = note.Id
            };
            entities.Add(entity);
            if (dto.Id.HasValue)
                entityMap[dto.Id.Value] = entity;
        }

        // Wire parent references for nested items
        for (var i = 0; i < items.Count; i++)
        {
            if (items[i].ParentId.HasValue && entityMap.TryGetValue(items[i].ParentId!.Value, out var parent))
                entities[i].Parent = parent;
        }

        foreach (var e in entities)
            note.TodoItems.Add(e);
    }

    // ── DTO mapping ───────────────────────────────────────────────────────────

    private static NoteDto MapToDto(Note note)
    {
        var todoMap = note.TodoItems
            .ToDictionary(t => t.Id, t => new TodoItemDto(
                t.Id, t.Text, t.IsCompleted, t.SortOrder, t.ParentId,
                new List<TodoItemDto>()));

        // Build tree: attach children to parents, collect roots
        var roots = new List<TodoItemDto>();
        foreach (var (id, dto) in todoMap)
        {
            var entity = note.TodoItems.First(t => t.Id == id);
            if (entity.ParentId.HasValue && todoMap.TryGetValue(entity.ParentId.Value, out var parent))
                parent.Children.Add(dto);
            else
                roots.Add(dto);
        }

        return new NoteDto(
            note.Id,
            note.Title,
            note.Body,
            note.CreatedAt,
            note.UpdatedAt,
            note.NoteTags.Select(nt => new TagDto(nt.Tag.Id, nt.Tag.Name)).ToList(),
            roots.OrderBy(r => r.SortOrder).ToList()
        );
    }
}
