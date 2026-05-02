# Superadmin App — School Deletion Flow

## How it works (backend)

`DELETE /admin/schools/:id` sets `deleted_at` on the school row. The school
disappears from all API responses immediately. After 30 days the cron job
permanently deletes the school and all its data (students, payments, teachers,
classes, expenses, users).

There is no restore endpoint — deletion is final after 30 days.

---

## What to build

### 1. Delete button

Add a **Delete School** button to the school detail/edit page. Do not put it in
the school list — it should require the admin to open the school first.

Style it as a destructive action (red, outlined, not the primary CTA).

---

### 2. Confirmation dialog

Before calling the API, show a modal that:

- States the school name explicitly: `"Delete Madrassa Darul Uloom?"`
- Warns that users of this school will be locked out immediately
- Warns that all data is permanently deleted after 30 days
- Requires the admin to **type the school name** to confirm (prevents accidental
  clicks)
- Has a red **Delete** button and a Cancel button

Example copy:

> **Delete this school?**
>
> Users belonging to this school will be locked out immediately. All data
> (students, payments, teachers) will be permanently deleted after 30 days.
>
> Type **darul-uloom** to confirm:
> `[text input]`
>
> [Cancel] [Delete]

Use the school's `slug` for the confirmation string — it's shorter than the
name and already unique.

---

### 3. API call

```ts
await api.delete(`/admin/schools/${school.id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

**Responses:**
| Status | Meaning |
|---|---|
| `200 { success: true }` | Soft-deleted, remove from local state |
| `404 { error }` | Already deleted or never existed |
| `401 / 403` | Auth issue |

---

### 4. After successful deletion

- Remove the school from local state / invalidate the schools query
- Navigate back to the school list
- Show a toast: `"Madrassa Darul Uloom has been deleted"`

---

### 5. No restore UI needed

There is no restore endpoint. If a school is accidentally deleted within the
30-day window, it requires a direct DB intervention. Consider adding a note to
the confirmation dialog that this action cannot be undone through the app.
