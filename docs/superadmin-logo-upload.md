# Superadmin App — Logo Upload Changes

## New API endpoint

```
POST /admin/upload-logo
Authorization: Bearer <jwt>
Content-Type: multipart/form-data

file: <image file>
```

**Response:**
```json
{ "success": true, "logoUrl": "https://imagedelivery.net/..." }
```

---

## School Create form

**Current:** text input for `logoUrl`  
**Change:** file picker → upload on submit → pass returned URL as `logoUrl`

Flow:
1. User picks a file
2. On form submit, first `POST /admin/upload-logo` with the file
3. Use the returned `logoUrl` in the `POST /admin/schools` body
4. Show a loading state while the upload is in flight

If no file is picked, skip the upload step and send `logoUrl` as `undefined`.

---

## School Edit form

Same change as Create, plus:

- Show the existing logo as an image preview if `logoUrl` is set
- Only re-upload if the user picks a new file; otherwise send the existing `logoUrl` unchanged

---

## School List / Detail views

Render the logo where the school name appears:

```tsx
{school.logoUrl && (
  <img src={school.logoUrl} alt={school.name} className="h-8 w-8 rounded object-contain" />
)}
```

Fall back to initials or a placeholder icon when `logoUrl` is null.

---

## Image URL variants

Cloudflare Images supports on-the-fly resizing via URL suffix. The uploaded URL ends in `/public` (default full-size). For thumbnails swap the suffix:

| Use case | URL suffix |
|---|---|
| Full size | `/public` |
| Thumbnail (if variant configured) | `/thumbnail` |

Only the `public` variant exists by default. Additional variants can be created in the Cloudflare Images dashboard.

---

## Error handling

- Upload fails → show inline error, do not submit the school form
- `logoUrl` comes back null from the API → show placeholder, no broken `<img>` tag
