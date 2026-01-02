# CFO Command Center - Application Structure

## 🏗️ Application Architecture Overview

```
MyGlobalCFO Enterprise CFO Platform
│
├── 🏠 Landing Page (/)
│   ├── Hero Section
│   ├── Feature Showcase
│   ├── Login Form
│   └── Signup Form
│
└── 📊 Main Dashboard (/dashboard/*)
    │
    ├── 🎛️ Global Features (Available on All Pages)
    │   ├── Mock Data Toggle Switch
    │   ├── Entity/Company Selector
    │   ├── User Profile Menu
    │   └── Navigation Sidebar
    │
    ├── 1️⃣ TRANSACTIONS (/dashboard/transactions)
    │   ├── Transaction Table
    │   │   ├── Sortable Columns (Date, Amount)
    │   │   ├── 7 Filter Columns
    │   │   └── Status Badges
    │   └── Actions
    │       ├── Clear Filters
    │       ├── Generate Demo Data
    │       └── Clear All Data
    │
    ├── 2️⃣ RECONCILIATION (/dashboard/reconciliation)
    │   ├── Status Dashboard
    │   │   ├── Matched Count
    │   │   ├── Pending Count
    │   │   └── Unmatched Count
    │   └── Auto-Reconcile Button
    │
    ├── 3️⃣ ENTITY KPIs (/dashboard/entity-kpis)
    │   ├── Group Summary Card
    │   │   ├── Total Revenue
    │   │   ├── Total EBITDA
    │   │   ├── Group Margin
    │   │   └── Total Cash
    │   └── Entity Cards (per company)
    │       ├── Revenue
    │       ├── EBITDA & Margin
    │       ├── Revenue Growth
    │       ├── Cash Balance
    │       ├── Runway (days)
    │       ├── Burn Rate
    │       └── Quick Ratio
    │
    ├── 4️⃣ REPORTS (/dashboard/reports)
    │   ├── AR Aging Analysis
    │   │   ├── Current (0-30 days)
    │   │   ├── 30 Days (30-60)
    │   │   ├── 60 Days (60-90)
    │   │   └── 90+ Days
    │   └── Cost Center Breakdown
    │       └── Top Cost Centers List
    │
    ├── 5️⃣ INTEGRATIONS (/dashboard/integrations)
    │   ├── Tab 1: ERP Integrations
    │   │   ├── Platform Cards (14 total)
    │   │   │   ├── Enterprise (5)
    │   │   │   │   ├── NetSuite
    │   │   │   │   ├── MS Dynamics 365 Finance
    │   │   │   │   ├── MS Dynamics 365 BC
    │   │   │   │   ├── SAP S/4HANA
    │   │   │   │   └── Workday Finance
    │   │   │   └── SMB (9)
    │   │   │       ├── Xero ✅
    │   │   │       ├── QuickBooks ✅
    │   │   │       ├── Sage ✅
    │   │   │       ├── Zoho Books
    │   │   │       ├── FreeAgent
    │   │   │       ├── FreshBooks
    │   │   │       ├── Clear Books
    │   │   │       ├── Crunch
    │   │   │       └── KashFlow
    │   │   └── Filter Tabs (All/Enterprise/SMB)
    │   └── Tab 2: Other Integrations
    │       ├── Gmail (OAuth2)
    │       ├── Outlook (OAuth2)
    │       └── TrueLayer (Banking)
    │
    ├── 6️⃣ FINANCE SOURCING (/dashboard/finance-sourcing)
    │   ├── AI Finance Recommendations
    │   ├── Finance Option Cards
    │   │   ├── Type Badge
    │   │   ├── Provider Name
    │   │   ├── Interest Rate
    │   │   ├── Amount Range
    │   │   ├── Eligibility
    │   │   └── Source Link
    │   └── Search Options Button
    │
    ├── 7️⃣ AI ADVISOR (/dashboard/ai-advisor)
    │   ├── Chat Interface (iframe)
    │   ├── Session Management
    │   ├── Entity Selector
    │   ├── Suggested Questions
    │   ├── Voice Input (Speech Recognition)
    │   └── Message History
    │
    ├── 8️⃣ FP&A MODULE (/dashboard/fpa/*)
    │   │
    │   ├── FP&A Navigation Bar
    │   │   ├── Overview
    │   │   ├── Planning
    │   │   ├── Drivers
    │   │   ├── Setup Integrations
    │   │   ├── Scenarios
    │   │   ├── Rolling Forecast
    │   │   └── Permissions
    │   │
    │   ├── 8a. OVERVIEW (/dashboard/fpa/overview)
    │   │   ├── Quick Stats Cards (4)
    │   │   │   ├── Planning Dimensions
    │   │   │   ├── Planning Versions
    │   │   │   ├── Drivers & Formulas
    │   │   │   └── Integrations
    │   │   ├── Recent Versions List
    │   │   ├── Quick Actions Panel
    │   │   └── Feature Highlights (3 cards)
    │   │
    │   ├── 8b. PLANNING (/dashboard/fpa/planning)
    │   │   ├── Version Selector
    │   │   ├── Create Version Dialog
    │   │   │   ├── Name Input
    │   │   │   ├── Type (Budget/Forecast/Actuals/Scenario)
    │   │   │   ├── Fiscal Year
    │   │   │   ├── Start/End Period
    │   │   │   ├── Rolling Toggle
    │   │   │   └── Rolling Months
    │   │   ├── Planning Grid
    │   │   │   ├── Filter Bar (4 filters)
    │   │   │   └── Data Entry Cells
    │   │   ├── AI Features
    │   │   │   ├── AI Forecast Button
    │   │   │   └── AI Insights Button
    │   │   └── Actions
    │   │       ├── Lock/Unlock Version
    │   │       └── Driver Values Manager
    │   │
    │   ├── 8c. DRIVERS (/dashboard/fpa/drivers)
    │   │   ├── Driver Library
    │   │   ├── Create Driver Form
    │   │   ├── Formula Editor
    │   │   └── Driver Linking
    │   │
    │   ├── 8d. SETUP INTEGRATIONS (/dashboard/fpa/setup-integrations)
    │   │   ├── Available Integrations
    │   │   ├── Connection Status
    │   │   └── Configure Sync
    │   │
    │   ├── 8e. SCENARIO PLANNING (/dashboard/fpa/scenario-planning)
    │   │   ├── Scenario List
    │   │   ├── Create Scenario
    │   │   ├── What-If Modeling
    │   │   ├── Scenario Comparison
    │   │   └── Sensitivity Analysis
    │   │
    │   ├── 8f. ROLLING FORECAST (/dashboard/fpa/rolling-forecast)
    │   │   ├── Forecast Configuration
    │   │   ├── Rolling Window (12-18 months)
    │   │   ├── Actuals Integration
    │   │   └── Forecast vs Actuals
    │   │
    │   ├── 8g. USER PERMISSIONS (/dashboard/fpa/user-permissions)
    │   │   ├── User List
    │   │   ├── Role Assignment
    │   │   ├── Dimension Access Control
    │   │   └── Version Permissions
    │   │
    │   └── 8h. CFO COMMAND CENTER (/dashboard/fpa/command-center)
    │       ├── Header
    │       ├── AI Executive Summary
    │       ├── Anomaly Alerts
    │       ├── Global Liquidity Strip
    │       └── 4 Strategic Quadrants
    │           ├── Q1: Profitability & Unit Economics
    │           ├── Q2: Operational Efficiency
    │           ├── Q3: Strategic What-If
    │           └── Q4: Sync Status
    │
    └── 9️⃣ SETTINGS (/dashboard/settings)
        ├── Main Menu
        ├── Color Customization
        │   ├── Primary Color Picker
        │   ├── Secondary Color Picker
        │   ├── Background Color Picker
        │   └── Text Color Picker
        ├── KPI Configuration
        │   ├── Enable/Disable KPIs
        │   └── Reorder KPIs
        ├── Dashboard Layout
        ├── Entity Groups Management
        │   ├── Create Group
        │   ├── Edit Group
        │   └── Delete Group
        ├── Company Management
        │   ├── Add Company
        │   │   ├── Name
        │   │   ├── Country
        │   │   ├── Currency
        │   │   ├── Type (Standalone/TopCo/Subsidiary)
        │   │   └── Parent Company
        │   └── Entity List
        └── AI Advisor Settings (Admin)
            ├── Global Enable/Disable
            └── User Authorization
```

