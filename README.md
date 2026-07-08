# Issue Log Tracker

Project Implementation Issue Tracker — Next.js 16 + PostgreSQL + Prisma 7

## Tech Stack
- **Frontend/Backend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Database**: PostgreSQL + Prisma 7 (Driver Adapter: `@prisma/adapter-pg`)
- **Auth**: Custom JWT sessions via `jose` + HTTP-only cookies
- **Excel Export**: ExcelJS

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- PostgreSQL 14+

### Setup
```bash
cd issue-tracker
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and SESSION_SECRET

npx prisma migrate dev --name init
npx tsx prisma/seed.ts
npm run dev
```

Open http://localhost:3000

**Admin credentials:**
- Email: `admin@example.com`
- Password: `admin1234`

---

## Docker Compose (Recommended)

```bash
cp .env.example .env
# openssl rand -base64 32  -> paste into SESSION_SECRET in .env

docker compose up -d

# First time only:
docker compose exec app npx prisma migrate deploy
docker compose exec app npx tsx prisma/seed.ts
```

Services:
- App: http://localhost:3000
- PostgreSQL: localhost:5432

---

## Deploy on Ubuntu + PM2 + Nginx

### 1. Server Setup
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER issueuser WITH PASSWORD 'your-password';"
sudo -u postgres psql -c "CREATE DATABASE issuetracker OWNER issueuser;"
sudo -u postgres psql -c "ALTER USER issueuser CREATEDB;"
```

### 2. Deploy App
```bash
git clone <your-repo> /var/www/issue-tracker
cd /var/www/issue-tracker
cp .env.example .env
nano .env  # Fill DATABASE_URL and SESSION_SECRET

npm ci --legacy-peer-deps
npx prisma migrate deploy
npx prisma generate
npm run build
```

### 3. PM2 Start
```bash
pm2 start npm --name "issue-tracker" -- start
pm2 save && pm2 startup
```

### 4. Nginx Config
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Features

### User Roles
| Role | Access |
|------|--------|
| `admin` | All projects, user management, project settings |
| `pm` | All projects, project settings |
| `member` | Assigned projects only |

### Issue Fields
Standard fields: ID, Title, Client, Department, Issue Type, Module, Priority, Status, Solution, Created By, Logged By, Assignee, Modified By, Date Reported, Created, Modified, Last Modified

Custom Fields: Admin/PM can add custom fields per project (text, number, date, select, multiselect, boolean, url, textarea)

### Excel Export
- Exports filtered/grouped issues
- All standard + custom columns
- Header styling, frozen row, auto column width
- Filename: `issue-log_{PROJECT-CODE}_{YYYYMMDD}.xlsx`
- Group-by creates separate sheets per group

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | JWT signing secret (`openssl rand -base64 32`) |
