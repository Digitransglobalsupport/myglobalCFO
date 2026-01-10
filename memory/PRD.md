# MyGlobalCFO - Product Requirements Document

## Original Problem Statement
Enterprise CFO Agent platform that automates finance operations, reconciliations, and reporting across multi-entity organizations with multi-currency support.

### Feature Requests (Completed ✅)
1. **Database Portability & Documentation** ✅ - Generated migration/seed files for currencies and countries
2. **Multi-Country & Entity Standardization** ✅ - Global Entity Registry with standardized country names
3. **Multi-Currency Engine** ✅ - Full currency array with symbols, transaction/reporting currency support
4. **Command Center Integration** ✅ - Dynamic currency symbols across all quadrants
5. **FP&A Planning Versions CRUD** ✅ - Full backend APIs with lock/copy features
6. **FP&A Drivers CRUD** ✅ - Full backend APIs with duplicate name validation
7. **Loan Covenant Monitoring** ✅ - Full backend APIs with measurement tracking and status calculation
8. **Multi-Entity Consolidation** ✅ - Full backend APIs with FX currency conversion

## User Personas
1. **CFO/Finance Director** - Needs executive dashboards, KPIs, and strategic insights
2. **Finance Manager** - Manages day-to-day financial operations, reconciliations
3. **FP&A Analyst** - Focuses on planning, forecasting, and scenario analysis

## Core Requirements

### 1. Navigation Structure (Completed ✅)
- CFO Command Center (Dashboard)
- Financial Management
- FP&A (Financial Planning & Analysis)
- Strategic Capital
- AI Financial Advisor
- Integrations
- Settings

### 2. Multi-Currency System (Completed ✅)
- 155 ISO 4217 currencies with symbols ✅
- 198 countries with regional classification ✅
- Database seeding script ✅
- Transaction/Reporting currency fields ✅
- Dynamic symbol display in UI ✅
- Searchable country/currency dropdowns ✅
- Auto country-to-currency mapping ✅

### 3. FP&A Backend APIs (Completed ✅)
- Planning Versions CRUD (Budget, Forecast, Actuals, Scenario) ✅
- Version locking/unlocking ✅
- Version copying ✅
- Drivers CRUD with formula support ✅
- Driver types (Revenue, Cost, Operational, Headcount, Volume, Price) ✅
- FP&A Overview stats ✅

### 4. Loan Covenant Monitoring (Completed ✅)
- Loans CRUD ✅
- Covenants CRUD (DSCR, ICR, Leverage, Current Ratio, etc.) ✅
- Covenant measurement recording ✅
- Status calculation (compliant/warning/breach) ✅
- Headroom percentage calculation ✅
- Covenant summary dashboard ✅

### 5. Multi-Entity Consolidation (Completed ✅)
- Consolidation Groups CRUD ✅
- FX rates API (MOCK data) ✅
- Currency conversion API ✅
- Run consolidation with automatic FX conversion ✅
- Entity breakdown by local/converted values ✅
- Consolidation results history ✅
- Entity summary by currency/region ✅

---

## What's Been Implemented

### January 2025

#### P1 Backend APIs Complete - 2025-01-10
**FP&A Planning Versions:**
- POST /api/fpa/versions - Create version
- GET /api/fpa/versions - List with filters (company_id, version_type, fiscal_year)
- GET /api/fpa/versions/{id} - Get single version
- PUT /api/fpa/versions/{id} - Update version (blocked if locked)
- PUT /api/fpa/versions/{id}/lock - Toggle lock state
- POST /api/fpa/versions/{id}/copy - Copy version
- DELETE /api/fpa/versions/{id} - Delete version (blocked if locked)

**FP&A Drivers:**
- POST /api/fpa/drivers - Create driver (duplicate name check)
- GET /api/fpa/drivers - List with filter (driver_type)
- GET /api/fpa/drivers/{id} - Get single driver
- PUT /api/fpa/drivers/{id} - Update driver
- DELETE /api/fpa/drivers/{id} - Delete driver
- GET /api/fpa/driver-types - Get available driver types
- GET /api/fpa/overview - Get overview stats

**Loans:**
- POST /api/loans - Create loan
- GET /api/loans - List with filters (company_id, is_active)
- GET /api/loans/{id} - Get loan with associated covenants
- PUT /api/loans/{id} - Update loan
- DELETE /api/loans/{id} - Delete loan and covenants

**Covenants:**
- POST /api/covenants - Create covenant
- GET /api/covenants - List with filters (company_id, loan_id, status, is_active)
- GET /api/covenants/{id} - Get with measurement history
- PUT /api/covenants/{id} - Update covenant
- DELETE /api/covenants/{id} - Delete with measurements
- POST /api/covenants/{id}/measure - Record measurement (calculates status)
- GET /api/covenants/summary/status - Get status summary

**FX & Consolidation:**
- GET /api/fx/rates - Get FX rates (MOCK data)
- GET /api/fx/convert - Convert currency
- POST /api/consolidation/groups - Create group
- GET /api/consolidation/groups - List with entity details
- GET /api/consolidation/groups/{id} - Get single group
- PUT /api/consolidation/groups/{id} - Update group
- DELETE /api/consolidation/groups/{id} - Delete group
- POST /api/consolidation/groups/{id}/consolidate - Run consolidation
- GET /api/consolidation/results - Get historical results
- GET /api/consolidation/entity-summary - Get entity summary

