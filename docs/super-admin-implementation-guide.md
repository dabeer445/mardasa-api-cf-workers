# Super Admin App — Frontend Implementation Guide

This guide covers everything the frontend team needs to build the MadrasaCRM super admin panel. The super admin app is a **separate application** from the school admin app. It manages the entire platform: schools, users, and platform-wide analytics.

---

## Table of Contents

1. [Setup & Authentication](#1-setup--authentication)
2. [Endpoint Reference](#2-endpoint-reference)
   - [Auth](#auth)
   - [Schools](#schools)
   - [Users](#users)
   - [Platform Stats](#platform-stats)
3. [Data Models](#3-data-models)
4. [App Structure](#4-app-structure)
5. [Error Handling](#5-error-handling)
6. [Important Notes](#6-important-notes)

---

## 1. Setup & Authentication

**Base URL (production):** provided separately by the backend team  
**Base URL (local dev):** `http://localhost:8787`  
**Swagger / OpenAPI docs:** visit the root `/` in local dev for interactive API explorer

### Login Flow

All super admin routes are protected. The login endpoint is the only public route.

**POST `/auth/login`**

```http
POST /auth/login
Content-Type: application/json

{
  "username": "superadmin",
  "password": "your_password"
}
```

**Success response (200):**
```json
{
  "success": true,
  "token": "<jwt_string>",
  "role": "super_admin"
}
```

**Failure response (401):**
```json
{
  "error": "Invalid credentials"
}
```

### After Login

1. **Check the `role` field.** If it is `"admin"` (school admin), redirect to the school admin app — they do not belong here.
2. **Store the token** in `localStorage` or a secure cookie.
3. **Attach the token to every request** via the `Authorization` header:

```http
Authorization: Bearer <token>
```

**Token lifetime:** 30 days. Implement a logout on `401` responses to handle expiry gracefully.

### Decoded Token Payload (for reference)

You do not need to decode the JWT on the frontend, but if you do, the payload looks like:

```json
{
  "userId": "usr_1714000000_abc123",
  "role": "super_admin",
  "exp": 1234567890
}
```

---

## 2. Endpoint Reference

All `/admin/*` routes require a valid `super_admin` token. A school admin (`admin` role) token will be rejected with `401`.

---

### Auth

#### `POST /auth/login`

Public. See [Section 1](#1-setup--authentication) for full details.

---

### Schools

#### `GET /admin/schools` — List all schools

```http
GET /admin/schools
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "result": [
    {
      "id": 1,
      "slug": "darul-uloom",
      "name": "Madrassa Darul Uloom",
      "logoUrl": null,
      "address": "123 Main St, Lahore",
      "phone": "+92300000000",
      "adminPhones": ["+92311111111"],
      "whatsappSessionId": null,
      "whatsappToken": null,
      "monthlyDueDate": 10,
      "annualFeeMonth": "05",
      "annualFee": 5000,
      "subscriptionStatus": "active",
      "subscriptionExpiresAt": 1780000000
    }
  ]
}
```

`subscriptionStatus` is one of: `"trial"` | `"active"` | `"expired"` | `"suspended"`

`subscriptionExpiresAt` is a **Unix timestamp in seconds**. Convert to a date with `new Date(val * 1000)`. It can be `null` (e.g. a trial with no hard cutoff).

---

#### `POST /admin/schools` — Create a school

```http
POST /admin/schools
Authorization: Bearer <token>
Content-Type: application/json

{
  "slug": "jamia-islamia",
  "name": "Jamia Islamia",
  "logoUrl": "https://example.com/logo.png",
  "address": "Lahore, Pakistan",
  "phone": "+923001234567",
  "adminPhones": ["+923001234567", "+923009876543"],
  "whatsappSessionId": "sess_abc",
  "whatsappToken": "tok_xyz",
  "monthlyDueDate": 10,
  "annualFeeMonth": "05",
  "annualFee": 5000,
  "subscriptionStatus": "trial"
}
```

| Field | Required | Notes |
|---|---|---|
| `slug` | Yes | URL-safe, unique across all schools. Cannot be changed after creation. |
| `name` | Yes | Display name |
| `logoUrl` | No | |
| `address` | No | |
| `phone` | No | |
| `adminPhones` | No | Array of phone strings |
| `whatsappSessionId` | No | |
| `whatsappToken` | No | |
| `monthlyDueDate` | Yes | Day of month, 1–28 |
| `annualFeeMonth` | Yes | `"01"` through `"12"` |
| `annualFee` | Yes | Amount in PKR |
| `subscriptionStatus` | Yes | `"trial"` | `"active"` | `"expired"` | `"suspended"` |

**Response (200):**
```json
{
  "success": true,
  "result": {
    /* full school object, same shape as GET /admin/schools item */
  }
}
```

---

#### `GET /admin/schools/:id` — Get a single school

```http
GET /admin/schools/1
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "result": { /* school object */ }
}
```

**Response (404):**
```json
{ "error": "School not found" }
```

---

#### `PUT /admin/schools/:id` — Update a school

All fields are optional. Send only what needs to change.

```http
PUT /admin/schools/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "subscriptionStatus": "active",
  "subscriptionExpiresAt": 1811536000,
  "name": "Updated School Name"
}
```

**Response (200):**
```json
{
  "success": true,
  "result": { /* updated school object */ }
}
```

> **Note:** `slug` should be treated as read-only after creation — do not include it in update forms.

---

### Users

#### `GET /admin/users` — List all users

Returns all users across the platform (both school admins and super admins).

```http
GET /admin/users
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "result": [
    {
      "id": "usr_1714000000_abc123",
      "username": "school1_admin",
      "role": "admin",
      "schoolId": 1
    },
    {
      "id": "usr_1714000001_def456",
      "username": "superadmin",
      "role": "super_admin"
    }
  ]
}
```

> `schoolId` is only present for users with `role: "admin"`. Super admins do not have a `schoolId`.

---

#### `POST /admin/users` — Create a user

Use this to create either a school admin or a new super admin.

```http
POST /admin/users
Authorization: Bearer <token>
Content-Type: application/json
```

**Create a school admin:**
```json
{
  "username": "newschool_admin",
  "password": "SecurePass123",
  "role": "admin",
  "schoolId": 2
}
```

**Create a super admin:**
```json
{
  "username": "newsuper",
  "password": "SecurePass123",
  "role": "super_admin"
}
```

| Field | Required | Notes |
|---|---|---|
| `username` | Yes | Must be unique across all users |
| `password` | Yes | Stored as a hash, never returned |
| `role` | Yes | `"admin"` or `"super_admin"` |
| `schoolId` | Conditional | Required when `role` is `"admin"`. Omit for `super_admin`. |

**Response (200):**
```json
{
  "success": true,
  "result": {
    "id": "usr_1714000002_ghi789",
    "username": "newschool_admin",
    "role": "admin",
    "schoolId": 2
  }
}
```

---

### Platform Stats

#### `GET /admin/stats` — Aggregated platform statistics

Use this for the dashboard home page. Returns counts across all schools.

```http
GET /admin/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "result": {
    "totalSchools": 12,
    "totalStudents": 1540,
    "totalPayments": 8300,
    "totalExpenses": 420
  }
}
```

---

## 3. Data Models

### School

```typescript
type School = {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  address: string;
  phone: string;
  adminPhones: string[];
  whatsappSessionId: string | null;
  whatsappToken: string | null;
  monthlyDueDate: number;              // 1–28
  annualFeeMonth: string;              // "01"–"12"
  annualFee: number;
  subscriptionStatus: "trial" | "active" | "expired" | "suspended";
  subscriptionExpiresAt: number | null; // Unix timestamp in seconds
};
```

### User

```typescript
type User = {
  id: string;          // Format: usr_<timestamp>_<random>
  username: string;
  role: "admin" | "super_admin";
  schoolId?: number;   // Only present for role: "admin"
};
```

### PlatformStats

```typescript
type PlatformStats = {
  totalSchools: number;
  totalStudents: number;
  totalPayments: number;
  totalExpenses: number;
};
```

---

## 4. App Structure

Suggested page breakdown:

```
/login                 → Login page (public)
/dashboard             → KPI cards from GET /admin/stats
/schools               → Paginate/search schools list (GET /admin/schools)
/schools/new           → Create school form (POST /admin/schools)
/schools/:id           → School detail view + edit form (GET + PUT /admin/schools/:id)
/users                 → Users list with role badge (GET /admin/users)
/users/new             → Create user form (POST /admin/users)
```

### Route Guard

Protect all routes except `/login`. On every page load, check:
- Token exists in storage
- Decoded `role` is `"super_admin"`

Redirect to `/login` otherwise.

### Suggested UI Patterns

**Schools list:** Table with columns: Name, Slug, Subscription Status (badge), Expires At, Actions (View / Edit). Color-code the status badge — green for active, yellow for trial, red for expired/suspended.

**School detail / edit:** Two-section form — basic info (name, address, phone, logo) and subscription settings (status, expiry date). Keep `slug` read-only.

**Users list:** Table with columns: Username, Role (badge), School (link to school page if admin, "—" if super admin), Actions. Super admin rows should have a distinct visual treatment.

**Create user form:** Show the `schoolId` dropdown only when `role` is `"admin"`. Populate it by fetching `GET /admin/schools`.

**Dashboard:** Four stat cards (Total Schools, Total Students, Total Payments, Total Expenses). Can expand later.

---

## 5. Error Handling

All API errors follow this shape:

```json
{ "error": "Human-readable error message" }
```

| HTTP Status | Meaning | Suggested UI Behaviour |
|---|---|---|
| `400` | Bad request / validation failed | Show inline form errors |
| `401` | Missing token, expired token, or wrong role | Redirect to `/login` and clear stored token |
| `404` | Resource not found | Show a "not found" state on the page |
| `500` | Server error | Show a generic error toast |

### Recommended API Client Setup

```typescript
// Attach token to every request
const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
```

---

## 6. Important Notes

- **Super admin cannot access school-level data directly.** The `/api/*` routes (teachers, students, payments, etc.) are scoped to school admins and will reject a super admin token. Those routes are for the school admin app only.

- **`slug` is immutable after creation.** It is used as the school's identifier internally. Do not expose it as an editable field in the update form.

- **`adminPhones` is always an array**, even when empty (`[]`). It is never `null`.

- **`subscriptionExpiresAt` can be `null`.** This means no hard expiry is set (common for trial accounts without a deadline). Display this as "No expiry set" rather than a broken date.

- **`whatsappToken` is sensitive.** Consider masking it in the UI (e.g. show `••••••••` with a reveal toggle) and avoid logging it.

- **Timestamps throughout the API are Unix timestamps in seconds**, not milliseconds. Always multiply by 1000 before passing to `new Date()`.

- **Password is write-only.** The `GET /admin/users` response never includes passwords. There is currently no change-password endpoint — account for this in your UX (e.g. if a school admin loses access, a super admin creates a new user for them).

- **No pagination on list endpoints currently.** `GET /admin/schools` and `GET /admin/users` return all records. Handle this on the frontend with client-side search/filter for now.
