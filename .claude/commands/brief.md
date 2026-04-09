Scan the current project directory and write or update `summary.md` at the repo root.

## Mode Detection — Run First

Before scanning, check whether `summary.md` already exists at the repo root.

**If `summary.md` does NOT exist** → run a full scan (all steps below) and generate the file from scratch.

**If `summary.md` already exists** → run in **update mode**:
1. Read the existing `summary.md` to understand what was previously documented.
2. Use `git diff HEAD` (or `git status`) to identify files changed since the last summary.
3. Scan **only the changed files and their directly affected sections** (e.g., a new controller → update Backend > API Endpoints; a new component → update Frontend > Components).
4. Update the `> Last updated:` timestamp at the top.
5. Append a `## Changelog` section (or update it if it exists) with a bullet for each change detected, e.g.:
   - `Added: GET /api/notes/export endpoint in NotesController`
   - `Updated: useNotes hook now exposes exportNote()`
   - `Added: ExportButton component`
   - `Fixed: Rule 3 in project_standards.md now backend-only`
6. Rewrite only the sections that changed — leave all other sections intact.

---

## Full Scan Steps (new file or forced refresh)

### 1. Gather Project Structure
- List all top-level directories and files (exclude `node_modules`, `obj`, `bin`, `.git`).
- Identify the tech stack from config files: `*.csproj`, `package.json`, `*.sln`, `vite.config.*`, `tailwind.config.*`, `jest.config.*`.
- Read `CLAUDE.md` if present — it is the authoritative architecture reference.

### 2. Scan Backend
From `backend/` (or equivalent):
- List all **Controllers** and their HTTP routes.
- List all **Repository** methods (interface + implementation).
- List all **Models** and their key fields/relationships.
- List all **DTOs**.
- List **EF migrations** (if any) and note schema state.
- Note the API base URL and port.

### 3. Scan Frontend
From `frontend/src/` (or equivalent):
- List all **components** (`components/`) and their purpose.
- List all **hooks** (`hooks/`) and the state/operations they expose.
- List all **services** (`services/`) and the API methods they provide.
- List all **types** from `types/index.ts` (or equivalent).
- Note the dev server port and any Vite proxy config.

### 4. Scan Tests
- List backend test classes and the number of test cases each contains.
- List frontend test files and the number of test cases each contains.
- Note the testing frameworks used.

### 5. Scan CI/CD & Tooling
- List workflow files under `.github/workflows/` and their triggers.
- List custom slash commands under `.claude/commands/`.
- List custom agents under `.claude/agents/`.
- Note any coverage thresholds or quality gates.

### 6. Write `summary.md`
Write the file to the repo root using the following structure:

```markdown
# Project Summary — <ProjectName>

> Generated: <date>
> Last updated: <date>

## Overview
<2–3 sentence description of what the project does, the stack, and its current state.>

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | ... |
| Frontend | ... |
| Database | ... |
| Testing | ... |
| CI/CD | ... |

## Architecture
<Describe the data flow and layers. Include the key architectural rules enforced in the project.>

## Backend
### API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| ... | ... | ... |

### Repository Methods
| Method | Description |
|--------|-------------|
| ... | ... |

### Models & Relationships
<List models and describe their relationships.>

### DTOs
<List all DTOs and their purpose.>

## Frontend
### Components
| Component | Purpose |
|-----------|---------|
| ... | ... |

### Hooks
| Hook | Exposes |
|------|---------|
| ... | ... |

### Services
| Service / Method | Description |
|-----------------|-------------|
| ... | ... |

### Types
<List key TypeScript interfaces.>

## Database
<Schema overview, migration status, any notable constraints.>

## Testing
### Backend Tests
| Class | Tests | Focus |
|-------|-------|-------|
| ... | ... | ... |

### Frontend Tests
| File | Tests | Focus |
|------|-------|-------|
| ... | ... | ... |

## CI/CD & Tooling
### Workflows
| File | Trigger | Purpose |
|------|---------|---------|
| ... | ... | ... |

### Custom Commands
| Command | Purpose |
|---------|---------|
| ... | ... |

### Agents
| Agent | Purpose |
|-------|---------|
| ... | ... |

## Architectural Rules
<List all enforced rules with a one-line summary each.>

## Known Gaps / Tech Debt
<Any TODOs, missing tests, or flagged issues found during scan. Write "None found" if clean.>

## Run Instructions
### Backend
```bash
# commands to build and run the backend
```

### Frontend
```bash
# commands to run the frontend
```

### Tests
```bash
# commands to run all tests
```

## Changelog
<!-- Appended automatically by /brief on each update run -->
- <date> — Initial generation
```

---

## Output
After writing or updating `summary.md`:
- State whether this was a **full generation** or **incremental update**.
- List which sections were written or changed.
- If update mode, list the specific changes detected from git.
