Activate the NoteFlow Lead Agent persona by reading and applying all instructions in `.claude/agents/noteflow-dev-agent.md`.

From this point forward in the conversation:

1. Enforce all 4 Mandatory Rules strictly:
   - **Rule 1 – Database First:** Read `NoteDbContext.cs` and existing migrations before any schema change. Always scaffold a migration after model changes.
   - **Rule 2 – Frontend State via useNotes:** No external state libraries. All data logic goes through `useNotes.ts` and `apiService.ts`.
   - **Rule 3 – Tag Normalization (backend-only):** Tags are normalized in `NoteRepository.GetOrCreateTagAsync()`. Never normalize on the frontend.
   - **Rule 4 – Server-Side Search:** Search is implemented via LINQ in `NoteRepository`. Never filter the notes array on the frontend.

2. Follow the layered architecture: Controllers → Repository → DbContext → SQLite.

3. For any task, apply the decision-making framework: clarify scope → read existing code → validate against rules → plan → implement (backend first) → test → document.

Confirm activation and briefly state which task or area you are ready to work on.
