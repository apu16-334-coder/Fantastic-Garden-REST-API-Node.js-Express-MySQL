# Fantastic Gardens API

A RESTful API for a garden business — products, services, staff, and customer orders — built with Express.js, Sequelize, and MySQL. This project demonstrates relational database design (foreign keys, junction tables with extra columns, transactions) as a companion to MongoDB/Mongoose-based work.

## Tech Stack

- **Runtime:** Node.js, Express.js
- **Database:** MySQL (hosted on Aiven)
- **ORM:** Sequelize
- **Auth:** JWT (JSON Web Tokens), bcrypt password hashing
- **Security:** Helmet, CORS, express-rate-limit, SSL-secured DB connection

## Tech Highlights

- Role-based access control (admin / staff / customer) enforced at both the route and query level
- Database transactions for every multi-step write (order creation, staff deactivation cascade, order-service status propagation)
- Soft deletes (`IsActive` / `IsDeleted`) instead of hard deletes, preserving historical/audit data
- Server-side price calculation — client never controls `TotalCost`
- Reusable `ApiFeatures` class for filtering, searching, sorting, and pagination across list endpoints
- IDOR protection — ownership/scope checks are baked into database queries, not checked after the fact

---

## Roles

| Role | Description |
|---|---|
| **Customer** | Self-registers, places orders, manages only their own data |
| **Staff** | Created by admin only, works on services assigned to them |
| **Admin** | A `staff` account with `Role: 'admin'` — full system access |

---

## Schema Overview

| Table | Purpose |
|---|---|
| `customer` | Customer accounts |
| `staff` | Staff/admin accounts (`Role` column distinguishes them) |
| `product` | Garden products for sale |
| `service` | Garden services offered (includes a system `Delivery` service) |
| `orders` | Customer orders — `OrderStatus`: `pending` → `in-progress` → `completed`, or `cancelled` |
| `orderproduct` | Junction: order ↔ product, carries `Quantity` |
| `orderservice` | Junction: order ↔ service, carries `StaffId` and `ServiceStatus` (`pending` → `in-progress` → `completed`) |

**Order status is derived, not directly settable** (except cancellation):
- `pending → in-progress`: automatic, when admin assigns the first staff member to a service
- `in-progress → completed`: automatic, when *every* `orderservice` row on that order reaches `completed`
- `* → cancelled`: manual, admin only (with a required reason), or customer (only while still `pending`, no reason required)

Every order that includes products automatically gets a `Delivery` service attached, so every order always has at least one `orderservice` row — this keeps the completion logic uniform, with no special case for products-only orders.

---

## Authentication

| Method | Route | Access | Business Logic |
|---|---|---|---|
| POST | `/api/v1/auth/signup` | Public | Registers a new customer. Password is hashed via a Sequelize `beforeValidate` hook — only re-hashes if `Password` was actually changed (`instance.changed('Password')`), preventing double-hashing on unrelated updates. |
| POST | `/api/v1/auth/login/customer` | Public | Customer login. Looks up by `CustomerEmail` using `.unscoped()` (since `Password` is excluded from the model's `defaultScope`), compares with bcrypt, issues a JWT (`{ id, role: 'customer' }`). |
| POST | `/api/v1/auth/login/staff` | Public | Staff/admin login, same pattern. `role` in the JWT is read directly from the DB row (`staff.Role`), so admins automatically get `role: 'admin'` tokens. |
| PATCH | `/api/v1/auth/change-password` | Any authenticated user (customer or staff) | Self-service password change. Requires `currentPassword` + `newPassword` in the body; rejects if they're identical. Verifies `currentPassword` against the stored hash (fetched via `.unscoped()`, since `Password` is excluded by default). On success, assigns the new plaintext password to the instance and calls `.save()` — the model's `beforeValidate` hook detects the change (`changed('Password')`) and re-hashes it automatically. |


**Design decisions:**
- Staff accounts are **not** self-registered — only an admin can create one (via Staff CRUD), preventing public signup of privileged accounts.
- JWTs carry `id` and `role`, never email — IDs don't change, emails can; embedding email would also leak PII into the token unnecessarily.
- All protected routes require `Authorization: Bearer <token>`, verified by `auth.middleware.js`, which attaches `req.user = { id, role }`.

---

## Staff Management (`/api/v1/staffs`) — Admin only, except where noted

All order routes require authentication; behavior branches by `req.user.role`.

| Method | Route | Access | Business Logic |
|---|---|---|---|
| POST | `/` | Admin | Create a new staff account. Role defaults to `staff`; |
| GET | `/` | Admin | List all staff. Supports `ApiFeatures` (filter, search, sort, paginate). |
| GET | `/:id` | Admin | Get one staff profile. |
| PATCH | `/:id` | Admin. | Update profile fields (name/email) — whitelisted via `filterBody`, cannot be used to change `Role` or `IsActive`. And Admin can not update his own profile by using this route |
| PATCH | `/:id/role` | Admin | Change a staff member's role (`staff` ↔ `admin`), separate from the general update route to keep privilege escalation as an explicit, isolated action. same cascade logic of soft delete, if change role staff to admin, not if admin to staff |
| DELETE | `/:id` | Admin | **Soft-deletes** (deactivates) staff — see cascade logic below. Admin cannot deactivate their own account. |
| PATCH | `/:id/reactivate` | Admin | Reverses a soft delete — sets `IsActive` back to `true`. |
| PATCH | `/api/v1/staffs/:id/reset-password` | Admin | Forcibly resets another staff member's password (e.g., they're locked out). Admin cannot reset their own password through this route. Takes only `newPassword` (no current-password check, since admin is acting as a trusted third party). Same hashing hook applies on save. |
| GET | `/api/v1/staffs/me` | Staff or Admin | Returns the logged-in staff/admin's own profile, identified from the JWT (`req.user.id`) — not a param, so a staff member can only ever fetch their own record through this route. |

