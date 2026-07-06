# Fantastic Gardens API

A RESTful API for a garden business management system, built to demonstrate relational database design and backend architecture using Express.js, Sequelize, and MySQL — a companion project to my MongoDB/Mongoose-based work.

## Tech Stack

- **Runtime:** Node.js, Express.js
- **Database:** MySQL
- **ORM:** Sequelize
- **Auth:** JWT (JSON Web Tokens), bcrypt for password hashing
- **Security:** Helmet, CORS, express-rate-limit (100 req/hour per IP)

## Project Status: In Progress 🚧

- [x] Relational schema design — 7 tables, 2 many-to-many junction tables
- [x] Sequelize models with full associations (one-to-many, many-to-many with extra junction columns)
- [x] Auto database creation (`CREATE DATABASE IF NOT EXISTS`) + `sequelize.sync()` to create tables from models on startup
- [x] Customer self-registration with model-level validation (required fields, email format, phone number format, password length) and automatic password hashing via Sequelize hook
- [x] Centralized error handling — custom `AppError` class, `catchAsync` wrapper for async routes, global error middleware that also formats Sequelize validation errors
- [x] Field whitelisting (`filterBody` utility) to prevent mass-assignment on signup
- [ ] Customer/staff login + JWT issuance
- [ ] Role-based access middleware (admin / staff / customer)
- [ ] Product CRUD
- [ ] Service CRUD
- [ ] Staff CRUD (admin-managed)
- [ ] Order CRUD (creation, staff assignment, status updates, cancellation)

## Schema Overview

- **customer** — customer accounts (name, address, email, hashed password, phone number)
- **staff** — staff/admin accounts (role distinguished by a `Role` column: `admin` or `staff`)
- **product** — garden products for sale
- **service** — garden services offered
- **orders** — customer orders with status tracking (`pending`, `in-progress`, `completed`, `cancelled`) and cancellation reason
- **orderproduct** — junction table (order ↔ product), tracks quantity per line item
- **orderservice** — junction table (order ↔ service), tracks which staff member is assigned to each service

## Planned Roles & Permissions

| Resource | Admin | Staff | Customer |
|---|---|---|---|
| Products | full CRUD | read only | read only |
| Services | full CRUD | read only | read only |
| Staff | full CRUD | read own profile | — |
| Orders | full CRUD, assign staff | read assigned orders, update status | create own orders, read own orders |

## Getting Started

```bash
git clone <repo-url>
cd fantastic-gardens-api
npm install
```

Create a `.env` file in the project root:
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
```

No manual schema setup needed — on first run, the app creates the database (if it doesn't exist) and syncs all tables from the Sequelize models automatically.

```bash
npm run dev
```

## API Endpoints (current)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/v1/auth/signup` | Public | Register a new customer account |

More endpoints are actively being added as development continues.

## Author

Muhammad Apu Hossain