**Testing:**
- 62 backend tests passing (43 new + 19 existing)
- Test file: /app/tests/test_fpa_loans_consolidation.py

#### Multi-Currency Engine Complete - 2025-01-10
(Previous implementation details retained)

---

## Prioritized Backlog

### P0 - Critical (Completed ✅)
- [x] Database portability with seed script
- [x] Transaction model with multi-currency fields
- [x] Company model with country/region/currency
- [x] Searchable dropdowns in Add Company form
- [x] Dynamic currency symbols in UI

### P1 - High Priority (Completed ✅)
- [x] Backend APIs for FP&A Planning versions (CRUD)
- [x] Backend APIs for FP&A Drivers (CRUD)
- [x] Loan Covenant Monitoring backend (Strategic Capital)
- [x] Multi-Entity Consolidation with currency conversion

### P2 - Medium Priority (Next)
- [ ] Live FX rate fetching (replace MOCK data with real API)
- [ ] AI Financial Advisor - LLM integration
- [ ] ERP Integration connectors (NetSuite, Oracle, SAP)
- [ ] Banking integration (TrueLayer)
- [ ] Frontend integration for FP&A APIs
- [ ] Frontend integration for Loans/Covenants APIs
- [ ] Frontend integration for Consolidation APIs

### P3 - Low Priority
- [ ] Currency fluctuation in What-If Modeling
- [ ] Advanced reporting/exports
- [ ] Email notifications
- [ ] Audit logging

---

## Technical Architecture

```
/app
├── backend/
│   ├── data/
│   │   ├── currencies.json       # 155 ISO 4217 currencies
│   │   └── countries_regions.json # 198 countries with regions
│   ├── seed.py                   # Database seeding script
│   ├── server.py                 # FastAPI application (2000+ lines)
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── CurrencyContext.js # Currency provider
│   │   ├── App.js                # Main router with CurrencyProvider
│   │   ├── pages/
│   │   │   ├── SettingsPage.js   # Searchable dropdowns
│   │   │   ├── CFOCommandCenter.js
│   │   │   ├── FPAModule.js      # FP&A frontend (uses backend APIs)
│   │   │   └── StrategicCapital.js # Strategic Capital frontend
│   │   └── components/
│   └── .env
├── tests/
│   ├── test_multi_currency.py    # 19 tests
│   └── test_fpa_loans_consolidation.py # 43 tests
├── test_reports/
│   ├── iteration_1.json
│   └── iteration_2.json          # Latest test results
├── DATABASE_SCHEMA.md
├── README.md
└── memory/
    └── PRD.md
```

## Database Schema (MongoDB)

### Master Data Collections
- **currencies** - 155 ISO 4217 currencies
- **countries** - 198 ISO 3166 countries
- **entity_groups_master** - 3 system regional groups

### Application Collections
- **users** - User accounts with authentication
- **companies** - Extended with country_code, global_region, reporting_currency
- **transactions** - Extended with transaction_currency, reporting_currency, etc.
- **preferences** - User settings
- **entity_groups** - User-created entity groups
- **planning_versions** - FP&A budget/forecast versions (NEW)
- **drivers** - FP&A operational drivers (NEW)
- **loans** - Loan records (NEW)
- **covenants** - Loan covenants (NEW)
- **covenant_measurements** - Historical covenant measurements (NEW)
- **consolidation_groups** - Entity consolidation groups (NEW)
- **consolidation_results** - Historical consolidation results (NEW)

## Key API Endpoints

### Reference Data (No Auth Required)
- `GET /api/reference/currencies` - All 155 currencies with symbols
- `GET /api/reference/currency/{code}` - Single currency by ISO code
- `GET /api/reference/countries` - All 198 countries with regions
- `GET /api/reference/regions` - Regional groups
- `GET /api/fx/rates` - FX rates (MOCK)
- `GET /api/fx/convert` - Currency conversion
- `GET /api/fpa/driver-types` - Driver types

### FP&A (Auth Required)
- `POST/GET/PUT/DELETE /api/fpa/versions` - Planning versions CRUD
- `PUT /api/fpa/versions/{id}/lock` - Lock/unlock
- `POST /api/fpa/versions/{id}/copy` - Copy version
- `POST/GET/PUT/DELETE /api/fpa/drivers` - Drivers CRUD
- `GET /api/fpa/overview` - Overview stats

### Loans & Covenants (Auth Required)
- `POST/GET/PUT/DELETE /api/loans` - Loans CRUD
- `POST/GET/PUT/DELETE /api/covenants` - Covenants CRUD
- `POST /api/covenants/{id}/measure` - Record measurement
- `GET /api/covenants/summary/status` - Status summary

### Consolidation (Auth Required)
- `POST/GET/PUT/DELETE /api/consolidation/groups` - Groups CRUD
- `POST /api/consolidation/groups/{id}/consolidate` - Run consolidation
- `GET /api/consolidation/results` - Historical results
- `GET /api/consolidation/entity-summary` - Entity summary

## Test Credentials
- **Email**: `test@example.com`
- **Password**: `Test123!`

## Test Companies
- **Test Company UK**: GBP (£), United Kingdom, EMEA
- **US Division**: USD ($), United States, Americas

## Notes
- FX rates currently use MOCK data (static dictionary)
- FP&A frontend uses backend APIs for CRUD operations
- Covenant measurement calculates status automatically
- Consolidation automatically converts currencies to reporting currency
- 62 backend tests passing