**Deactivation cascade (transaction-wrapped):**
1. Set `staff.IsActive = false`.
2. Find every `orderservice` row assigned to this staff member where the *service* isn't `completed` **and** the parent *order* isn't `cancelled`/`completed`.
3. Unassign those rows: `StaffId = null`, `ServiceStatus = 'pending'`.
4. For each affected order, re-check its siblings fresh from the DB — if none are `in-progress` anymore, revert that order's `OrderStatus` back to `pending` (so it re-enters the admin's "needs assignment" queue).

This all happens in a single DB transaction — either every step succeeds, or none of it is applied, preventing a state where staff is deactivated but still shown as actively working orders.

---

## Customer Management (`/api/v1/customers`)

All order routes require authentication; behavior branches by `req.user.role`.

| Method | Route | Access | Business Logic |
|---|---|---|---|
| GET | `/` | Admin | List all customers. Supports `ApiFeatures` (filter, search, sort, paginate).. |
| GET | `/:id` | Admin | Get one customer's profile by ID. |
| GET | `/me` | Customer | Get own profile. |
| PATCH | `/me` | Customer | Update own profile (whitelisted fields only). |

Staff (non-admin) never gets a direct customer lookup route — they only see customer info nested inside orders they're actually assigned to, keeping their data access scoped to their actual job.

---

## Products (`/api/v1/products`)

All order routes require authentication; behavior branches by `req.user.role`.

| Method | Route | Access | Business Logic |
|---|---|---|---|
| POST | `/` | Admin | Create a product. |
| GET | `/` | Public/any authenticated role | List products. Non-admins only see `IsDeleted: false` rows; admin sees everything (including soft-deleted, for restore purposes). Supports `ApiFeatures` (filter, search, sort, paginate). |
| GET | `/:id` | Any | Get one product. Non-admins get a 404 if it's soft-deleted. |
| PATCH | `/:id` | Admin | Update product fields. |
| DELETE | `/:id` | Admin | Soft delete (`IsDeleted = true`) — preserves historical order data referencing this product. |
| PATCH | `/:id/restore` | Admin | Reverses a soft delete. |

## Services (`/api/v1/services`)

All order routes require authentication; behavior branches by `req.user.role`.

Same route shape and logic as Products. Includes the system `Delivery` service, auto-attached to any order containing products (see Schema Overview).

---

## Orders (`/api/v1/orders`)

All order routes require authentication; behavior branches by `req.user.role`.