---

## 🎯 Feature Distribution by Section

| Section | Pages | Sub-Features | Complexity |
|---------|-------|--------------|------------|
| Transactions | 1 | 7 filters, sorting, actions | Medium |
| Reconciliation | 1 | 3 status types, auto-match | Medium |
| Entity KPIs | 1 | 8 metrics per entity | High |
| Reports | 1 | 2 report types | Low |
| Integrations | 2 | 14 ERPs, 3 other services | High |
| Finance Sourcing | 1 | AI recommendations | Medium |
| AI Advisor | 1 | Chat, voice, sessions | High |
| FP&A Module | 8 | 7-D planning, AI, scenarios | Very High |
| Settings | 7 | Customization, permissions | Medium |

**Total**: 24 unique pages across 9 main sections

---

## 🔗 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Pages → Components → UI Library (Shadcn)            │   │
│  │    ↓         ↓                    ↓                   │   │
│  │  State Management (Context + localStorage)           │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST (Axios)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes → Services → Business Logic              │   │
│  │    ↓           ↓              ↓                       │   │
│  │  Authentication (JWT) → Authorization (Roles)        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ Motor (Async)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database (MongoDB)                         │
│  Collections: users, companies, transactions,                │
│  integrations, planning_versions, entity_groups, etc.        │
└─────────────────────────────────────────────────────────────┘
                           ↑
                           │ OAuth2/REST APIs
                           │
