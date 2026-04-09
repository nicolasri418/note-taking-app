using Azure.Storage.Blobs;
using iTextSharp.text;
using iTextSharp.text.pdf;
using NoteTakingApp.API.Models;

namespace NoteTakingApp.API.Services;

/// <summary>
/// Mirrors every NoteFlow CRUD operation into the DeepSeekChat RAG pipeline
/// via the DeepSeekChat Ingestion API:
///
///   Create / Update → GeneratePdf → Upload blob → POST /api/documents/index/{blobName}
///   Delete          → DELETE /api/documents/{blobName}  (blob + AI Search cleanup)
///
/// Blob name is deterministic: noteflow_{noteId}.pdf
///   - Update overwrites the same blob — no stale file accumulation.
///   - Delete targets the exact blob without storing the name in the DB.
/// </summary>
public sealed class NoteExportService : INoteExportService
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<NoteExportService> _logger;
    private readonly string _containerName;

    public NoteExportService(
        BlobServiceClient blobServiceClient,
        IHttpClientFactory httpClientFactory,
        ILogger<NoteExportService> logger,
        IConfiguration config)
    {
        _blobServiceClient = blobServiceClient;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _containerName = config["Azure:ContainerName"] ?? "raw-docs";
    }

    public async Task ExportNoteAsync(Note note)
    {
        try
        {
            var blobName = BlobName(note.Id);

            await UploadBlobAsync(blobName, GeneratePdf(note));
            await NotifyIndexAsync(blobName);

            _logger.LogInformation(
                "Note {NoteId} ('{Title}') uploaded and queued for indexing as '{BlobName}'",
                note.Id, note.Title, blobName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to export note {NoteId} ('{Title}')",
                note.Id, note.Title);
        }
    }

    public async Task DeleteNoteExportAsync(int noteId)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("DeepSeekChat");
            var response = await client.DeleteAsync($"api/documents/{Uri.EscapeDataString(BlobName(noteId))}");
            response.EnsureSuccessStatusCode();

            _logger.LogInformation("Blob and index deleted for note {NoteId}", noteId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete blob/index for note {NoteId}", noteId);
        }
    }

    // ── PDF generation ────────────────────────────────────────────────────────

    private static byte[] GeneratePdf(Note note)
    {
        using var ms = new MemoryStream();
        var document = new Document(PageSize.A4, 50f, 50f, 50f, 50f);
        PdfWriter.GetInstance(document, ms);
        document.Open();

        // Title
        var titleFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 18f);
        document.Add(new Paragraph(note.Title, titleFont) { SpacingAfter = 12f });

        // Body
        if (!string.IsNullOrWhiteSpace(note.Body))
        {
            var bodyFont = FontFactory.GetFont(FontFactory.HELVETICA, 12f);
            document.Add(new Paragraph(note.Body, bodyFont) { SpacingAfter = 16f });
        }

        // Tags line (helps the RAG model understand context)
        var tags = note.NoteTags.Select(nt => nt.Tag.Name).ToList();
        if (tags.Count > 0)
        {
            var tagFont = FontFactory.GetFont(FontFactory.HELVETICA_OBLIQUE, 10f, BaseColor.Gray);
            document.Add(new Paragraph($"Tags: {string.Join(", ", tags)}", tagFont)
            {
                SpacingAfter = 16f
            });
        }

        // Todo items
        var rootTodos = note.TodoItems
            .Where(t => t.ParentId == null)
            .OrderBy(t => t.SortOrder)
            .ToList();

        if (rootTodos.Count > 0)
        {
            var sectionFont = FontFactory.GetFont(FontFactory.HELVETICA_BOLD, 13f);
            document.Add(new Paragraph("To-Do Items", sectionFont) { SpacingAfter = 8f });

            var itemFont = FontFactory.GetFont(FontFactory.HELVETICA, 11f);
            foreach (var todo in rootTodos)
            {
                var check = todo.IsCompleted ? "[x]" : "[ ]";
                document.Add(new Paragraph($"  {check} {todo.Text}", itemFont));

                // One level of sub-items (enforced by schema)
                foreach (var sub in note.TodoItems
                    .Where(t => t.ParentId == todo.Id)
                    .OrderBy(t => t.SortOrder))
                {
                    var subCheck = sub.IsCompleted ? "[x]" : "[ ]";
                    document.Add(new Paragraph($"      {subCheck} {sub.Text}", itemFont));
                }
            }
        }

        document.Close();
        return ms.ToArray();
    }

    // ── Blob upload ───────────────────────────────────────────────────────────

    private async Task UploadBlobAsync(string blobName, byte[] pdfBytes)
    {
        var container = _blobServiceClient.GetBlobContainerClient(_containerName);
        await container.CreateIfNotExistsAsync();

        using var stream = new MemoryStream(pdfBytes);
        await container.GetBlobClient(blobName).UploadAsync(stream, overwrite: true);
    }

    // ── DeepSeekChat API call ─────────────────────────────────────────────────

    private async Task NotifyIndexAsync(string blobName)
    {
        var client = _httpClientFactory.CreateClient("DeepSeekChat");
        var response = await client.PostAsync(
            $"api/documents/index/{Uri.EscapeDataString(blobName)}", content: null);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError(
                "NotifyIndex failed for '{BlobName}': {Status} {Reason} — {Body}",
                blobName, (int)response.StatusCode, response.ReasonPhrase, body);
        }

        response.EnsureSuccessStatusCode();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    // Deterministic blob name — noteId is the stable identity; title changes don't create new blobs.
    private static string BlobName(int noteId) => $"noteflow_{noteId}.pdf";
}
