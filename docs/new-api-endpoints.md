# Backend API Requirements: Server-Side Aggregation Endpoints

## Executive Summary

The frontend is currently fetching paginated data and performing complex calculations client-side. With **3,897 payments** in the database and growing, the current approach of fetching with `limit: 1000` is causing **data accuracy issues** in reports and dashboards.

**Example Bug Found:** Student `s1769615056767_uh7zikhut` (Hafsa) shows as a defaulter with 2 unpaid months (2025-04, 2025-05) in Reports, but has actually paid those months. The payments exist in the database but are outside the first 1000 results returned by the API.

## Current Data Volumes

| Entity | Total Count | Current Limit | Data Loss |
|--------|-------------|---------------|-----------|
| Students | 141 | 1000 | None (OK for now) |
| Payments | **3,897** | 1000 | **~74% data loss** |
| Expenses | 554 | 1000 | None (OK for now) |

## Affected Features

### 1. Dashboard (`/dashboard`)
- **Total Dues calculation** - Incorrect (missing payment history)
- **Today's Collection** - May miss payments
- **Defaulters List** - Showing false positives

### 2. Reports Page (`/reports/*`)
- **Defaulters Report** - Shows students as defaulters who have paid
- **Daily Summary** - Income totals may be incorrect
- **Collections Report** - Transaction counts incomplete
- **Dues by Class** - Aggregations incorrect

### 3. Fee Collection Page (`/fees`)
- **Pending Monthly Students** - Shows students who have actually paid
- **Pending Annual Students** - Same issue
- **Progress Percentage** - Incorrect calculation

---

## Design Principle

**Return only IDs and computed values** - The client already has students, classes, and config data loaded. Endpoints should return student IDs and calculated metrics only. The client will cross-reference with its local data.

---

## Proposed Endpoints

### 1. Dashboard Stats

```
GET /api/stats/dashboard
```

**Response:**
```json
{
  "success": true,
  "result": {
    "activeStudentsCount": 120,
    "totalStudentsCount": 141,
    "todayCollection": 25000,
    "todayTransactionCount": 8,
    "totalOutstandingDues": 450000,
    "newAdmissionsThisMonth": 5,
    "defaultersCount": 45,
    "calculatedAt": "2026-01-29T10:30:00Z"
  }
}
```

---

### 2. Defaulters Report

```
GET /api/reports/defaulters?asOfDate={date}&classId={classId}
```

**Query Parameters:**
| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| asOfDate | YYYY-MM-DD | No | today |
| classId | string | No | all |

**Response:**
```json
{
  "success": true,
  "result": [
    {
      "studentId": "s123",
      "unpaidMonths": ["2025-04", "2025-05"],
      "monthlyDuesAmount": 7000,
      "annualFeeDue": true,
      "totalDuesAmount": 10500,
      "isCurrentlyOverdue": true
    }
  ],
  "summary": {
    "totalDefaulters": 45,
    "totalOutstandingAmount": 450000,
    "overdueCount": 30,
    "annualDueCount": 15
  }
}
```

**Calculation Logic:**
1. For each active student, get months from `admissionDate` to `asOfDate`
2. Find months with no `feeType: "Monthly"` payment matching that `month`
3. Annual due = `asOfDate.month >= config.annualFeeMonth` AND no `feeType: "Annual"` payment this year
4. `isCurrentlyOverdue` = target month is unpaid AND day > `config.monthlyDueDate`
5. `totalDuesAmount` = `(unpaidMonths.length × (monthlyFee - discount)) + (annualFeeDue ? config.annualFee : 0)`

---

### 3. Financial Summary

```
GET /api/reports/financial-summary?startDate={date}&endDate={date}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "income": {
      "total": 500000,
      "byFeeType": {
        "Monthly": 400000,
        "Annual": 50000,
        "Admission": 30000,
        "Other": 20000
      },
      "transactionCount": 150
    },
    "expenses": {
      "total": 120000,
      "byCategory": {
        "Utilities": 30000,
        "Salaries": 80000,
        "Maintenance": 10000
      },
      "transactionCount": 25
    },
    "netBalance": 380000
  }
}
```

---

### 4. Dues by Class

```
GET /api/reports/dues-by-class?asOfDate={date}
```

**Response:**
```json
{
  "success": true,
  "result": [
    {
      "classId": "c1",
      "defaultersCount": 8,
      "totalDuesAmount": 85000
    }
  ],
  "summary": {
    "totalDues": 450000,
    "totalDefaulters": 45
  }
}
```

---

### 5. Pending Fees

```
GET /api/fees/pending?type={monthly|annual}&month={YYYY-MM}&year={YYYY}
```

**Query Parameters:**
| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| type | monthly/annual | Yes | - |
| month | YYYY-MM | No | current month (for monthly) |
| year | YYYY | No | current year (for annual) |
| classId | string | No | all |

**Response:**
```json
{
  "success": true,
  "result": {
    "pendingStudentIds": ["s123", "s456", "s789"],
    "paidStudentIds": ["s111", "s222"]
  },
  "summary": {
    "pendingCount": 35,
    "paidCount": 85,
    "progressPercentage": 71
  }
}
```

---

### 6. Student Payment Status (for a specific year)

```
GET /api/students/{id}/payment-status?year={YYYY}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "year": 2025,
    "paidMonths": {
      "2025-01": { "paymentId": "p1", "amount": 3500, "date": "2025-01-15" },
      "2025-02": { "paymentId": "p2", "amount": 3500, "date": "2025-02-20" }
    },
    "unpaidMonths": ["2025-03", "2025-04"],
    "annualFee": {
      "paid": true,
      "paymentId": "p3",
      "amount": 3500,
      "date": "2025-05-01"
    },
    "totalPaid": 10500,
    "totalDue": 7000
  }
}
```

---

## Implementation Priority

| Priority | Endpoint | Reason |
|----------|----------|--------|
| **P0** | `/api/reports/defaulters` | Fixes false positive defaulters |
| **P0** | `/api/stats/dashboard` | Fixes dashboard totals |
| **P1** | `/api/fees/pending` | Fixes fee collection page |
| **P1** | `/api/reports/financial-summary` | Fixes financial reports |
| **P2** | `/api/reports/dues-by-class` | Improves dues report |
| **P3** | `/api/students/{id}/payment-status` | Nice to have |

---

## Config Values Used in Calculations

```json
{
  "monthlyDueDate": 10,
  "annualFeeMonth": "05",
  "annualFee": 3500
}
```

---

## Business Rules

1. Only `status: "Active"` students appear in defaulter/pending lists
2. Payment matching uses `month` field (YYYY-MM format), not `date`
3. Annual fee: one `feeType: "Annual"` payment per calendar year clears it
4. Monthly due amount = `student.monthlyFee - student.discount`
5. Overdue = unpaid for current month AND current day > `config.monthlyDueDate`
