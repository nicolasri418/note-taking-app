# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NoteFlow** — A full-stack note-taking app with tag support and nested todo lists.

- **Backend:** C# / ASP.NET Core 8, SQLite via Entity Framework Core, Repository pattern
- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS
- **Testing:** xUnit + Moq (backend), Jest + React Testing Library (frontend)

## Commands

### Frontend (`NoteTakingApp/frontend/`)

```bash
npm run dev          # Dev server at http://localhost:5173
npm run build        # tsc + vite build
npm test             # Jest with coverage
npm run test:watch   # Jest in watch mode
npx jest --testPathPattern=useNotes  # Run a single test file by name pattern
```

### Backend (`NoteTakingApp/backend/`)

```bash
dotnet build         # Build solution
dotnet run --project NoteTakingApp.API   # Run API (https://localhost:50293)
dotnet test          # Run all xUnit tests
dotnet test --filter "FullyQualifiedName~NotesControllerTests"  # Run single test class
```

### EF Core Migrations (`NoteTakingApp/backend/NoteTakingApp.API/`)

Any DB schema change requires a migration. `EnsureCreated()` in `Program.cs` handles initial setup only.

```bash
dotnet ef migrations add <MigrationName>  # Scaffold migration from model changes
dotnet ef database update                 # Apply pending migrations to notes.db
```

## Architecture

### Backend

Layered: **Controllers → Repository → DbContext → SQLite**

- `Controllers/NotesController.cs` — REST endpoints; maps between DTOs and domain models
- `Repositories/NoteRepository.cs` — All data access logic; implements search/tag filters with EF `Include()`
- `Data/NoteDbContext.cs` — EF Core fluent config; composite PK for `NoteTag` join table, cascade rules
- `Models/` — `Note` (1:N `TodoItem`, M:N `Tag`), `TodoItem` (self-referencing `ParentId` for one level of nesting)
- `Program.cs` — Service registration, CORS for `localhost:5173/3000`, auto-migration via `EnsureCreated()` on startup

**API base path:** `/api/notes`
Swagger UI available at `/swagger` in development.

### Frontend

**Data flow:** `useNotes` hook → `apiService` → backend API

- `hooks/useNotes.ts` — Central state: fetches notes/tags, exposes CRUD, caches to `localStorage` (`note_app_cache`) as offline fallback
- `services/apiService.ts` — Generic `request()` fetch wrapper; all API methods live here
- `services/exportService.ts` — Export notes to TXT/PDF
- `App.tsx` — Orchestrates layout and passes callbacks between components; coordinates `NoteList`, `NoteEditor`, `TagFilter`, and `SearchBar`
- `components/NoteEditor.tsx` — Create/edit form for a single note; handles title, body, tags, and todo items
- `components/TodoList.tsx` — Renders and manages the nested todo item list within the editor
- `types/index.ts` — Shared TypeScript interfaces (`Note`, `Tag`, `TodoItem`, `NoteWrite`, etc.)

**Port wiring:** Vite dev proxy forwards `/api/*` to `https://localhost:50293`.

### Database Schema

```
Notes ──1:N──> TodoItems (ParentId nullable → one level of nesting)
Notes ──M:N──> Tags (via NoteTag join table)
```

Tags are normalized to lowercase + trimmed before persistence.

## Architectural Rules

These constraints are enforced in code and checked by the CI review bot:

- **Tag normalization is backend-only.** `NoteRepository.GetOrCreateTagAsync()` calls `.Trim().ToLower()`. The frontend sends raw tag strings; never normalize them client-side. *(Note: `.claude/agents/noteflow-dev-agent.md` Rule 3 contradicts this — CLAUDE.md is authoritative; the CI bot enforces backend-only normalization.)*
- **Search is server-side only.** `useNotes` sends `search`/`tag` filter params to the API; the repo queries via `.ToLower().Contains()`. Never filter the `notes` array in the frontend.
- **No DbContext outside the repository.** Controllers only call `INoteRepository`; all EF `Include()` and query logic lives in `NoteRepository`.
- **DTO ↔ domain model boundary is strict.** Controllers map via `MapToDto()` on reads; never expose domain models directly. `TodoItemWriteDto.Id` is nullable — null means "new item"; a value means "update existing."
- **TodoItem nesting is one level deep.** Enforced in the DB schema (`ParentId` nullable, `OnDelete(Restrict)` on the self-reference). Don't build recursive nesting.
- **No external state libraries on the frontend.** Redux, Zustand, Jotai, MobX, and similar are prohibited. All shared state flows through `useNotes`; component-local `useState` is acceptable for purely local UI state (e.g., modal open/close).

