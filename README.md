# SaaS Platform - Multi-tenant Business Dashboard

## Quick Start

```bash
# Clone and install
git clone <repo>
npm install

# Start dependencies (PostgreSQL + Redis)
npm run docker:up

# Setup database
npm run db:migrate
npm run db:seed

# Start development
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` in each app and package.

## Architecture

- **Web**: Next.js 14 (App Router) + Tailwind + shadcn/ui
- **API**: Next.js API Routes + Express-style handlers
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: BullMQ + Redis
- **Auth**: JWT + Refresh Tokens + RBAC
- **Multi-tenancy**: Subdomain + X-Tenant-ID header

## Key Features

- Multi-tenant with full data isolation
- RBAC (Owner, Admin, Manager, Staff, Viewer)
- JWT authentication with refresh tokens
- Dashboard with KPIs
- Contacts management API
- Integrations API (WhatsApp, Telegram mocks)
- Campaigns with background queue
- Audit logging
- Settings management
- RTL + Dark mode ready
- Docker compose for local development

## API Endpoints

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new tenant
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `GET /api/contacts/:id` - Get contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `GET /api/integrations` - List integrations
- `POST /api/integrations` - Create integration
- `PUT /api/integrations/:id` - Update integration
- `DELETE /api/integrations/:id` - Delete integration
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/:id/send` - Send campaign
- `GET /api/audit` - Audit logs
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/webhooks` - List webhook endpoints
- `POST /api/webhooks` - Create webhook endpoint

## Deployment

```bash
# Build all packages
npm run build

# Start production
npm run start
```

## License

Private - All rights reserved
