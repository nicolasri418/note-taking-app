Generate and run tests for the current file or feature being discussed, following NoteFlow testing patterns.

## Steps

1. **Identify the target** — determine whether this is a backend (C#) or frontend (TypeScript) file.

2. **Backend (xUnit + Moq):**
   - If it's a repository method → add a test to `NoteRepositoryTests` using EF Core InMemory DB (unique name per test).
   - If it's a controller action → add a test to `NotesControllerTests` using a Moq'd `INoteRepository`. Test HTTP status codes and DTO shape only.
   - Run with: `dotnet test --filter "FullyQualifiedName~<TestClass>"`

3. **Frontend (Jest + React Testing Library):**
   - If it's a hook → add a test to `useNotes.test.ts`. Mock the `notesApi` module; clear `localStorage` in `beforeEach`. Use `renderHook` + `waitFor`.
   - If it's a component → add a test using RTL role queries (`getByRole`) and `@testing-library/jest-dom` matchers.
   - If it's a service → follow the pattern in `exportService.test.ts`.
   - Run with: `npm test` or `npx jest --testPathPattern=<filename>`

4. **Report** — after running, show pass/fail output and note any gaps in coverage.
