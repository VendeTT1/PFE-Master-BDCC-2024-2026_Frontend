# Mono SaaS — Frontend Documentation

> **Version:** 1.0  
> **Stack:** React 18 + Vite · react-router-dom v6 · lucide-react · CSS Variables  
> **Backend:** Spring Boot (separate repo)  
> **Auth model:** HTTP-Only Cookie (JWT set by backend)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [Getting Started](#3-getting-started)
4. [Authentication & Security Model](#4-authentication--security-model)
5. [Routing & Role-Based Access](#5-routing--role-based-access)
6. [Context (Global State)](#6-context-global-state)
7. [Shared Components](#7-shared-components)
8. [Pages Reference](#8-pages-reference)
9. [CSS Design System](#9-css-design-system)
10. [API Utility](#10-api-utility)
11. [API Contract with Spring Boot](#11-api-contract-with-spring-boot)
12. [Connecting a Page to the Backend](#12-connecting-a-page-to-the-backend)
13. [Adding a New Page](#13-adding-a-new-page)
14. [Adding a New Admin Feature](#14-adding-a-new-admin-feature)
15. [Dark / Light Mode](#15-dark--light-mode)
16. [Responsiveness](#16-responsiveness)
17. [Common Patterns](#17-common-patterns)
18. [Dependencies](#18-dependencies)
19. [Environment Configuration](#19-environment-configuration)
20. [Backend CORS & Cookie Setup](#20-backend-cors--cookie-setup)

---

## 1. Project Overview

Mono is a multi-tenant SaaS platform that automates the provisioning and management of Odoo instances. The frontend is a React SPA with three distinct user roles, each seeing a completely different interface:

| Role | What they see | Home route |
|------|--------------|------------|
| `OWNER` | Their own instances, subscription, profile | `/dashboard` |
| `ADMIN` | All tenants, all instances, system health | `/admin/dashboard` |
| `STAFF` | A single-button redirect to their Odoo URL | `/staff` |

Role detection is fully handled by the backend — the frontend simply reads the `role` field returned from `/api/auth/me` or `/api/auth/login` and redirects accordingly.

---

## 2. Project Structure

```
mono-saas/
├── index.html                  # HTML entry point, loads Google Fonts
├── vite.config.js              # Vite bundler config
├── package.json                # Dependencies
└── src/
    ├── main.jsx                # React root — mounts <App /> into #root
    ├── App.jsx                 # Router + all route definitions
    │
    ├── context/
    │   ├── AuthContext.jsx     # Current user state, login/logout/updateUser
    │   └── ThemeContext.jsx    # Dark/light mode, persisted to localStorage
    │
    ├── components/
    │   ├── Layout.jsx          # Sidebar + Topbar wrapper for authenticated pages
    │   ├── Sidebar.jsx         # Role-aware nav sidebar (desktop + mobile drawer)
    │   ├── Sidebar.css
    │   ├── Topbar.jsx          # Search bar + notification bell + hamburger
    │   ├── Topbar.css
    │   └── ProtectedRoute.jsx  # Route guard — checks auth + role
    │
    ├── pages/
    │   ├── auth/
    │   │   ├── Login.jsx       # Sign-in form
    │   │   ├── Register.jsx    # Sign-up form with password strength meter
    │   │   └── Login.css       # Shared styles for auth pages
    │   │
    │   ├── owner/              # Pages visible only to OWNER role
    │   │   ├── Dashboard.jsx   # Stats + instance quick-actions
    │   │   ├── Instances.jsx   # Full instance grid + CRUD modal
    │   │   ├── Subscription.jsx# Plan picker + billing history
    │   │   └── Profile.jsx     # Personal info + password change
    │   │
    │   ├── admin/              # Pages visible only to ADMIN role
    │   │   ├── Dashboard.jsx   # Platform-wide stats overview
    │   │   ├── AllInstances.jsx# All instances across all tenants (filterable)
    │   │   ├── Users.jsx       # All users, invite modal, status toggle
    │   │   ├── Subscriptions.jsx # Revenue overview + all subscriptions
    │   │   └── Health.jsx      # System metrics + service status + alerts
    │   │
    │   └── staff/
    │       └── StaffRedirect.jsx # Minimal page with a link to the Odoo instance
    │
    ├── utils/
    │   └── api.js              # Centralised fetch wrapper (credentials: include)
    │
    └── styles/
        ├── global.css          # Design system: variables, utility classes, layout
        ├── instances.css       # Instance card styles (shared by dashboard + instances page)
        ├── subscription.css    # Plan cards, billing toggle
        ├── profile.css         # Profile page layout
        └── admin.css           # Admin table filters, two-column grid, staff page
```

---

## 3. Getting Started

### Prerequisites
- Node.js ≥ 18
- Spring Boot backend running on `http://localhost:8080`

### Install & Run

```bash
unzip mono-saas.zip
cd mono-saas
npm install
npm run dev
# → http://localhost:5173
```

### Build for production

```bash
npm run build
# Output goes to /dist — deploy to Nginx, Vercel, Netlify, etc.
```

### Change the API URL

Open `src/utils/api.js` and change:
```js
export const API_BASE = 'http://localhost:8080/api'
```
Or use an environment variable (see [Section 19](#19-environment-configuration)).

---

## 4. Authentication & Security Model

### How it works

```
Browser                          Spring Boot
  |                                  |
  |-- POST /api/auth/login --------> |
  |   { email, password }            |
  |                                  | validates credentials
  |                                  | creates JWT
  |<-- 200 OK ---------------------- |
  |   Set-Cookie: auth_token=...     | ← HTTP-Only cookie, Secure, SameSite=Strict
  |   Body: { id, name, email, role }|
  |                                  |
  | (all subsequent requests)        |
  |-- GET /api/instances ----------> |
  |   Cookie: auth_token=... ──────> | ← browser sends automatically
  |<-- 200 OK ---------------------- |
```

**Key principle:** The JWT token is **never stored in JavaScript**. It lives only in the HTTP-Only cookie — meaning XSS attacks cannot steal it. The React app only holds `{ id, name, email, role }` in React state (and `sessionStorage` for page-refresh persistence).

### What sessionStorage holds

```js
sessionStorage.getItem('mono_user_info')
// → '{"id":1,"name":"Alex Morgan","email":"alex@example.com","role":"OWNER"}'
```

This is **display data only** — never a token. On every app load, `AuthContext` still calls `GET /api/auth/me` to re-validate the cookie. `sessionStorage` just prevents a blank flash while the network call happens.

### Auth flow on app start

```
App mounts
  └── AuthContext useEffect runs
        ├── Read sessionStorage → set user immediately (prevents blank flash)
        └── GET /api/auth/me (credentials: 'include')
              ├── 200 OK → update user state, refresh sessionStorage
              └── 401    → clear user state + sessionStorage → user sees /login
```

### Logout

```js
// AuthContext.logout()
await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
// Backend clears the cookie (Max-Age: 0)
// Frontend clears sessionStorage and React state
```

---

## 5. Routing & Role-Based Access

All routes are defined in `src/App.jsx`. The `ProtectedRoute` component guards every authenticated route.

```jsx
// Example: only OWNER can access /dashboard
<Route path="/dashboard" element={
  <ProtectedRoute allowedRoles={['OWNER']}>
    <OwnerDashboard />
  </ProtectedRoute>
} />
```

### ProtectedRoute logic

```
Render ProtectedRoute
  ├── loading === true  → render null (waiting for /api/auth/me)
  ├── user === null     → <Navigate to="/login" />
  ├── role not allowed  → <Navigate to role's home page />
  └── all good          → render children
```

### Route map

| Path | Component | Allowed roles |
|------|-----------|---------------|
| `/login` | `Login` | Public |
| `/register` | `Register` | Public |
| `/dashboard` | `OwnerDashboard` | OWNER |
| `/instances` | `InstancesPage` | OWNER |
| `/subscription` | `SubscriptionPage` | OWNER |
| `/profile` | `ProfilePage` | OWNER |
| `/admin/dashboard` | `AdminDashboard` | ADMIN |
| `/admin/instances` | `AdminInstances` | ADMIN |
| `/admin/users` | `AdminUsers` | ADMIN |
| `/admin/subscriptions` | `AdminSubscriptions` | ADMIN |
| `/admin/health` | `SystemHealth` | ADMIN |
| `/staff` | `StaffRedirect` | STAFF |

---

## 6. Context (Global State)

### AuthContext — `src/context/AuthContext.jsx`

```jsx
import { useAuth } from '../context/AuthContext'

const { user, login, logout, updateUser, loading, checkSession } = useAuth()
```

| Value | Type | Description |
|-------|------|-------------|
| `user` | `Object \| null` | `{ id, name, email, role }` or null if not logged in |
| `loading` | `boolean` | True while `GET /api/auth/me` is in-flight on startup |
| `login(userData)` | `function` | Call after successful login. Saves user to state + sessionStorage |
| `logout()` | `async function` | Calls `POST /api/auth/logout`, clears state + sessionStorage |
| `updateUser(partial)` | `function` | Merge partial update into user state (use after profile save) |
| `checkSession()` | `async function` | Re-validate the cookie session manually if needed |

**Also exported:** `API_BASE` constant (the base URL string).

### ThemeContext — `src/context/ThemeContext.jsx`

```jsx
import { useTheme } from '../context/ThemeContext'

const { theme, toggleTheme } = useTheme()
// theme: 'light' | 'dark'
// toggleTheme(): switches and persists to localStorage
```

Theme is applied to `document.documentElement` via `data-theme="dark"` attribute, which activates the CSS variable overrides in `global.css`.

---

## 7. Shared Components

### Layout

Wraps every authenticated page. Manages the mobile sidebar open/close state.

```jsx
import Layout from '../components/Layout'

export default function MyPage() {
  return (
    <Layout>
      {/* your page content here */}
    </Layout>
  )
}
```

### Sidebar

- Shows different nav items depending on `user.role` (OWNER vs ADMIN)
- On mobile (≤768px): hidden off-canvas, opened by topbar hamburger button
- `onClose` prop is called when a nav link is clicked (closes the drawer on mobile)

### Topbar

- Contains the hamburger button (visible only on mobile)
- Search bar (currently UI only — wire to search API when ready)
- Notification bell with badge count

### ProtectedRoute

```jsx
<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
  <SomePage />
</ProtectedRoute>
```

Pass `allowedRoles` as an array of role strings. Omitting it allows any authenticated user.

---

## 8. Pages Reference

### Login (`/login`)

- Email + password form
- Password visibility toggle
- Calls `POST /api/auth/login` with `credentials: 'include'`
- On success: calls `login(userData)` → redirects based on role
- Link to `/register`

### Register (`/register`)

- First name, last name, email, password, confirm password
- Real-time password strength meter (0–4 score based on length, uppercase, numbers, symbols)
- Password match indicator
- Terms & conditions checkbox
- Calls `POST /api/auth/register` with `credentials: 'include'`
- On success: redirects to `/dashboard` (all registrations create OWNER accounts)

### Owner Dashboard (`/dashboard`)

- Greeting with user's first name
- 4 stat cards: Total Instances, Running, Current Plan, Days Left
- Instance quick-action cards with Start / Stop / Restart buttons
- Link to `/instances` for the full view

**TODO connections:**
```js
// GET /api/owner/dashboard
// Returns: { totalInstances, runningInstances, subscriptionPlan, daysLeft, nextBilling, monthlyPrice }

// POST /api/instances/{id}/start
// POST /api/instances/{id}/stop
// POST /api/instances/{id}/restart
```

### Owner Instances (`/instances`)

- Grid of all owner's instances
- Each card shows: name, type, region, status dot, uptime, auto-sync badge
- Actions: Start, Stop, Restart, Open URL (external link)
- Three-dot menu per card with Delete option
- "Deploy New Instance" add card
- Add Instance modal: name, type, region

**TODO connections:**
```js
// GET    /api/instances            → list owner's instances
// POST   /api/instances            → create (body: { name, type, region })
// POST   /api/instances/{id}/start
// POST   /api/instances/{id}/stop
// POST   /api/instances/{id}/restart
// DELETE /api/instances/{id}
```

### Owner Subscription (`/subscription`)

- Monthly/Yearly billing toggle (animated)
- 3 plan cards (Free, Pro, Enterprise) — flexible, edit `PLANS` array to add/change plans
- Upgrade button calls `POST /api/subscriptions/upgrade`
- Billing history table with download invoice button

**To change plans:** Edit the `PLANS` array at the top of `Subscription.jsx`. Each plan has:
```js
{
  id: 'PRO',                     // sent to backend
  name: 'Pro',                   // display name
  price: { monthly: 19, yearly: 190 },
  description: '...',
  icon: Shield,                  // lucide-react icon
  popular: true,                 // shows "Most Popular" badge
  features: ['...'],             // array of feature strings
  cta: 'Upgrade to Pro',        // button label
}
```

### Owner Profile (`/profile`)

- Two-column layout: personal info form on left, photo + security on right
- Bio with 240-character counter
- Password change form with show/hide toggles and validation
- 2FA status badge (display only — wire enable/disable when backend supports it)
- Calls `updateUser()` from AuthContext after successful save (updates sidebar name)

### Admin Dashboard (`/admin/dashboard`)

- Platform stats: Total Users, All Instances, Active Instances, Monthly Revenue, Open Issues
- Recent Instances table (last 4)
- Recent Users table (last 4)
- Links to full pages via "View all"

### Admin All Instances (`/admin/instances`)

- All instances across all tenant accounts in one table
- Search by name, owner email, or region
- Status filter pills: ALL / RUNNING / STOPPED / PENDING
- Per-row actions: Start, Stop, Restart, Delete
- Instance count shown in filter bar

### Admin Users (`/admin/users`)

- All owners and staff in one table
- Search by name or email
- Role filter: ALL / OWNER / STAFF
- Per-user three-dot menu: Email, Activate/Deactivate, Delete
- Invite User modal: email + role selection

### Admin Subscriptions (`/admin/subscriptions`)

- 4 revenue summary stat cards
- All subscriptions in one table with plan, billing cycle, amount, status, next billing date
- Filter by plan type
- Download invoice button per row

### Admin System Health (`/admin/health`)

- Server info strip: uptime, version, environment badge
- 4 metric cards with animated progress bars: CPU, Memory, Disk, Network
- Bar turns yellow at >70%, red at >90%
- Active alerts list (WARNING / CRITICAL styled appropriately)
- Service status table: latency, uptime, status icon per service
- Manual refresh button

### Staff Redirect (`/staff`)

- Minimal centered card with user info pill
- Calls `GET /api/staff/instance` to get the assigned Odoo URL
- Single "Open Odoo Instance" button (opens in new tab)
- Sign out button

---

## 9. CSS Design System

All design tokens are CSS custom properties defined in `src/styles/global.css`. They automatically switch between light and dark mode via `[data-theme="dark"]`.

### Color Tokens

```css
/* Backgrounds */
--bg-base        /* page background */
--bg-surface     /* cards, inputs */
--bg-elevated    /* table headers, stat backgrounds */
--bg-sidebar     /* sidebar (always dark) */
--bg-hover       /* row/button hover */

/* Accent (electric violet) */
--accent         /* #6C47FF light / #7C5CFF dark */
--accent-soft    /* light tint of accent — icon backgrounds, badges */
--accent-hover   /* darker shade for button hover */

/* Status */
--success / --success-soft
--warning / --warning-soft
--danger  / --danger-soft
--info    / --info-soft

/* Text */
--text-primary     /* headings, main content */
--text-secondary   /* labels, descriptions */
--text-muted       /* hints, metadata */

/* Borders */
--border           /* default subtle border */
--border-md        /* medium emphasis */
--border-strong    /* inputs on focus, emphasis */
```

### Utility Classes

```html
<!-- Cards -->
<div class="card">...</div>

<!-- Badges -->
<span class="badge badge-success">Active</span>
<span class="badge badge-danger">Stopped</span>
<span class="badge badge-warning">Pending</span>
<span class="badge badge-info">Pro</span>
<span class="badge badge-accent">Enterprise</span>

<!-- Buttons -->
<button class="btn btn-primary">Save</button>
<button class="btn btn-secondary">Cancel</button>
<button class="btn btn-ghost">Subtle</button>
<button class="btn btn-danger">Delete</button>
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary btn-lg">Large</button>

<!-- Inputs -->
<input class="input" type="text" />
<label class="label">Field name</label>

<!-- Alerts -->
<div class="alert alert-success">Saved!</div>
<div class="alert alert-danger">Error message</div>
<div class="alert alert-warning">Warning</div>
<div class="alert alert-info">Info</div>

<!-- Status dots -->
<span class="status-dot online"></span>
<span class="status-dot offline"></span>
<span class="status-dot pending"></span>

<!-- Layout helpers -->
<div class="form-group">...</div>      <!-- vertical spacing for form fields -->
<div class="form-row">...</div>        <!-- two-column form row (stacks on mobile) -->
<div class="divider"></div>            <!-- horizontal rule -->
<div class="stats-grid">...</div>      <!-- responsive stat cards grid -->
<div class="page-header">...</div>     <!-- page title + subtitle block -->
<div class="table-wrapper"><table>    <!-- styled table with hover rows -->

<!-- Animations -->
<div class="fade-in">...</div>        <!-- fade up on mount -->
<svg class="spin">...</svg>           <!-- continuous rotation (loading) -->

<!-- Modal -->
<div class="modal-overlay">
  <div class="modal">...</div>
</div>
```

### Typography

- **Body font:** DM Sans (loaded from Google Fonts)
- **Monospace:** Space Mono (used for numbers: uptime, prices, invoice IDs)
- Both loaded in `index.html` — no additional setup needed

---

## 10. API Utility

`src/utils/api.js` provides a thin wrapper around `fetch` that automatically:
- Prepends `API_BASE` to all paths
- Adds `credentials: 'include'` (sends the HTTP-Only cookie)
- Sets `Content-Type: application/json` on POST/PUT/PATCH
- Throws a meaningful `Error` if the response status is ≥ 400
- Returns `null` on `204 No Content`

```js
import { api } from '../utils/api'

// GET — no body
const instances = await api.get('/instances')

// POST — with body
const newInstance = await api.post('/instances', {
  name: 'My DB',
  type: 'Database',
  region: 'us-east-1',
})

// PUT — full update
await api.put('/users/me', { firstName: 'Alex', lastName: 'Morgan' })

// PATCH — partial update
await api.patch('/instances/5/status', { status: 'STOPPED' })

// DELETE
await api.del('/instances/5')
```

**Error handling in a component:**
```js
try {
  const data = await api.get('/instances')
  setInstances(data)
} catch (err) {
  setError(err.message) // e.g. "Request failed: 403 Forbidden"
}
```

---

## 11. API Contract with Spring Boot

Below is the complete list of endpoints the frontend expects. All endpoints require the auth cookie unless marked **(public)**.

### Auth

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| POST | `/api/auth/login` | `{ email, password }` | `{ id, name, email, role }` | Sets HTTP-Only cookie **(public)** |
| POST | `/api/auth/register` | `{ firstName, lastName, email, password }` | `{ id, name, email, role }` | Sets HTTP-Only cookie, role=OWNER **(public)** |
| GET | `/api/auth/me` | — | `{ id, name, email, role }` | Used on app start to validate session |
| POST | `/api/auth/logout` | — | `204` | Clears the cookie |

### Owner Endpoints

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/owner/dashboard` | — | `{ totalInstances, runningInstances, subscriptionPlan, daysLeft, nextBilling, monthlyPrice }` |
| GET | `/api/instances` | — | `Instance[]` |
| POST | `/api/instances` | `{ name, type, region }` | `Instance` |
| POST | `/api/instances/{id}/start` | — | `Instance` |
| POST | `/api/instances/{id}/stop` | — | `Instance` |
| POST | `/api/instances/{id}/restart` | — | `Instance` |
| DELETE | `/api/instances/{id}` | — | `204` |
| GET | `/api/subscriptions/me` | — | `{ plan, billing, invoices[] }` |
| POST | `/api/subscriptions/upgrade` | `{ plan, billing }` | `{ plan }` |
| GET | `/api/invoices/{id}/download` | — | PDF blob |
| GET | `/api/users/me` | — | `{ id, firstName, lastName, email, phone, bio }` |
| PUT | `/api/users/me` | `{ firstName, lastName, email, phone, bio }` | `{ id, name, email }` |
| POST | `/api/users/me/change-password` | `{ currentPassword, newPassword }` | `204` |

### Admin Endpoints

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/admin/dashboard` | — | Platform stats object |
| GET | `/api/admin/instances` | — | `Instance[]` (all tenants) |
| POST | `/api/admin/instances/{id}/start` | — | `Instance` |
| POST | `/api/admin/instances/{id}/stop` | — | `Instance` |
| POST | `/api/admin/instances/{id}/restart` | — | `Instance` |
| DELETE | `/api/admin/instances/{id}` | — | `204` |
| GET | `/api/admin/users` | — | `User[]` |
| POST | `/api/admin/users/invite` | `{ email, role }` | `204` |
| PATCH | `/api/admin/users/{id}/toggle-status` | — | `User` |
| DELETE | `/api/admin/users/{id}` | — | `204` |
| GET | `/api/admin/subscriptions` | — | `Subscription[]` |
| GET | `/api/admin/health` | — | Health metrics object |

### Staff Endpoints

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/staff/instance` | `{ url: 'https://...' }` |

### Expected Object Shapes

```js
// Instance
{
  id: number,
  name: string,
  type: 'Server' | 'Database' | 'Cloud',
  region: string,          // e.g. 'us-east-1'
  status: 'RUNNING' | 'STOPPED' | 'PENDING',
  uptime: string,          // e.g. '99.9%'
  autoSync: boolean,
  url: string | null,      // external Odoo URL
  createdAt: string,       // ISO date string
}

// User
{
  id: number,
  name: string,
  email: string,
  role: 'ADMIN' | 'OWNER' | 'STAFF',
  plan: 'FREE' | 'PRO' | 'ENTERPRISE' | null,
  instances: number,
  status: 'ACTIVE' | 'INACTIVE',
  joinedAt: string,
}

// Error response (any failed request)
{
  message: string,         // human-readable error description
  status: number,          // HTTP status code (optional but helpful)
}
```

---

## 12. Connecting a Page to the Backend

Every page currently uses placeholder `setTimeout` data. To connect a page to real data, follow this pattern:

### Before (placeholder)

```js
useEffect(() => {
  setTimeout(() => {
    setInstances([{ id: 1, name: 'Fake', ... }])
    setLoading(false)
  }, 500)
}, [])
```

### After (real API)

```js
import { api } from '../../utils/api'

useEffect(() => {
  loadInstances()
}, [])

async function loadInstances() {
  setLoading(true)
  try {
    const data = await api.get('/instances')
    setInstances(data)
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
```

That's it. The `api` utility handles the cookie, base URL, and error parsing automatically.

### Action buttons (start / stop / restart)

```js
async function handleAction(instanceId, action) {
  setActionLoading(prev => ({ ...prev, [instanceId]: action }))
  try {
    const updated = await api.post(`/instances/${instanceId}/${action}`)
    setInstances(prev => prev.map(i => i.id === instanceId ? updated : i))
  } catch (err) {
    setError(err.message)
  } finally {
    setActionLoading(prev => ({ ...prev, [instanceId]: null }))
  }
}
```

---

## 13. Adding a New Page

Example: adding a **Notifications** page for owners.

### Step 1 — Create the page file

```jsx
// src/pages/owner/Notifications.jsx
import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { api } from '../../utils/api'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get('/notifications')
        setNotifications(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <Layout>
      <div className="page-header">
        <h1>Notifications</h1>
        <p>Your recent alerts and updates.</p>
      </div>

      {loading && <div className="empty-state"><p>Loading...</p></div>}
      {error   && <div className="alert alert-danger">{error}</div>}

      {/* Your content here */}
    </Layout>
  )
}
```

### Step 2 — Add to the sidebar nav

In `src/components/Sidebar.jsx`, add to `OWNER_NAV`:

```js
import { Bell } from 'lucide-react'

const OWNER_NAV = [
  // ... existing items
  { to: '/notifications', icon: Bell, label: 'Notifications' },
]
```

### Step 3 — Add the route

In `src/App.jsx`:

```jsx
import NotificationsPage from './pages/owner/Notifications'

// Inside <Routes>:
<Route path="/notifications" element={
  <ProtectedRoute allowedRoles={['OWNER']}>
    <NotificationsPage />
  </ProtectedRoute>
} />
```

Done. The page is now accessible, protected, and visible in the sidebar.

---

## 14. Adding a New Admin Feature

Same as above but use `ADMIN_NAV` in the sidebar and `allowedRoles={['ADMIN']}` on the route. Admin pages live in `src/pages/admin/`.

---

## 15. Dark / Light Mode

The theme is controlled by a `data-theme` attribute on `<html>`:

```
data-theme="light" → CSS variables use light values (default)
data-theme="dark"  → CSS variables switch to dark overrides
```

**Never hardcode colors in component CSS.** Always use CSS variables:

```css
/* ✅ Correct */
color: var(--text-primary);
background: var(--bg-surface);
border: 1px solid var(--border);

/* ❌ Wrong — will not switch in dark mode */
color: #333;
background: white;
```

The user's theme preference is saved to `localStorage` under the key `mono_theme` and restored on every page load by `ThemeContext`.

---

## 16. Responsiveness

The app uses three breakpoints in `global.css`:

| Breakpoint | Width | Behaviour |
|-----------|-------|-----------|
| Desktop | >1024px | Sidebar fixed at 240px, full padding |
| Tablet | ≤1024px | Tighter padding, smaller stat cards |
| Mobile | ≤768px | Sidebar off-canvas drawer, hamburger button appears, form rows stack |
| Small mobile | ≤480px | Single-column grids, tables scroll horizontally, reduced padding |

On mobile the sidebar is a slide-in drawer triggered by the hamburger button in the topbar. Clicking any nav link or the backdrop closes it.

**Adding responsive styles to a new component:**

```css
.my-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

@media (max-width: 768px) {
  .my-grid { grid-template-columns: 1fr; }
}
```

---

## 17. Common Patterns

### Loading state

```jsx
const [loading, setLoading] = useState(true)

if (loading) {
  return (
    <Layout>
      <div className="empty-state"><p>Loading...</p></div>
    </Layout>
  )
}
```

### Error state

```jsx
const [error, setError] = useState('')

{error && <div className="alert alert-danger">{error}</div>}
```

### Confirmation before destructive actions

```js
async function handleDelete(id) {
  if (!window.confirm('Delete this item? This cannot be undone.')) return
  await api.del(`/items/${id}`)
  setItems(prev => prev.filter(i => i.id !== id))
}
```

### Optimistic UI update (update local state immediately)

```js
// Update UI first, then sync with backend
setInstances(prev => prev.map(i =>
  i.id === id ? { ...i, status: 'STOPPED' } : i
))
try {
  await api.post(`/instances/${id}/stop`)
} catch (err) {
  // Revert on failure
  setInstances(prev => prev.map(i =>
    i.id === id ? { ...i, status: 'RUNNING' } : i
  ))
  setError(err.message)
}
```

### Modal pattern

```jsx
const [showModal, setShowModal] = useState(false)

// In JSX:
{showModal && (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
    <div className="modal">
      <h2>Modal Title</h2>
      <p>Modal description text.</p>
      {/* form or content */}
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={handleConfirm}>Confirm</button>
      </div>
    </div>
  </div>
)}
```

---

## 18. Dependencies

| Package | Version | Purpose | Safe? |
|---------|---------|---------|-------|
| `react` | ^18.2 | Core UI framework | ✅ Meta — industry standard |
| `react-dom` | ^18.2 | DOM renderer | ✅ |
| `react-router-dom` | ^6.22 | Client-side routing | ✅ Remix team — most popular router |
| `lucide-react` | ^0.383 | Icon library (SVG icons) | ✅ Open source, tree-shakeable |
| `vite` | ^5.1 | Dev server + bundler | ✅ Fast modern build tool |
| `@vitejs/plugin-react` | ^4.2 | Vite React plugin (JSX transform) | ✅ Official Vite plugin |

**No** UI frameworks (no MUI, no Chakra, no Tailwind). All styling is handwritten CSS using CSS variables — this keeps the bundle small and gives full design control.

---

## 19. Environment Configuration

Currently the API base URL is hardcoded in `src/utils/api.js`. For a proper multi-environment setup:

### Step 1 — Create environment files

```bash
# .env.development  (used by npm run dev)
VITE_API_BASE_URL=http://localhost:8080/api

# .env.production   (used by npm run build)
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### Step 2 — Update api.js

```js
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
```

Vite automatically injects `VITE_*` variables at build time. Only variables prefixed with `VITE_` are exposed to the browser — never put secrets here.

---

## 20. Backend CORS & Cookie Setup

For HTTP-Only cookies to work cross-origin (frontend on port 5173, backend on 8080), Spring Boot must be configured correctly.

### Spring Boot CORS Configuration

```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));  // React dev server
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);   // ← REQUIRED for cookies to be sent/received
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

### Setting the HTTP-Only Cookie on Login

```java
@PostMapping("/api/auth/login")
public ResponseEntity<UserDto> login(
    @RequestBody LoginRequest req,
    HttpServletResponse response
) {
    UserDto user = authService.authenticate(req.getEmail(), req.getPassword());
    String token = jwtService.generateToken(user);

    ResponseCookie cookie = ResponseCookie.from("auth_token", token)
        .httpOnly(true)         // JS cannot read this cookie
        .secure(true)           // HTTPS only (set false for localhost dev)
        .sameSite("Strict")     // CSRF protection
        .path("/")
        .maxAge(Duration.ofDays(7))
        .build();

    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    return ResponseEntity.ok(user);  // return { id, name, email, role }
}
```

### Clearing the Cookie on Logout

```java
@PostMapping("/api/auth/logout")
public ResponseEntity<Void> logout(HttpServletResponse response) {
    ResponseCookie cookie = ResponseCookie.from("auth_token", "")
        .httpOnly(true)
        .secure(true)
        .sameSite("Strict")
        .path("/")
        .maxAge(0)   // ← expires immediately
        .build();

    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    return ResponseEntity.noContent().build();
}
```

### Reading the Cookie on Each Request

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, ...) {
        // Read from cookie instead of Authorization header
        String token = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("auth_token".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }
        // validate token and set SecurityContext...
    }
}
```

---

*End of documentation. For questions or contributions, update this file alongside any code changes.*
