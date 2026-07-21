# Issue Log Tracker

Project Implementation Issue Tracker — Next.js 16 + PostgreSQL + Prisma 7

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend/Backend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| Database | PostgreSQL 14+ via Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Custom JWT sessions — `jose` + HTTP-only cookies |
| Email | Nodemailer (SMTP, configurable via Admin UI) |
| Export | ExcelJS (xlsx with formatting, multi-sheet grouping) |

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- PostgreSQL 14+

### Setup

```bash
npm install
cp .env.example .env
# Fill in DATABASE_URL and SESSION_SECRET (see Environment Variables below)

npm run db:migrate   # runs prisma migrate dev
npm run db:seed      # seeds admin user + sample data
npm run dev
```

Open http://localhost:3000

**Default admin credentials:**
- Email: `admin@example.com`
- Password: `admin1234`

> Change the password immediately after first login via Config → Users.

### npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (runs `prisma generate` first) |
| `npm run start` | Start production server |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:push` | Push schema changes without migration file |
| `npm run db:seed` | Seed initial data |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

---

## Docker Compose

```bash
cp .env.example .env
# Generate a secret: openssl rand -base64 32

docker compose up -d

# First time only — run migrations and seed:
docker compose exec app npm run db:migrate
docker compose exec app npm run db:seed
```

Services:
- App: http://localhost:3000
- PostgreSQL: `localhost:5432`

---

## Deploy on Ubuntu + PM2 + Nginx

### 1. Server prerequisites

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
sudo apt install -y postgresql postgresql-contrib

sudo -u postgres psql -c "CREATE USER issueuser WITH PASSWORD 'your-password';"
sudo -u postgres psql -c "CREATE DATABASE issuetracker OWNER issueuser;"
```

### 2. Deploy

```bash
git clone <your-repo> ~/Odoo-Issue-Tracker
cd ~/Odoo-Issue-Tracker
cp .env.example .env
nano .env   # fill DATABASE_URL, SESSION_SECRET, NEXT_PUBLIC_BASE_URL

npm ci
npm run db:migrate
npm run build
```

### 3. PM2 (ecosystem.config.js)

```js
module.exports = {
  apps: [{
    name: "issue-tracker",
    script: ".next/standalone/Odoo-Issue-Tracker/server.js",
    env: { PORT: 3001, NODE_ENV: "production" },
  }],
};
```

```bash
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

### 4. Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    ssl_certificate     /etc/ssl/certs/your.crt;
    ssl_certificate_key /etc/ssl/private/your.key;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 5. Redeploy script (`~/issue_deploy.sh`)

```bash
#!/bin/bash
set -e
cd ~/Odoo-Issue-Tracker
git pull origin main
npm run build
pm2 restart issue-tracker
echo "Deploy done!"
```

---

## Environment Variables

Copy `.env.example` and fill in the values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | JWT signing secret — generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_BASE_URL` | Yes (prod) | Public URL, e.g. `https://your-domain.com` — used in email links |
| `UPLOAD_DIR` | No | Absolute path for uploaded files (default: `<cwd>/uploads`) |
| `NODE_ENV` | No | `development` or `production` |

> SMTP settings (host, port, user, password) are configured through the Admin UI at `/config` — no environment variable needed.

---

## Project Structure

```
issue-tracker/
├── app/
│   ├── (auth)/              # Login page
│   ├── (dashboard)/         # All authenticated pages
│   │   ├── issues/          # Issue list, new issue, issue detail
│   │   ├── projects/        # Project list & settings
│   │   ├── users/           # User management
│   │   ├── master-data/     # Global dropdown master data
│   │   └── config/          # System config (app, email, roles)
│   ├── actions/             # Next.js Server Actions (mutations)
│   │   ├── issues.ts        # Issue CRUD, comments, attachments
│   │   ├── projects.ts      # Project CRUD, members, custom fields
│   │   ├── users.ts         # User CRUD
│   │   ├── clients.ts       # Client CRUD
│   │   ├── master.ts        # Dropdown master data
│   │   └── config.ts        # System configuration
│   └── api/                 # API Routes (GET only, file streams)
│       ├── issues/export/   # Excel export
│       ├── uploads/         # Serve uploaded files
│       └── favicon/         # Dynamic favicon from DB config
│
├── components/
│   ├── issues/              # Issue-specific components
│   ├── projects/            # Project dialogs
│   ├── users/               # User dialogs & import
│   ├── clients/             # Client import
│   ├── config/              # Config-page components
│   ├── layout/              # Sidebar, dark mode toggle
│   └── ui/                  # Generic reusable UI components
│
├── lib/
│   ├── db/
│   │   ├── issue-filters.ts # buildIssueWhere() — shared filter builder
│   │   └── dropdowns.ts     # getDropdowns(), getAssigneeUsers()
│   ├── constants.ts         # PAGE_SIZE, MAX_FILE_SIZE, UPLOAD_DIR, role lists
│   ├── types.ts             # Shared TypeScript types (re-exports Prisma enums)
│   ├── utils.ts             # cn(), formatDate(), PRIORITY_COLORS, STATUS_LABELS, etc.
│   ├── permissions.ts       # Role permission matrix + getPermissions()
│   ├── config.ts            # getConfigs() / setConfig() — system config from DB
│   ├── mailer.ts            # sendAssignmentEmail()
│   ├── prisma.ts            # Prisma client singleton
│   └── session.ts           # JWT createSession / getSession / deleteSession
│
└── prisma/
    ├── schema.prisma        # Database schema
    └── seed.ts              # Initial data seeder
```

### Key patterns

- **Server Actions** (`app/actions/`) handle all mutations — no separate REST endpoints for writes.
- **Shared query builders** live in `lib/db/` so filter logic is never duplicated between the list page and export API.
- **Constants** (`lib/constants.ts`) is the single source of truth for magic numbers and role lists.
- **Permissions** are checked inside every Server Action before touching the database.

---

## Role System

### System roles (built-in)

| Role | Can see all projects | Can manage projects | Can manage users | Can access config |
|------|:------------------:|:------------------:|:----------------:|:-----------------:|
| `admin` | Yes | Yes | Yes | Yes |
| `pm` | Yes | Yes | No | No |
| `member` | No (assigned only) | No | No | No |
| `rnao` | No | No | No | No |
| `co` | No | No | No | No |
| `gl` | No | No | No | No |

Custom roles can be created via **Config → Roles** with any combination of the 9 permission flags.

### Extra roles (assignee types)

Users can carry an `extraRoles` array alongside their system role:

| Extra Role | Meaning |
|------------|---------|
| `aspd` | ASPD team — shown as `(ASPD)` in assignee dropdowns |
| `vendor` | External vendor — shown as `(Vendor)` in assignee dropdowns |

Only users with `extraRoles` containing `aspd` or `vendor` appear in the **Assign To** dropdown when creating or editing issues.

---

## Features

- Issue tracking with custom fields per project
- Role-based access control (project-scoped for non-admin roles)
- Inline status / priority / assignee / due-date editing in the issue list
- Activity log per issue (status changes, reassignments, comments)
- Email notification on issue assignment (configurable SMTP)
- Excel export with filters + group-by (separate sheet per group)
- CSV/Excel import for users and clients
- Dark mode
- Load-tested to 200 concurrent users (k6, p95 < 200ms)
