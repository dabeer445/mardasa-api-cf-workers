# Teacher API

All endpoints require `Authorization: Bearer <jwt>` with an `admin` or `super_admin` role.
Results are scoped to the authenticated school automatically.

---

## Endpoints

### List teachers
```
GET /api/teachers?page=1&limit=20&search=Ahmad
```
```json
{
  "success": true,
  "result": [
    { "id": "t1234_abc", "name": "Ahmad Khan", "phone": "03001234567" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

---

### Get a teacher
```
GET /api/teachers/:id
```
```json
{ "success": true, "result": { "id": "t1234_abc", "name": "Ahmad Khan", "phone": "03001234567" } }
```
Returns `404` if not found.

---

### Create a teacher
```
POST /api/teachers
Content-Type: application/json

{ "name": "Ahmad Khan", "phone": "03001234567" }
```
- `name` — required
- `phone` — optional

```json
{ "success": true, "result": { "id": "t1234_abc", "name": "Ahmad Khan", "phone": "03001234567" } }
```

---

### Update a teacher
```
PUT /api/teachers/:id
Content-Type: application/json

{ "name": "Ahmad Khan Updated", "phone": "03009876543" }
```
Returns the updated teacher. `404` if not found.

---

### Delete a teacher
```
DELETE /api/teachers/:id
```
```json
{ "success": true }
```

> **Note:** Deleting a teacher does not unassign them from classes. If you plan
> to delete a teacher, reassign or delete their classes first, otherwise those
> classes will have a dangling `teacherId`.

---

## Adding a new teacher endpoint

The pattern used across this codebase:

1. Create `src/endpoints/teachers/teacherXxx.ts` extending `OpenAPIRoute`
2. Define a `schema` object (tags, summary, request, responses using Zod)
3. Implement `async handle(c: AppContext)` — get school scope via `c.get('schoolId')`
4. Export from `src/endpoints/teachers/index.ts`
5. Register in `src/index.ts` via `openapi.get/post/put/delete()`

```ts
import { OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { type AppContext } from "../../types";
import { createDb, teachers } from "../../db";

export class TeacherXxx extends OpenAPIRoute {
  schema = {
    tags: ["Teachers"],
    summary: "...",
    request: {
      params: z.object({ id: Str() }),
    },
    responses: {
      "200": {
        description: "...",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const schoolId = c.get("schoolId")!;
    const db = createDb(c.env.DB);

    const teacher = await db
      .select()
      .from(teachers)
      .where(and(eq(teachers.id, data.params.id), eq(teachers.schoolId, schoolId)))
      .get();

    if (!teacher) return c.json({ error: "Teacher not found" }, 404);

    // your logic here

    return c.json({ success: true });
  }
}
```

Always scope queries with `eq(teachers.schoolId, schoolId)` — never query without it.
