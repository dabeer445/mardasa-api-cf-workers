# Madrasa API

A comprehensive Madrasa (Islamic school) management API built with Cloudflare Workers, D1 database, and OpenAPI 3.1.

## Features

- **Student Management** - CRUD operations with GR numbers, fee tracking, discounts
- **Teacher & Class Management** - Organize teachers and assign classes
- **Payment Tracking** - Record monthly, admission, annual fees with history
- **Expense Management** - Track madrassa expenses by category
- **Reports** - Daily, weekly, monthly financial reports
- **WhatsApp Notifications** - Automated notifications for payments, enrollments
- **Scheduled Reports** - Cron-based daily/weekly/monthly report delivery

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: [Hono](https://hono.dev/)
- **API Docs**: [chanfana](https://chanfana.pages.dev/) (OpenAPI 3.1)
- **Database**: Cloudflare D1 (SQLite)
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/madrasa-api.git
cd madrasa-api

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login
```

### Configuration

1. Copy the example config:
   ```bash
   cp wrangler.jsonc.example wrangler.jsonc
   ```

2. Update `wrangler.jsonc` with your D1 database ID and WhatsApp API URL

3. Set secrets:
   ```bash
   npx wrangler secret put WHATSAPP_API_KEY
   ```

### Database Setup

```bash
# Create D1 database
npx wrangler d1 create madrasa-db

# Run migrations
npx wrangler d1 execute madrasa-db --file=schema.sql
```

### Development

```bash
# Start local dev server
npx wrangler dev

# Open http://localhost:8787/ for Swagger UI
```

### Deployment

```bash
npx wrangler deploy
```

## API Endpoints

### Students
- `GET /api/students` - List students (with pagination & filters)
- `POST /api/students` - Create student
- `GET /api/students/:id` - Get student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Teachers
- `GET /api/teachers` - List teachers
- `POST /api/teachers` - Create teacher
- `GET /api/teachers/:id` - Get teacher
- `PUT /api/teachers/:id` - Update teacher
- `DELETE /api/teachers/:id` - Delete teacher

### Classes
- `GET /api/classes` - List classes
- `POST /api/classes` - Create class
- `GET /api/classes/:id` - Get class
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Create payment
- `GET /api/payments/:id` - Get payment
- `GET /api/payments/student/:studentId` - Get payments by student
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Expenses
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses/:id` - Get expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Reports
- `GET /api/reports/daily?date=YYYY-MM-DD&send=true` - Daily report
- `GET /api/reports/weekly?endDate=YYYY-MM-DD&send=true` - Weekly report
- `GET /api/reports/monthly?month=YYYY-MM&send=true` - Monthly report

### Notifications
- `POST /api/notifications/send` - Send custom WhatsApp notification

### Config
- `GET /api/config` - Get madrassa config
- `PUT /api/config` - Update config (name, admin phones, fee settings)

### Utility
- `GET /api/state` - Get full application state
- `DELETE /api/clear` - Clear all data (use with caution)

## Scheduled Tasks (Cron)

The API includes scheduled tasks for automated report delivery:

| Schedule | Report | Time (PKT) |
|----------|--------|------------|
| `0 15 * * *` | Daily | 8:00 PM |
| `0 15 * * 6` | Weekly | Saturday 8:00 PM |
| `0 15 1 * *` | Monthly | 1st of month 8:00 PM |

## Event Notifications

Automatic WhatsApp notifications are sent for:

- **Student Created** - Welcome message to parent
- **Payment Received** - Payment confirmation

## Project Structure

```
src/
├── index.ts                 # Main router
├── types.ts                 # Types, schemas, mappers
├── scheduled.ts             # Cron job handler
├── endpoints/
│   ├── teachers/
│   ├── classes/
│   ├── students/
│   ├── payments/
│   ├── expenses/
│   ├── config/
│   ├── state/
│   ├── reports/
│   └── notifications/
└── services/
    ├── whatsapp.ts          # WhatsApp API client
    ├── reports.ts           # Report generation
    └── notifications/       # Event-driven notifications
        ├── index.ts
        ├── events.ts
        └── templates.ts
```

## License

MIT
