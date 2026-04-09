using Azure.Identity;
using Azure.Storage.Blobs;
using Microsoft.EntityFrameworkCore;
using NoteTakingApp.API.Data;
using NoteTakingApp.API.Repositories;
using NoteTakingApp.API.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Note Taking API", Version = "v1" });
    c.EnableAnnotations();
});

// EF Core — SQLite by default; override connection string in appsettings.json
builder.Services.AddDbContext<NoteDbContext>(opts =>
    opts.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Data Source=notes.db"));

// Repository pattern DI registration
builder.Services.AddScoped<INoteRepository, NoteRepository>();

// --- CONEXIÓN KEY VAULT ---
var keyVaultName = builder.Configuration["Azure:KeyVaultName"];
var accountTenantId = builder.Configuration["Azure:TenantId"];

if (!string.IsNullOrEmpty(keyVaultName))
{
    var keyVaultUri = new Uri($"https://{keyVaultName}.vault.azure.net/");
    var options = new DefaultAzureCredentialOptions
    {
        ExcludeAzureCliCredential = true,
        ExcludeInteractiveBrowserCredential = true,
        VisualStudioTenantId = accountTenantId
    };
    builder.Configuration.AddAzureKeyVault(keyVaultUri, new DefaultAzureCredential(options));

    // Blob Storage — StorageConnectionStringKV secret from Key Vault
    builder.Services.AddSingleton<BlobServiceClient>(provider =>
    {
        var config = provider.GetRequiredService<IConfiguration>();
        var connectionString = config["StorageConnectionStringKV"];
        if (string.IsNullOrEmpty(connectionString))
            throw new InvalidOperationException("StorageConnectionStringKV está vacía. Revisa el Key Vault.");
        return new BlobServiceClient(connectionString);
    });

    // Named HttpClient for DeepSeekChat API calls (index + delete endpoints)
    builder.Services.AddHttpClient("DeepSeekChat", client =>
    {
        var baseUrl = builder.Configuration["DeepSeekChat:ApiUrl"] ?? "https://localhost:7197";
        client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
    }).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        // Accept the dev self-signed certificate (localhost only)
        ServerCertificateCustomValidationCallback =
            HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
    });

    builder.Services.AddSingleton<INoteExportService, NoteExportService>();
}
else
{
    // Azure:KeyVaultName not set — skip cloud sync (local dev without Key Vault)
    builder.Services.AddSingleton<INoteExportService, NoOpNoteExportService>();
}

// CORS — open for local frontend dev (tighten in production)
builder.Services.AddCors(opts =>
    opts.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000", "https://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()));

var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// ── Auto-apply migrations on startup ─────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NoteDbContext>();
    db.Database.EnsureCreated();
}

app.Run();

// Expose Program for integration testing
public partial class Program { }
