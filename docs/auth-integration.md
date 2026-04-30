# Auth Integration Guide

## Overview

The API uses JWT (JSON Web Token) for authentication. Every request to `/api/*` or `/admin/*` must include a valid token in the `Authorization` header. Tokens expire after **30 days**.

There are two roles:
- `admin` — school admin, can access `/api/*` routes only
- `super_admin` — platform admin, can access `/admin/*` routes only

---

## 1. Login

**`POST /auth/login`**

No authorization header required.

**Request body:**
```json
{
  "username": "admin",
  "password": "yourpassword"
}
```

**Success response `200`:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "admin"
}
```

**Failure response `401`:**
```json
{
  "error": "Invalid credentials"
}
```

---

## 2. Using the Token

Include the token in every subsequent request as a `Bearer` token:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

If the token is missing, expired, or the role doesn't match the route, the API returns:
```json
{
  "error": "Unauthorized"
}
```
with HTTP status `401`.

---

## 3. Token Storage

Store the token in `localStorage` (or `sessionStorage` if you prefer session-only auth). Do not store it in a cookie unless you handle CSRF protection.

```js
// After successful login
localStorage.setItem('token', response.token);
localStorage.setItem('role', response.role);

// On logout
localStorage.removeItem('token');
localStorage.removeItem('role');

// Read token for requests
const token = localStorage.getItem('token');
```

---

## 4. Making Authenticated Requests

### Plain fetch

```js
const API_BASE = 'https://your-api-url.workers.dev';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// GET example
const res = await fetch(`${API_BASE}/api/students`, {
  headers: authHeaders(),
});

if (res.status === 401) {
  // Token expired or invalid — redirect to login
  redirectToLogin();
}

const data = await res.json();
```

### Axios

```js
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-api-url.workers.dev',
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) redirectToLogin();
    return Promise.reject(error);
  }
);

export default api;
```

---

## 5. JWT Payload

The token contains the following claims (you can decode it client-side with `atob` or a library like `jwt-decode` — but never trust client-decoded data for security decisions):

| Field | Type | Description |
|---|---|---|
| `userId` | `string` | ID of the logged-in user |
| `role` | `"admin"` \| `"super_admin"` | User role |
| `schoolId` | `number` | School this user belongs to (absent for `super_admin`) |
| `exp` | `number` | Expiry as Unix timestamp (30 days from login) |

```js
// Decode without verification (for UI use only — e.g. show username)
function decodeToken(token) {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}

const { role, schoolId, exp } = decodeToken(localStorage.getItem('token'));
```

---

## 6. Token Expiry Check

Check before making requests whether the token is still valid. If expired, send the user to login without making the API call:

```js
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds; Date.now() is in milliseconds
    return Date.now() / 1000 > exp;
  } catch {
    return true;
  }
}

// Usage
const token = localStorage.getItem('token');
if (isTokenExpired(token)) {
  redirectToLogin();
}
```

---

## 7. Route Access by Role

| Route prefix | Required role |
|---|---|
| `/api/*` | `admin` |
| `/admin/*` | `super_admin` |
| `/auth/login` | None (public) |

An `admin` token used on `/admin/*` returns `401`. A `super_admin` token used on `/api/*` also returns `401`. Show the correct UI sections based on the `role` returned at login.

```js
const role = localStorage.getItem('role');

if (role === 'admin') {
  // Show school management UI
} else if (role === 'super_admin') {
  // Show platform admin UI (schools list, stats, user management)
}
```

---

## 8. Full Login Flow Example (React)

```jsx
async function handleLogin(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    // Show error: data.error === "Invalid credentials"
    setError(data.error);
    return;
  }

  localStorage.setItem('token', data.token);
  localStorage.setItem('role', data.role);

  if (data.role === 'super_admin') {
    navigate('/admin/dashboard');
  } else {
    navigate('/dashboard');
  }
}
```

---

## 9. Error Reference

| HTTP Status | `error` value | Meaning |
|---|---|---|
| `401` | `"Invalid credentials"` | Wrong username or password |
| `401` | `"Unauthorized"` | Token missing, expired, or wrong role for this route |
