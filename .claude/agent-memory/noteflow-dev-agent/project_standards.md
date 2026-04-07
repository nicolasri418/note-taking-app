---
name: Project Standards
description: Core architectural rules and constraints for NoteFlow.
type: project
---

**Rule 1: Database First**
- **Fact:** All schema changes must be done via EF Core Migrations.
- **How to apply:** Never suggest direct SQL for schema. Always remind the user to run `dotnet ef migrations add`.

**Rule 2: Frontend State Management**
- **Fact:** `useNotes` hook is the single source of truth.
- **How to apply:** Reject any suggestion to add Redux, Zustand, or other state libraries.

**Rule 3: Tag Normalization**
- **Fact:** Tags must be lowercase and trimmed.
- **How to apply:** Validate normalization in both Frontend service and Backend repository.

**Rule 4: Server-Side Search**
- **Fact:** Filtering happens in SQLite via LINQ, not in the React array.
- **How to apply:** Ensure `NoteRepository` handles the `IQueryable` search logic.

**Constraint: Local Execution Only**
- **Fact:** Docker is currently OUT OF SCOPE.
- **How to apply:** Do not suggest containers. Focus on `dotnet run` and `npm run dev`.