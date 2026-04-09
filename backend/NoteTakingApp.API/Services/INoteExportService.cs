using NoteTakingApp.API.Models;

namespace NoteTakingApp.API.Services;

public interface INoteExportService
{
    /// <summary>
    /// Uploads the note as a PDF to the DeepSeekChat raw-docs blob container and
    /// publishes a DocumentUploadedEvent to trigger ingestion. Used on create and update.
    /// Blob name is deterministic: noteflow_{noteId}.pdf — update overwrites, never accumulates.
    /// </summary>
    Task ExportNoteAsync(Note note);

    /// <summary>
    /// Deletes the note's PDF blob from the raw-docs container. Called on note deletion.
    /// </summary>
    Task DeleteNoteExportAsync(int noteId);
}

/// <summary>
/// Registered when Azure:KeyVaultName is absent (local dev without Key Vault).
/// </summary>
internal sealed class NoOpNoteExportService : INoteExportService
{
    public Task ExportNoteAsync(Note note) => Task.CompletedTask;
    public Task DeleteNoteExportAsync(int noteId) => Task.CompletedTask;
}