| Method | Route | Access | Business Logic |
|---|---|---|---|
| POST | `/` | Customer | Create an order. See "Order Creation Logic" below. |
| GET | `/` | Customer / Staff / Admin | List orders, scoped by role (see "Role-Based Order Visibility"). Supports `ApiFeatures` (filter, search, sort, paginate). |
| GET | `/:id` | Customer / Staff / Admin | Get one order, same scoping rules as the list endpoint. |
| PATCH | `/:id` | Customer (owner only) | Full replacement update — only while `OrderStatus === 'pending'`. Re-validates products/services, recalculates `TotalCost` server-side, replaces all line items inside a transaction. |
| PATCH | `/:id/cancel` | Customer (owner, only if `pending`, reason required) or Admin (if `pending`/`in-progress`, reason required) | Sets `OrderStatus = 'cancelled'`. The only manual order-status transition in the system. |
| PATCH | `/:id/reopen` | Admin | Reverses a cancellation — only valid from `cancelled`. Reverts to `in-progress` if the order has assigned staff, or `pending` if not. |

### Order Creation Logic (`POST /`)
1. Validate request shape: `products`/`services` must be arrays; each product needs `ProductId` + a positive numeric `Quantity`; each service needs `ServiceId`.
2. Look up all referenced `ProductId`s / `ServiceId`s in the DB — reject if any don't exist (or are soft-deleted).
3. Auto-attach the `Delivery` service if the order contains any products (unless already explicitly included).
4. **Recalculate `TotalCost` entirely server-side** from real `UnitPrice`/`ServiceFee` values — client-submitted prices are never trusted.
5. Inside a transaction: create the `Order`, bulk-create `OrderProduct` rows (with `Quantity`), bulk-create `OrderService` rows (`StaffId: null`, `ServiceStatus: 'pending'`).

