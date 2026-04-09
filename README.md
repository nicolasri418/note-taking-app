# NoteFlow

A full-stack note-taking app with tag support and nested todo lists.

- **Backend:** C# / ASP.NET Core 8, SQLite via Entity Framework Core, Repository pattern
- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS

Swagger UI is available at `https://localhost:50293/swagger` when running in development mode.

---

## API Endpoints

Base URL: `https://localhost:50293/api/notes`

---

### Notes

#### `GET /api/notes`

Returns all notes. Supports optional query-string filters.

| Query param | Type   | Description                              |
|-------------|--------|------------------------------------------|
| `search`    | string | Full-text search against title and body  |
| `tag`       | string | Filter notes that carry this tag name    |

**Response `200 OK`** — array of `NoteDto`

---

#### `GET /api/notes/{id}`

Returns a single note by ID.

| Path param | Type | Description |
|------------|------|-------------|
| `id`       | int  | Note ID     |

**Response `200 OK`** — `NoteDto`  
**Response `404 Not Found`** — note does not exist

---

#### `GET /api/notes/tags`

Returns all distinct tag names (used to populate the filter sidebar).

**Response `200 OK`** — array of `TagDto`

---

#### `POST /api/notes`

Creates a new note.

**Request body** — `CreateNoteDto` (JSON)

| Field       | Type                   | Required | Constraints    | Description                        |
|-------------|------------------------|----------|----------------|------------------------------------|
| `title`     | string                 | Yes      | max 200 chars  | Note title                         |
| `body`      | string                 | No       | default `""`   | Note body / content                |
| `tags`      | string[]               | No       |                | Tag names (normalized to lowercase)|
| `todoItems` | `TodoItemWriteDto[]`   | No       |                | Flat list; use `parentId` for nesting |

**Response `201 Created`** — `NoteDto` with `Location` header pointing to the new resource  
**Response `400 Bad Request`** — validation failure

---

#### `PUT /api/notes/{id}`

Replaces an existing note (full update — tags and todo items are replaced entirely).

| Path param | Type | Description |
|------------|------|-------------|
| `id`       | int  | Note ID     |

**Request body** — `UpdateNoteDto` (same shape as `CreateNoteDto`)

| Field       | Type                   | Required | Constraints    |
|-------------|------------------------|----------|----------------|
| `title`     | string                 | Yes      | max 200 chars  |
| `body`      | string                 | No       | default `""`   |
| `tags`      | string[]               | No       |                |
| `todoItems` | `TodoItemWriteDto[]`   | No       |                |

**Response `200 OK`** — updated `NoteDto`  
**Response `404 Not Found`** — note does not exist  
**Response `400 Bad Request`** — validation failure

---

#### `DELETE /api/notes/{id}`

Deletes a note and its associated todo items.

| Path param | Type | Description |
|------------|------|-------------|
| `id`       | int  | Note ID     |

**Response `204 No Content`** — successfully deleted  
**Response `404 Not Found`** — note does not exist

---

## Data Schemas

### `NoteDto`

| Field        | Type             | Description                         |
|--------------|------------------|-------------------------------------|
| `id`         | int              | Auto-generated primary key          |
| `title`      | string           | Note title                          |
| `body`       | string           | Note body / content                 |
| `createdAt`  | DateTime (UTC)   | Creation timestamp                  |
| `updatedAt`  | DateTime (UTC)   | Last-updated timestamp              |
| `tags`       | `TagDto[]`       | Tags attached to the note           |
| `todoItems`  | `TodoItemDto[]`  | Root-level todo items (tree shape)  |

### `TagDto`

| Field  | Type   |
|--------|--------|
| `id`   | int    |
| `name` | string |

### `TodoItemDto`

| Field         | Type              | Description                            |
|---------------|-------------------|----------------------------------------|
| `id`          | int               |                                        |
| `text`        | string            | Todo item text                         |
| `isCompleted` | bool              |                                        |
| `sortOrder`   | int               | Display order among siblings           |
| `parentId`    | int? (nullable)   | ID of parent item; null = root level   |
| `children`    | `TodoItemDto[]`   | Nested child items (one level deep)    |

### `TodoItemWriteDto` (request body for create/update)

| Field         | Type            | Required | Description                                    |
|---------------|-----------------|----------|------------------------------------------------|
| `id`          | int? (nullable) | No       | Omit or set `null` for new items               |
| `text`        | string          | Yes      | Todo item text                                 |
| `isCompleted` | bool            | No       |                                                |
| `sortOrder`   | int             | No       | Display order among siblings                   |
| `parentId`    | int? (nullable) | No       | Matches the `id` of another item in the list   |
