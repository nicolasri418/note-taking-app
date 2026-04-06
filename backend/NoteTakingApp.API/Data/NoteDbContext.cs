using Microsoft.EntityFrameworkCore;
using NoteTakingApp.API.Models;

namespace NoteTakingApp.API.Data;

public class NoteDbContext(DbContextOptions<NoteDbContext> options) : DbContext(options)
{
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<NoteTag> NoteTags => Set<NoteTag>();
    public DbSet<TodoItem> TodoItems => Set<TodoItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── NoteTag composite PK ──────────────────────────────────────────────
        modelBuilder.Entity<NoteTag>()
            .HasKey(nt => new { nt.NoteId, nt.TagId });

        modelBuilder.Entity<NoteTag>()
            .HasOne(nt => nt.Note)
            .WithMany(n => n.NoteTags)
            .HasForeignKey(nt => nt.NoteId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<NoteTag>()
            .HasOne(nt => nt.Tag)
            .WithMany(t => t.NoteTags)
            .HasForeignKey(nt => nt.TagId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Tag name uniqueness (case-insensitive via collation) ──────────────
        modelBuilder.Entity<Tag>()
            .HasIndex(t => t.Name)
            .IsUnique();

        // ── TodoItem self-referencing hierarchy ───────────────────────────────
        modelBuilder.Entity<TodoItem>()
            .HasOne(t => t.Parent)
            .WithMany(t => t.Children)
            .HasForeignKey(t => t.ParentId)
            .OnDelete(DeleteBehavior.Restrict);   // parent delete handled manually

        modelBuilder.Entity<TodoItem>()
            .HasOne(t => t.Note)
            .WithMany(n => n.TodoItems)
            .HasForeignKey(t => t.NoteId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Note column constraints ───────────────────────────────────────────
        modelBuilder.Entity<Note>()
            .Property(n => n.Title)
            .HasMaxLength(200)
            .IsRequired();
    }
}
