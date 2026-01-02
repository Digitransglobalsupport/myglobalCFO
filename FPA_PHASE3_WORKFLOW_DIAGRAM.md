# Driver-Based Modeling - Workflow Diagrams

Visual guide to understanding Phase 3 workflows

---

## Complete Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DRIVER-BASED MODELING                    │
│                         WORKFLOW                            │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│   STEP 1:    │
│   Create     │──────┐
│   Drivers    │      │
└──────────────┘      │
        │             │
        ▼             │
┌──────────────┐      │
│  Define key  │      │
│  operational │      │
│  metrics     │      │
└──────────────┘      │
                      │
┌──────────────┐      │
│   STEP 2:    │      │
│   Create     │◄─────┘
│   Formulas   │
└──────────────┘
        │
        ▼
┌──────────────┐
│  Link drivers│
│  to financial│
│  accounts    │
└──────────────┘
        │
        ▼
┌──────────────┐
│   STEP 3:    │
│   Enter      │
│   Values     │
└──────────────┘
        │
        ▼
┌──────────────┐
│  Input driver│
│  values for  │
│  time period │
└──────────────┘
        │
        ▼
┌──────────────┐
│ AUTO-MAGIC!  │
│  System      │
│  Calculates  │
└──────────────┘
        │
        ▼
┌──────────────┐
│   STEP 4:    │
│   Review     │
│   Results    │
└──────────────┘
        │
        ▼
┌──────────────┐
│  View auto-  │
│  calculated  │
│  financial   │
│  data        │
└──────────────┘
```

---

## Workflow 1: Creating Operational Drivers

```
START
  │
  ▼
┌──────────────────────┐
│ Navigate to FP&A     │
│ → Drivers Page       │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Click "New Driver"   │
│ Button               │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Fill Driver Details: │
│ • Name               │
│ • Code (uppercase)   │
│ • Type               │
│ • Unit               │
│ • Description        │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Click "Create"       │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ ✅ Success!          │
│ Driver appears       │
│ in list              │
└──────────────────────┘
  │
  ▼
END
```

### Driver Types Decision Tree

```
What type of metric?
        │
        ├─── Counting employees? ───────► HEADCOUNT (Blue)
        │
        ├─── Counting items/sales? ─────► UNITS (Green)
        │
        ├─── Money values? ─────────────► CURRENCY (Orange)
        │
        ├─── Rates/Ratios? ─────────────► PERCENTAGE (Purple)
        │
        └─── Something else? ────────────► CUSTOM (Gray)
```

---

## Workflow 2: Creating Formulas

```
START
  │
  ▼
┌──────────────────────┐
│ Navigate to          │
│ Formulas Tab         │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Click "New Formula"  │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Enter Formula Name   │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Select Target        │
│ Account              │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Write Expression     │
│ (use driver codes)   │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ List Dependencies    │
│ (comma-separated)    │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Click "Validate"     │
└──────────────────────┘
  │
  ├─── Valid? ──► YES ─────┐
  │                        │
  └─── NO ──┐              │
            │              │
            ▼              │
    ┌──────────────┐       │
    │ Fix Errors   │       │
    │ & Retry      │       │
    └──────────────┘       │
            │              │
            └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │ Click        │
            │ "Create"     │
            └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │ ✅ Success!  │
            │ Formula      │
            │ is active    │
            └──────────────┘
                    │
                    ▼
                   END
```

### Formula Validation Logic

```
Validation Process:
        │
        ├─► Check syntax ────────────► Valid operators?
        │                              └─► + - * / () ?
        │
        ├─► Check dependencies ──────► All drivers listed?
        │                              └─► Match expression?
        │
        ├─► Test evaluation ─────────► Can compute?
        │                              └─► Use dummy values
        │
        └─► Security check ───────────► No forbidden code?
                                       └─► No import/exec?
```

---

## Workflow 3: Entering Driver Values

```
START
  │
  ▼
┌──────────────────────┐
│ Navigate to          │
│ Planning Page        │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Select Planning      │
│ Version              │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Select Time Period   │
│ (YYYY-MM)            │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Driver Values        │
│ Section Appears      │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ Enter Value for      │
│ Each Driver          │
└──────────────────────┘
  │
  ▼
┌──────────────────────┐
│ "Modified" Badge     │
│ Appears              │
└──────────────────────┘
  │
  ├─── Save Individual ──► Click Save button per driver
  │
  └─── Save All ─────────► Click "Save All" button
            │
            ▼
    ┌──────────────┐
    │ Values Saved │
    │ to Database  │
    └──────────────┘
            │
            ▼
    ┌──────────────┐
    │ 🔄 Auto-     │
    │ Calculation  │
    │ Triggered!   │
    └──────────────┘
            │
            ▼
    ┌──────────────┐
    │ Planning     │
    │ Data Updates │
    └──────────────┘
            │
            ▼
    ┌──────────────┐
    │ ✅ Success!  │
    │ View Results │
    └──────────────┘
            │
            ▼
           END
```

---

## Auto-Calculation Engine Flow

```
┌─────────────────────────────────────────────────┐
│         AUTOMATIC CALCULATION ENGINE            │
└─────────────────────────────────────────────────┘

User Saves Driver Value
        │
        ▼
┌────────────────────┐
│ Store in Database  │
│ (driver_values)    │
└────────────────────┘
        │
        ▼
