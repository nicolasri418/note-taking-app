# Project Summary — NoteFlow

> Generated: 2026-04-07
> Last updated: 2026-04-07

## Overview

NoteFlow is a full-stack note-taking application built with ASP.NET Core 8 (C#) on the backend and React 18 + TypeScript on the frontend, persisting data to SQLite via Entity Framework Core. It supports rich notes with tag filtering, full-text search, nested to-do checklists, and TXT/PDF export, with all business logic enforced server-side through a strict Repository pattern.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | C# / ASP.NET Core 8 (.NET 8), EF Core 8, SQLite |
| Frontend | React 18.2, TypeScript 5.2, Vite 5, Tailwind CSS |
| Database | SQLite (`notes.db`) via EF Core — schema managed with `EnsureCreated()` (no migrations yet) |
| Testing | xUnit + Moq (backend), Jest 29 + React Testing Library (frontend) |
| CI/CD | GitHub Actions — Claude AI code review via Portkey gateway → AWS Bedrock |
| API Docs | Swagger UI (Swashbuckle 6.5) at `/swagger` in development |

---

## Architecture

**Data flow:** `React UI` → `useNotes hook` → `apiService` → `HTTP /api/notes` → `NotesController` → `INoteRepository` → `NoteDbContext` → `SQLite`

All reads pass through a shared `NotesWithIncludes()` base query that eagerly loads `NoteTags → Tag` and `TodoItems` in a single round-trip. Tag normalization (lowercase + trim) is enforced exclusively in `NoteRepository.GetOrCreateTagAsync()`. Search and tag filtering are LINQ server-side operations — never client-side array filtering. The frontend caches the last-fetched notes in `localStorage` (`note_app_cache`) as an offline fallback.

---

## Backend

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/notes` | List all notes; supports `?search=` and `?tag=` query params |
| `GET` | `/api/notes/{id}` | Get a single note by ID |
| `GET` | `/api/notes/tags` | List all distinct tags ordered by name |
| `POST` | `/api/notes` | Create a new note (title, body, tags, todoItems) |
| `PUT` | `/api/notes/{id}` | Replace a note's title, body, tags, and todo items |
| `DELETE` | `/api/notes/{id}` | Delete a note by ID |

**API base path:** `/api/notes` | **Port:** `https://localhost:50293`

### Repository Methods (`INoteRepository`)

| Method | Description |
|--------|-------------|
| `GetAllAsync(search?, tag?)` | Returns all notes with optional full-text search and tag filter, ordered by `UpdatedAt` desc |
| `GetByIdAsync(id)` | Returns a single note with all includes, or `null` |
| `GetAllTagsAsync()` | Returns all tags ordered alphabetically |
| `CreateAsync(note)` | Persists a new note, sets `CreatedAt`/`UpdatedAt`, re-fetches with includes |
| `UpdateAsync(note)` | Updates `UpdatedAt`, saves, re-fetches with includes |
| `DeleteAsync(id)` | Deletes by ID; returns `true` if found, `false` if not |
| `GetOrCreateTagAsync(name)` | Normalizes name (`.Trim().ToLower()`), returns existing tag or creates new one |

### Models & Relationships

| Model | Fields | Relationships |
|-------|--------|---------------|
| `Note` | `Id`, `Title` (max 200), `Body`, `CreatedAt`, `UpdatedAt` | 1:N → `TodoItem`; M:N → `Tag` via `NoteTag` join |
| `Tag` | `Id`, `Name` (unique index) | M:N → `Note` via `NoteTag` |
| `NoteTag` | `NoteId`, `TagId` | Composite PK; cascade delete from both sides |
| `TodoItem` | `Id`, `Text`, `IsCompleted`, `SortOrder`, `ParentId?`, `NoteId` | Self-referencing (one level deep); `OnDelete(Restrict)` on self-ref; cascade delete from `Note` |

### DTOs

| DTO | Direction | Purpose |
|-----|-----------|---------|
| `NoteDto` | Read | Full note with tags and hierarchical todoItems |
| `TagDto` | Read | Tag id + name |
| `TodoItemDto` | Read | Todo item with nested `Children` list |
| `CreateNoteDto` | Write | Title (required, max 200), body, optional tags and todoItems |
| `UpdateNoteDto` | Write | Same shape as `CreateNoteDto`; replaces all tags and todoItems |
| `TodoItemWriteDto` | Write | `Id?` (null = new item), text, isCompleted, sortOrder, parentId? |

---

## Frontend

### Components

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Root layout; orchestrates all panels, manages `editorMode` state (`idle`/`create`/`edit`) |
| `NoteList.tsx` | Scrollable list of note cards; highlights the selected note |
| `NoteCard.tsx` | Single note preview card (title, body snippet, tags, updated date) |
| `NoteEditor.tsx` | Create/edit form for title, body, tags, and todo items; calls `onSave`/`onDelete`/`onCancel` |
| `TodoList.tsx` | Manages the nested to-do checklist inside the editor |
| `SearchBar.tsx` | Controlled text input that fires `setSearch` on change |
| `TagFilter.tsx` | Sidebar tag list; fires `setTagFilter` on selection |
| `ExportMenu.tsx` | Dropdown to trigger TXT or PDF export via `exportService` |

### Hooks

| Hook | Exposes |
|------|---------|
| `useNotes` | `notes`, `tags`, `filters`, `isLoading`, `error`, `createNote()`, `updateNote()`, `deleteNote()`, `setSearch()`, `setTagFilter()`, `refresh()` |

### Services

| Method | Description |
|--------|-------------|
| `notesApi.getAll(search?, tag?)` | `GET /api/notes` with optional query params |
| `notesApi.getById(id)` | `GET /api/notes/{id}` |
| `notesApi.create(data)` | `POST /api/notes` |
| `notesApi.update(id, data)` | `PUT /api/notes/{id}` |
| `notesApi.delete(id)` | `DELETE /api/notes/{id}` |
| `notesApi.getTags()` | `GET /api/notes/tags` |
| `noteToPlainText(note)` | Converts note to a plain-text string for TXT export |
| `exportAsTxt(note)` | Triggers browser download of `.txt` file |
| `noteToHtml(note)` | Builds sanitized HTML for print/PDF (all user content HTML-escaped) |
| `exportAsPdf(note)` | Renders note in hidden iframe and triggers `window.print()` |

### Types (`types/index.ts`)

| Interface | Purpose |
|-----------|---------|
| `Note` | Full note with `id`, `title`, `body`, `createdAt`, `updatedAt`, `tags`, `todoItems` |
| `Tag` | `id`, `name` |
| `TodoItem` | `id`, `text`, `isCompleted`, `sortOrder`, `parentId`, `children` (one level deep) |
| `NoteWrite` | Payload for create/update: `title`, `body`, `tags[]`, `todoItems[]` |
| `TodoItemWrite` | Write form of a todo item; `id?` optional (omit for new items) |
| `NoteFilters` | `search: string`, `tag: string \| null` |
| `ExportFormat` | `'txt' \| 'pdf'` |

**Port wiring:** Vite dev proxy forwards `/api/*` → `https://localhost:50293`

---

## Database

SQLite file: `backend/NoteTakingApp.API/notes.db`

Schema is created automatically on startup via `EnsureCreated()` in `Program.cs`. No EF Core migrations exist yet — any schema change requires adding one (`dotnet ef migrations add`).

```
Notes ──1:N──> TodoItems   (cascade delete; ParentId nullable → one level of nesting; OnDelete Restrict on self-ref)
Notes ──M:N──> Tags        (via NoteTag join table; composite PK NoteId+TagId; cascade delete both sides)
Tags.Name                  (unique index; values stored lowercase+trimmed)
Note.Title                 (max length 200, required)
```

---

## Testing

### Backend Tests (`backend/NoteTakingApp.Tests/`)

| Class | Tests | Focus |
|-------|-------|-------|
| `NoteRepositoryTests` | 10 | Integration-style with EF InMemory DB. Covers: create/persist, search (keyword + case-insensitive), tag filter, update + timestamp, delete (found + not found), tag deduplication, tags ordering, todo hierarchy |
| `NotesControllerTests` | 11 | Unit-style with Moq'd `INoteRepository`. Covers: GetAll (OK + tag mapping), GetById (OK + 404), Create (201 + todo hierarchy + DTO shape), Update (OK + 404), Delete (204 + 404), GetTags |

**Framework:** xUnit + Moq | **Coverage config:** `backend/coverage.runsettings` (excludes `Program.cs` and generated code)

### Frontend Tests (`frontend/src/__tests__/`)

| File | Tests | Focus |
|------|-------|-------|
| `useNotes.test.ts` | 12 | Hook lifecycle: fetch on mount, loading state, API error handling, localStorage fallback, corrupted cache, createNote/updateNote/deleteNote state mutations, setSearch/setTagFilter re-fetch triggers |
| `NoteCard.test.tsx` | — | Component rendering with RTL role queries and `@testing-library/jest-dom` matchers |
| `exportService.test.ts` | — | HTML escaping / XSS prevention for TXT and PDF export paths |

**Framework:** Jest 29 + React Testing Library | **Coverage threshold:** 90% lines/branches/functions/statements

---

## CI/CD & Tooling

### Workflows

| File | Trigger | Purpose |
|------|---------|---------|
| `claude-review.yml` | PR open/update/reopen; `@claude` comment on PR | Posts AI code review via Portkey gateway → AWS Bedrock (Claude Sonnet 4.6). Checks: repository pattern, DTO boundaries, React hook rules, XSS/EF injection risks, N+1 patterns, test coverage. Skips fork PRs on auto-trigger (secrets unavailable). |

### Custom Commands (`.claude/commands/`)

| Command | Purpose |
|---------|---------|
| `/brief` | Scans the project and writes/updates `summary.md` (this file). Full generation on first run; incremental update + changelog entry on subsequent runs. |
| `/test-coverage` | Runs backend (xUnit + XPlat coverage) and frontend (Jest) test suites; reports a coverage table; flags anything below 90% threshold. |
| `/lead-agent` | Activates the NoteFlow Lead Agent persona; enforces the 5 Mandatory Rules for the session. |
| `/lead-test` | Generates and runs tests for the current file (xUnit for backend, Jest for frontend). |
| `/lead-status` | Health check: architectural rule compliance, TODO/FIXME scan, test coverage gaps, migration status. |

### Agents (`.claude/agents/`)

| Agent | Purpose |
|-------|---------|
| `noteflow-dev-agent` | Full-stack NoteFlow dev agent. Handles feature work, refactoring, testing, and GitHub issue management. Enforces the 5 Mandatory Rules. Has GitHub, Filesystem, and SQLite MCP access. Maintains persistent memory in `.claude/agent-memory/noteflow-dev-agent/`. |

---

## Architectural Rules

| # | Rule | Summary |
|---|------|---------|
| 1 | **Database First** | All schema changes via EF migrations. Read-only repo methods use `.AsNoTracking()`. All note-returning methods must `.Include()` navigation properties. |
| 2 | **Frontend State via useNotes** | No Redux/Zustand/etc. All data logic in `useNotes.ts` + `apiService.ts`. Component `useState` is OK for local UI only. |
| 3 | **Tag Normalization (backend-only)** | Tags normalized in `NoteRepository.GetOrCreateTagAsync()` only. Frontend sends raw strings. |
| 4 | **Server-Side Search** | All filtering via LINQ in `NoteRepository`. No frontend array filtering. LINQ `.Where()` only — never `FromSqlRaw` with user input. |
| 5 | **HTML Output Sanitisation** | `exportService.ts` must escape all user-controlled fields via `escapeHtml()` before HTML injection. No raw template literal interpolation of note content. |
| — | **No DbContext outside repository** | Controllers only call `INoteRepository`. All EF logic in `NoteRepository`. |
| — | **DTO boundary strict** | Controllers use `MapToDto()` for all responses. `TodoItemWriteDto.Id` nullable — null = new item. |
| — | **One-level nesting** | `TodoItem.ParentId` nullable; `OnDelete(Restrict)` enforces no recursive nesting. |

---

## Known Gaps / Tech Debt

- `notesApi.getById()` is defined in `apiService.ts` but never called by `useNotes` or any component — **dead code**. Either add a consumer or remove it.
- No EF Core migrations exist yet — currently relies on `EnsureCreated()`. Any schema change will require setting up the migration toolchain (`dotnet tool install --global dotnet-ef`).
- `useNotes.ts` JSDoc comment on line 10 says "Apply search and tag filters locally" — **misleading**; actual implementation delegates to API. Should be removed.
- `dotnet-ef` global tool is not installed in this environment — running `dotnet ef migrations list` fails.

---

## Run Instructions

### Backend
```bash
cd backend
dotnet build
dotnet run --project NoteTakingApp.API
# API available at https://localhost:50293
# Swagger UI at https://localhost:50293/swagger
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Dev server at http://localhost:5173
# Vite proxies /api/* to https://localhost:50293
```

### Tests
```bash
# Backend
cd backend
dotnet test
dotnet test --collect:"XPlat Code Coverage" --settings coverage.runsettings --results-directory ./TestResults

# Frontend
cd frontend
npm test
npm test -- --coverage --watchAll=false
```

---

## Changelog

- 2026-04-07 — Initial generation