## Testing Patterns

**Backend** (`backend/NoteTakingApp.Tests/`)
- `NoteRepositoryTests` — Integration-style: uses EF Core InMemory DB (unique name per test for isolation). Tests tag deduplication, cascade deletes, timestamp updates.
- `NotesControllerTests` — Unit-style: mocks `INoteRepository` with Moq. Tests HTTP status codes and DTO shape only.
- `coverage.runsettings` — XPlat Code Coverage config; excludes `Program.cs` and generated/attributed code. Pass with `dotnet test --settings backend/coverage.runsettings`.

**Frontend** (`frontend/src/__tests__/`)
- Hook tests (`useNotes.test.ts`) — Mock the entire `notesApi` module; clear `localStorage` in `beforeEach`. Use `renderHook` + `waitFor` for async state.
- `services/__mocks__/apiService.ts` — Manual Jest mock auto-picked up via `__mocks__` convention; update it when adding new `notesApi` methods.
- `NoteCard.test.tsx` — Component test using RTL role queries (`getByRole`) and `@testing-library/jest-dom` matchers.
- `exportService.test.ts` — Verifies HTML escaping (XSS prevention); keep this coverage when editing export logic.

## Adding Features

**New backend endpoint:**
1. Add method to `INoteRepository` interface
2. Implement in `NoteRepository` with all necessary `.Include()` calls
3. Add action to `NotesController`; map to DTO in response
4. Add test to `NoteRepositoryTests` (InMemory) and/or `NotesControllerTests` (Moq)

**New frontend feature:**
1. Add API method to `notesApi` in `apiService.ts`
2. Update `useNotes` hook to expose it; update `localStorage` cache if it mutates notes
3. Add test to `useNotes.test.ts` (mock the API call)

## CI/CD

`.github/workflows/claude-review.yml` — Triggers on PR open/update or `@claude` mentions. Calls the **Portkey gateway** (AWS Bedrock, `us.anthropic.claude-sonnet-4-6`) via `.github/scripts/review.mjs` and posts a structured code review comment. The review script checks for Repository pattern adherence, DTO boundaries, React hook rules, XSS/EF injection risks, N+1 query patterns, and test coverage.

# NoteFlow Project Commands

Custom slash commands (`.claude/commands/`):

- `/test-coverage`: Runs backend (xUnit with XPlat coverage) and frontend (Jest) test suites, then reports a coverage table and flags any files below the **90% threshold** for lines, branches, functions, and statements.
- `/lead-agent`: Activates the NoteFlow Lead Agent persona. When triggered, read instructions from `.claude/agents/noteflow-dev-agent.md` and strictly enforce the 4 Mandatory Rules (Database First, useNotes state, Tag Normalization, and Server-Side Search).
- `/lead-test`: Directs the agent to generate and run tests for the current file using xUnit (Backend) or Jest (Frontend).
- `/lead-status`: Performs a quick health check of the project's architecture and pending TODOs.
- `/check-user-stories`: Prompts for user stories, then checks whether each is implemented in code and covered by tests. Reports a per-story status table with code and test references.

# Agents

Custom subagents (`.claude/agents/`):

- **`noteflow-dev-agent`** (`.claude/agents/noteflow-dev-agent.md`) — Full-stack NoteFlow dev agent. Use for any feature work, refactoring, testing, or GitHub issue management. Enforces the 4 Mandatory Rules and operates across Backend (C#/ASP.NET Core) and Frontend (React + TypeScript). Has access to GitHub, Filesystem, and SQLite MCPs. Maintains persistent memory in `.claude/agent-memory/noteflow-dev-agent/`.

# Project Guidelines
- Always follow the patterns defined in `.claude/agent-memory/`.
