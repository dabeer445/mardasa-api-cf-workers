# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start local dev server at http://localhost:8787 (Swagger UI at root)
npm run deploy           # Deploy to Cloudflare Workers
npm run cf-typegen       # Regenerate TypeScript types for Cloudflare bindings
npm run db:migrate       # Run database migrations on remote D1
npm run db:migrate:local # Run database migrations on local D1
```

## Architecture

This is a **MadrasaCRM** backend API using Cloudflare Workers with D1 database, **Hono** as the web framework, and **chanfana** for OpenAPI 3.1 schema generation.

### Key Patterns

- **Router**: [src/index.ts](src/index.ts) - Hono app wrapped with chanfana's `fromHono()` for automatic OpenAPI docs
- **Endpoints**: Each endpoint is a class extending `OpenAPIRoute` in `src/endpoints/`. The class defines a `schema` object (tags, summary, request/response schemas using Zod) and a `handle()` method for the logic
- **Types**: [src/types.ts](src/types.ts) - Shared Zod schemas, mapper functions, and the `AppContext` type
- **Database Schema**: [schema.sql](schema.sql) - D1 database tables for teachers, classes, students, payments, expenses, and config
- **Database**: D1 (Cloudflare SQL) bound as `DB` - access via `c.env.DB` in handlers

### API Resources

| Resource | Endpoints |
|----------|-----------|
| State | `GET /api/state` - Full application state |
| Teachers | CRUD at `/api/teachers` |
| Classes | CRUD at `/api/classes` |
| Students | CRUD at `/api/students` |
| Payments | CRUD at `/api/payments`, plus `GET /api/payments/student/:studentId` |
| Expenses | CRUD at `/api/expenses` |
| Config | `GET/PUT /api/config` |
| Utility | `DELETE /api/clear` - Clear all data |

### Adding New Endpoints

1. Create a class in `src/endpoints/` extending `OpenAPIRoute`
2. Define `schema` with request/response validation using Zod
3. Implement `async handle(c: AppContext)` with the endpoint logic
4. Register the route in `src/index.ts` via `openapi.get/post/put/delete()`