### Role-Based Order Visibility (`GET /` and `GET /:id`)
- **Customer:** only their own orders (`CustomerId = req.user.id`, enforced in the `where` clause, not checked after fetching — prevents leaking existence of other customers' orders).
- **Staff:** only orders where they have at least one assigned `orderservice` row (`INNER JOIN` with `StaffId = req.user.id`), and **cancelled orders are excluded** — cancellation is an admin-level decision staff don't need visibility into. Nested `OrderService` data is filtered to their own assignments only, so they can't see who else is working the same order.
- **Admin:** sees everything, full `Customer` details included, full `ApiFeatures` filtering available.

---

## Order-Service Assignment & Status (`/api/v1/orders/:orderId/services`)

| Method | Route | Access | Business Logic |
|---|---|---|---|
| PATCH | `/:orderServiceId/assign` | Admin | Assign a staff member to one specific service line-item. |
| PATCH | `/:orderServiceId/status` | Staff (only if assigned to that row) | Toggle `ServiceStatus` between `in-progress` and `completed`. |

### Assignment Logic (`/assign`)
1. Confirm the order exists and isn't `cancelled`/`completed`.
2. Confirm the `OrderServiceId` actually belongs to `:orderId` (checked in the same query — prevents cross-order ID mismatch/IDOR).
3. Confirm the target staff exists, `IsActive`, and has `Role: 'staff'` (an admin account can't be assigned as a service worker).
4. Confirm the service isn't already `completed`.
5. Set `StaffId`, `ServiceStatus = 'in-progress'`.
6. If this is the order's first-ever assignment, bump the parent `Order.OrderStatus` from `pending` to `in-progress`.

### Status Toggle Logic (`/status`)
- Only the staff member actually assigned to that row (`StaffId === req.user.id`) can change it — not just any staff.
- Only `in-progress ↔ completed` transitions are allowed (never back to `pending` — that only happens via reassignment).
- **On marking `completed`:** re-query *all* `orderservice` siblings for that order fresh from the DB (never trust in-memory/stale associations). If every sibling is now `completed`, set the parent `Order.OrderStatus = 'completed'`.
- **On reverting to `in-progress`:** if the parent order was `completed`, revert it back to `in-progress`, since it's no longer accurate.
- Both directions run inside a transaction — the service-row update and the potential parent-order update must succeed together.

---

## Getting Started

```bash
git clone <repo-url>
cd fantastic-gardens-api
npm install
```

Create a `.env` file:
```env
DB_HOST=your-mysql-host
DB_PORT=your-mysql-port
DB_NAME=your-database-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
```

On startup, the app automatically creates the database (if it doesn't exist) and syncs all tables from the Sequelize models — no manual schema setup required.

```bash
npm run dev
```

## Sample Requests & Responses

### Signup

**POST** `https://fantastic-garden-rest-api-node-js.onrender.com/api/v1/auth/signup`

Request:
\`\`\`json
{
   "CustomerName": "Alamin Hossain",
   "CustomerAddress": "Dhaka",
   "CustomerEmail": "alaminhossain@gmail.com",
   "Password": "1234567890alamin",
   "PhoneNumber": "+8801912781382"
}
\`\`\`

Response:
\`\`\`json
{
    "success": true,
    "message": "Account created successfully. Please log in."
}
\`\`\`

### Login

**POST** `https://fantastic-garden-rest-api-node-js.onrender.com/api/v1/auth/login`

Request:
\`\`\`json
{
    "CustomerEmail": "alaminhossain@gmail.com",
    "Password": "1234567890alamin"
}
\`\`\`

Response:
\`\`\`json
{
    
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NjAwMDEsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4NjEwNzA5NiwiZXhwIjoxNzg2MTkzNDk2fQ.f0nfpQyihWRin02Z53WdXhv2VgdidKsCtpIwfLCji98",
    "data": {
        "CustomerId": 60001,
        "CustomerName": "Alamin Hossain",
        "CustomerAddress": "Dhaka",
        "CustomerEmail": "alaminhossain@gmail.com",
        "PhoneNumber": "+8801912781382"
    }

}
\`\`\`

### Unauthorized Access

**GET** `https://fantastic-garden-rest-api-node-js.onrender.com/api/v1/staffs`(no token)

Response:
\`\`\`json
{
    "success": false,
    "message": "You are not logged in. Please log in"
}
\`\`\`

### Create Order

**POST** `https://fantastic-garden-rest-api-node-js.onrender.com//api/v1/orders`

**Access:** Customer only

**Authorization:**
\`\`\`
Bearer Token:  <customer_jwt_token>
\`\`\`

Request:
\`\`\`json
{
   "products": [
        {"ProductId": 1, "Quantity": 1},
        {"ProductId": 2, "Quantity": 1}
   ],
   "services": [
        {"ServiceId": 2},
        {"ServiceId": 3}
   ]
}
\`\`\`

Response:
\`\`\`json
{
    "status": "success",
    "data": {
        "OrderDate": "2026-08-08T15:56:33.204Z",
        "OrderStatus": "pending",
        "OrderId": 1,
        "CustomerId": 30001,
        "TotalCost": 22350
    }
}
\`\`\`

### Get All Orders - API Features Supported(pagination, search, sort, filter)

**GET** `https://fantastic-garden-rest-api-node-js.onrender.com//api/v1/orders`

**Access:** Customer, Staff, Admin

**Authorization:**
\`\`\`
Bearer Token:  <jwt_token>
\`\`\`

Response:
\`\`\`json
{
    "success": true,
    "results": 1,
    "total": 1,
    "page": 1,
    "limit": 10,
    "data": [
        {
            "OrderId": 1,
            "OrderDate": "2026-08-08T15:56:33.000Z",
            "TotalCost": 22350,
            "OrderStatus": "pending",
            "CancellationReason": null,
            "Customer": {
                "CustomerId": 30001,
                "CustomerName": "John Herring"
            },
            "OrderProducts": [
                {
                    "OrderProductId": 1,
                    "Quantity": 1,
                    "Product": {
                        "ProductId": 1,
                        "ProductName": "Green House",
                        "UnitPrice": 12000
                    }
                },
                {
                    "OrderProductId": 2,
                    "Quantity": 1,
                    "Product": {
                        "ProductId": 2,
                        "ProductName": "Shed",
                        "UnitPrice": 6500
                    }
                }
            ],
            "OrderServices": [
                {
                    "OrderServiceId": 1,
                    "ServiceStatus": "pending",
                    "Service": {
                        "ServiceId": 2,
                        "ServiceName": "Green House Construction",
                        "ServiceFee": 2500
                    },
                    "Staff": null
                },
                {
                    "OrderServiceId": 2,
                    "ServiceStatus": "pending",
                    "Service": {
                        "ServiceId": 3,
                        "ServiceName": "Shed Construction",
                        "ServiceFee": 1200
                    },
                    "Staff": null
                },
                {
                    "OrderServiceId": 3,
                    "ServiceStatus": "pending",
                    "Service": {
                        "ServiceId": 1,
                        "ServiceName": "Delivery",
                        "ServiceFee": 150
                    },
                    "Staff": null
                }
            ]
        }
    ]
}
\`\`\`

## Author

Muhammad Apu Hossain