┌────────────────────┐
│ Find Dependent     │
│ Formulas           │
└────────────────────┘
        │
        ▼
    For Each Formula:
        │
        ├─► ┌──────────────────┐
        │   │ Get All Driver   │
        │   │ Values Needed    │
        │   └──────────────────┘
        │           │
        │           ▼
        │   ┌──────────────────┐
        │   │ All Values       │
        │   │ Available?       │
        │   └──────────────────┘
        │       │        │
        │       YES      NO ──► Skip (can't calculate)
        │       │
        │       ▼
        │   ┌──────────────────┐
        │   │ Evaluate         │
        │   │ Expression       │
        │   └──────────────────┘
        │       │
        │       ▼
        │   ┌──────────────────┐
        │   │ Save Result      │
        │   │ to planning_data │
        │   └──────────────────┘
        │       │
        └───────┘
            │
            ▼
    ┌────────────────────┐
    │ Notify Frontend    │
    │ (Success)          │
    └────────────────────┘
```

---

## Data Flow Diagram

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  DRIVER  │────────►│ FORMULA  │────────►│ ACCOUNT  │
│  VALUES  │         │  ENGINE  │         │  VALUES  │
└──────────┘         └──────────┘         └──────────┘
     │                     │                     │
     │                     │                     │
     ▼                     ▼                     ▼
┌──────────┐         ┌──────────┐         ┌──────────┐
│  MongoDB │         │  Python  │         │  MongoDB │
│  driver_ │         │  Calc    │         │ planning_│
│  values  │         │  Engine  │         │  data    │
└──────────┘         └──────────┘         └──────────┘

Example Flow:
────────────
UNITS_SOLD = 1000 ───┐
                     ├──► UNITS_SOLD * AVG_PRICE ──► REVENUE = $50,000
AVG_PRICE = 50 ──────┘
```

---

## Decision Tree: When to Use What

```
What do you want to do?
        │
        ├─── Define a new metric ──────────────► Create Driver
        │
        ├─── Calculate account automatically ──► Create Formula
        │
        ├─── Enter monthly/period data ────────► Enter Driver Values
        │
        ├─── View calculated results ──────────► Check Planning Data
        │
        └─── Understand how it works ──────────► Read User Manual
```

---

## Error Prevention Flowchart

```
Before Creating Formula:
        │
        ├─► All drivers exist? ──NO──► Create drivers first
        │           │
        │          YES
        │           │
        ├─► Codes match exactly? ──NO──► Fix spelling/case
        │           │
        │          YES
        │           │
        ├─► Valid syntax? ──NO──► Check operators/parentheses
        │           │
        │          YES
        │           │
        ├─► Validation passes? ──NO──► Review error messages
        │           │
        │          YES
        │           │
        └─► ✅ Safe to create formula!
```

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  React Components                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Drivers  │  │ Formulas │  │ Planning │             │
│  │ Page     │  │ Page     │  │ Page     │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│       │              │              │                   │
│       └──────────────┴──────────────┘                  │
│                      │                                  │
└──────────────────────┼──────────────────────────────────┘
                       │ HTTP/REST API
┌──────────────────────┼──────────────────────────────────┐
│                      ▼                                  │
│                  BACKEND                                │
│  FastAPI Routes                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Drivers  │  │ Formulas │  │ Values   │             │
│  │ API      │  │ API      │  │ API      │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│       │              │              │                   │
│       └──────────────┴──────────────┘                  │
│                      │                                  │
│                      ▼                                  │
│           ┌────────────────────┐                        │
│           │ Calculation Engine │                        │
│           └────────────────────┘                        │
│                      │                                  │
└──────────────────────┼──────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────┐
│                      ▼                                  │
│                   DATABASE                              │
│  MongoDB Collections                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ drivers  │  │ formulas │  │ driver_  │             │
│  │          │  │          │  │ values   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                    │                    │
│                              ┌──────────┐               │
│                              │ planning_│               │
│                              │ data     │               │
│                              └──────────┘               │
└─────────────────────────────────────────────────────────┘
```

---

## User Journey Map

```
USER GOAL: Calculate revenue automatically
        │
        ▼
┌───────────────────┐
│ PHASE 1: SETUP    │
│ Duration: 5 min   │
└───────────────────┘
        │
        ├─► Create "UNITS_SOLD" driver
        ├─► Create "AVG_PRICE" driver
        └─► Create "Revenue" formula
        │
        ▼
┌───────────────────┐
│ PHASE 2: INPUT    │
│ Duration: 2 min   │
└───────────────────┘
        │
        ├─► Navigate to Planning
        ├─► Select version & period
        ├─► Enter: UNITS_SOLD = 1000
        ├─► Enter: AVG_PRICE = 50
        └─► Click "Save All"
        │
        ▼
┌───────────────────┐
│ PHASE 3: RESULT   │
│ Duration: 30 sec  │
└───────────────────┘
        │
        └─► View: Revenue = $50,000 ✅
        │
        ▼
┌───────────────────┐
│ 🎉 SUCCESS!       │
│ Auto-calculation  │
│ working perfectly │
└───────────────────┘
```

---

## Quick Reference: Formula Complexity

```
SIMPLE (Recommended for Beginners)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A * B
A + B - C
UNITS * PRICE

MODERATE (Common Use Cases)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(A + B) * C
A * B * (1 + C / 100)
HEADCOUNT * SALARY / 12

ADVANCED (Complex Scenarios)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(A * B) + (C * D) - E
A * B * (1 + C / 100) / 12
max(A * B, MIN_VALUE)
```

---

*Use these diagrams as quick visual references when learning or teaching driver-based modeling!*
