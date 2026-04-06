using Microsoft.EntityFrameworkCore;
using NoteTakingApp.API.Data;
using NoteTakingApp.API.Repositories;

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