┌─────────────────────────────────────────────────────────────┐
│               External Integrations (14 ERPs)                 │
│  Xero, QuickBooks, NetSuite, Dynamics, SAP, etc.            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Component Hierarchy

### Core Components
- `DashboardLayout.jsx` - Main layout wrapper
  - Header (Mock toggle, entity selector, user menu)
  - Sidebar Navigation
  - Main Content Area (Outlet for child routes)

### Page Components (35+ total)
- Transaction Pages (1)
- Reconciliation Pages (1)
- Reports Pages (1)
- Integration Pages (2)
- FP&A Pages (8)
- Settings Pages (1 + subpages)
- AI Advisor (1)

### Reusable UI Components (50+)
- Button, Card, Badge, Input, Select
- Dialog, AlertDialog
- Tabs, Table
- ColorPicker, MonthYearPicker
- Charts (via Recharts)
- CurrencySelector
- EntityDetailsDialog
- DriverValuesManager

---

## 🔐 Permission Model

```
User
├── Role: Admin
│   ├── Access: All Features
│   ├── Can: Manage users, configure AI Advisor
│   └── View: All entities
│
└── Role: Tenant
    ├── Access: Based on entity assignment
    ├── Can: View assigned entities
    └── Restrictions: No admin settings
```

### FP&A Specific Permissions
- Version-level access (Read/Write/Admin)
- Dimension-level permissions
- Entity-specific data access

---

## 📊 Data Model Summary

### Primary Collections
1. **users** - User accounts and authentication
2. **companies** - Legal entities and hierarchies
3. **transactions** - Financial transactions
4. **integrations** - Legacy integration data
5. **integration_connections** - OAuth connections
6. **planning_versions** - FP&A budgets and forecasts
7. **planning_data** - Actual planning values
8. **drivers** - Formula-based drivers
9. **entity_groups** - Custom entity groupings
10. **chat_sessions** - AI Advisor conversations
11. **user_preferences** - UI customization settings

### Dimensional Tables (FP&A)
- **dimensions_entities**
- **dimensions_departments**
- **dimensions_accounts**
- **dimensions_products**
- **dimensions_customer_segments**
- **dimensions_geographies**
- **dimensions_time_periods**

---

## 🚀 Technology Stack

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **UI Library**: Shadcn UI (Radix UI + Tailwind)
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Charts**: Recharts
- **State**: Context API + localStorage
- **Forms**: React Hook Form
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI
- **Database**: MongoDB
- **DB Driver**: Motor (async)
- **Authentication**: JWT + bcrypt
- **Validation**: Pydantic
- **OAuth2**: Custom implementation
- **CORS**: Starlette middleware

### Integrations
- **Email**: Gmail/Outlook OAuth2
- **Banking**: TrueLayer
- **ERPs**: 14 platforms via OAuth2/API
- **AI**: GPT-5 (OpenAI)
- **Speech**: Web Speech API

---

## 📈 Feature Maturity Matrix

| Feature Category | Status | Notes |
|-----------------|--------|-------|
| Authentication | ✅ Complete | JWT, bcrypt, sessions |
| Multi-Entity | ✅ Complete | Hierarchy, groups, consolidation |
| Transactions | ✅ Complete | CRUD, filtering, reconciliation |
| ERP Integrations | 🟡 Partial | 3 working, 11 scaffolded |
| AI Advisor | ✅ Complete | Chat, voice, sessions |
| FP&A Planning | ✅ Complete | 7-D model, versions, drivers |
| Reporting | 🟡 Partial | 2 reports, expandable |
| Settings | ✅ Complete | Full customization |
| Permissions | ✅ Complete | Role-based access |

Legend:
- ✅ Complete: Fully functional
- 🟡 Partial: Core working, extensions needed
- 🔴 Planned: Not yet implemented

---

*Application Structure documented as of January 2, 2026*
