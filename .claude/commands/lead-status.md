Perform a quick health check of the NoteFlow project's architecture and surface any pending issues.

## Checks to Run

### 1. Architectural Rules Compliance
Scan key files for violations:
- `NoteRepository.cs` — tag normalization present? search is server-side via LINQ?
- `NotesController.cs` — no direct DbContext usage? all responses use DTOs?
- `useNotes.ts` — no frontend array filtering for search? no external state libraries imported?

### 2. Pending TODOs / Tech Debt
Search for `TODO`, `FIXME`, and `HACK` comments across `backend/` and `frontend/src/`:
```bash
grep -rn "TODO\|FIXME\|HACK" backend/NoteTakingApp.API frontend/src --include="*.cs" --include="*.ts" --include="*.tsx"
```

### 3. Test Coverage Gaps
Check for untested public methods in:
- `INoteRepository` interface vs `NoteRepositoryTests`
- `NotesController` actions vs `NotesControllerTests`
- `notesApi` methods in `apiService.ts` vs `useNotes.test.ts`

### 4. Migration Status
Verify the latest EF migration matches the current models:
```bash
cd backend/NoteTakingApp.API && dotnet ef migrations list
```

## Report Format
Produce a status summary with:
- ✓ / ✗ for each architectural rule
- List of open TODOs with file:line references
- Any untested surface area
- Migration status (up to date / pending)
