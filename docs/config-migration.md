# Config Endpoint Changes

The `/api/config` endpoints still exist at the same URLs and require the same admin JWT. The only thing that changed is the **response shape** — the config object now returns the full school record, which includes new fields and renames one existing field.

---

## What Changed

### Removed field

| Old field | Status |
|---|---|
| `adminName` | **Removed.** Not in the new response. |

### Renamed field

| Old field | New field |
|---|---|
| *(none)* | — |

> All other existing fields (`name`, `address`, `phone`, `adminPhones`, `monthlyDueDate`, `annualFeeMonth`, `annualFee`) are unchanged in name and behavior.

### New fields in the response

| Field | Type | Description |
|---|---|---|
| `id` | `number` | School ID (read-only, do not send on update) |
| `slug` | `string` | URL-safe identifier e.g. `"darul-uloom"` (read-only) |
| `logoUrl` | `string \| null` | Link to the school logo image |
| `whatsappSessionId` | `string \| null` | WhatsApp session identifier |
| `whatsappToken` | `string \| null` | WhatsApp API token |
| `subscriptionStatus` | `"trial" \| "active" \| "expired" \| "suspended"` | Read-only — managed by platform admin |
| `subscriptionExpiresAt` | `number \| null` | Unix timestamp — read-only |

---

## GET /api/config

No change to the request. The response `result` now has this shape:

```json
{
  "success": true,
  "result": {
    "id": 1,
    "slug": "darul-uloom",
    "name": "Madrassa Darul Uloom",
    "logoUrl": "https://example.com/logo.png",
    "address": "123 Main Street",
    "phone": "03001234567",
    "adminPhones": ["03001234567", "03009876543"],
    "whatsappSessionId": "session_abc",
    "whatsappToken": "token_xyz",
    "monthlyDueDate": 10,
    "annualFeeMonth": "05",
    "annualFee": 5000,
    "subscriptionStatus": "active",
    "subscriptionExpiresAt": null
  }
}
```

---

## PUT /api/config

Send only the fields you want to update — all fields are optional. The following fields are **read-only and will be ignored** even if sent:

- `id`
- `slug`
- `subscriptionStatus`
- `subscriptionExpiresAt`

### Updatable fields

```json
{
  "name": "New School Name",
  "logoUrl": "https://example.com/new-logo.png",
  "address": "456 New Street",
  "phone": "03001234567",
  "adminPhones": ["03001234567"],
  "whatsappSessionId": "session_abc",
  "whatsappToken": "token_xyz",
  "monthlyDueDate": 5,
  "annualFeeMonth": "04",
  "annualFee": 6000
}
```

Response is the full updated school object (same shape as GET above).

---

## What to Update in the App

### Settings / config form

1. **Remove** the `adminName` field from the form — it no longer exists.
2. **Add** `logoUrl` — a text input for a URL, or an image upload that returns a URL.
3. **Add** `whatsappSessionId` and `whatsappToken` inputs if the app exposes WhatsApp settings.
4. **Show** `subscriptionStatus` as a read-only badge (e.g. "Active", "Trial", "Expired") — the admin cannot change it.

### Displaying config data

Replace any reference to `result.adminName` — it will now be `undefined`. If you were showing it in a header or profile area, use the logged-in user's username from the JWT instead:

```js
// Old
const displayName = config.adminName;

// New — decode from JWT
const { userId } = decodeToken(localStorage.getItem('token'));
// Or just use the username stored at login
const displayName = localStorage.getItem('username');
```

### TypeScript interface (if used)

Replace your old config type with:

```ts
interface SchoolConfig {
  id: number;                // read-only
  slug: string;              // read-only
  name: string;
  logoUrl: string | null;
  address: string;
  phone: string;
  adminPhones: string[];
  whatsappSessionId: string | null;
  whatsappToken: string | null;
  monthlyDueDate: number;
  annualFeeMonth: string;    // "01"–"12"
  annualFee: number;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'suspended'; // read-only
  subscriptionExpiresAt: number | null; // read-only, Unix timestamp
}
```
