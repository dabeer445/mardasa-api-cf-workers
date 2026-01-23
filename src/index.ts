import { fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { TeacherList, TeacherCreate, TeacherFetch, TeacherUpdate, TeacherDelete } from "./endpoints/teachers";
import { ClassList, ClassCreate, ClassFetch, ClassUpdate, ClassDelete } from "./endpoints/classes";
import { StudentList, StudentCreate, StudentFetch, StudentUpdate, StudentDelete } from "./endpoints/students";
import { PaymentList, PaymentCreate, PaymentFetch, PaymentsByStudent, PaymentUpdate, PaymentDelete } from "./endpoints/payments";
import { ExpenseList, ExpenseCreate, ExpenseFetch, ExpenseUpdate, ExpenseDelete } from "./endpoints/expenses";
import { ConfigFetch, ConfigUpdate } from "./endpoints/config";
import { StateFetch, ClearAll } from "./endpoints/state";
import { DailyReport, WeeklyReport, MonthlyReport } from "./endpoints/reports";
import { NotificationSend } from "./endpoints/notifications";
import { scheduled } from "./scheduled";

import type { Env } from "./types";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use("/*", cors());

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
});

// State endpoint
openapi.get("/api/state", StateFetch);

// Teacher routes
openapi.get("/api/teachers", TeacherList);
openapi.post("/api/teachers", TeacherCreate);
openapi.get("/api/teachers/:id", TeacherFetch);
openapi.put("/api/teachers/:id", TeacherUpdate);
openapi.delete("/api/teachers/:id", TeacherDelete);

// Class routes
openapi.get("/api/classes", ClassList);
openapi.post("/api/classes", ClassCreate);
openapi.get("/api/classes/:id", ClassFetch);
openapi.put("/api/classes/:id", ClassUpdate);
openapi.delete("/api/classes/:id", ClassDelete);

// Student routes
openapi.get("/api/students", StudentList);
openapi.post("/api/students", StudentCreate);
openapi.get("/api/students/:id", StudentFetch);
openapi.put("/api/students/:id", StudentUpdate);
openapi.delete("/api/students/:id", StudentDelete);

// Payment routes
openapi.get("/api/payments", PaymentList);
openapi.post("/api/payments", PaymentCreate);
openapi.get("/api/payments/student/:studentId", PaymentsByStudent);
openapi.get("/api/payments/:id", PaymentFetch);
openapi.put("/api/payments/:id", PaymentUpdate);
openapi.delete("/api/payments/:id", PaymentDelete);

// Expense routes
openapi.get("/api/expenses", ExpenseList);
openapi.post("/api/expenses", ExpenseCreate);
openapi.get("/api/expenses/:id", ExpenseFetch);
openapi.put("/api/expenses/:id", ExpenseUpdate);
openapi.delete("/api/expenses/:id", ExpenseDelete);

// Config routes
openapi.get("/api/config", ConfigFetch);
openapi.put("/api/config", ConfigUpdate);

// Report routes
openapi.get("/api/reports/daily", DailyReport);
openapi.get("/api/reports/weekly", WeeklyReport);
openapi.get("/api/reports/monthly", MonthlyReport);

// Notification routes
openapi.post("/api/notifications/send", NotificationSend);

// Utility routes
openapi.delete("/api/clear", ClearAll);

// Export the Hono app and scheduled handler
export default {
  fetch: app.fetch,
  scheduled,
};
