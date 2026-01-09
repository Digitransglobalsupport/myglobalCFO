# MyGlobalCFO - Product Requirements Document

## Original Problem Statement
Enterprise CFO Agent platform that automates finance operations, reconciliations, and reporting across multi-entity organizations with multi-currency support.

### Current Feature Request (In Progress)
1. **Database Portability & Documentation** - Generate migration/seed files for currencies and countries
2. **Multi-Country & Entity Standardization** - Global Entity Registry with standardized country names
3. **Multi-Currency Engine** - Full currency array with symbols, transaction/reporting currency support
4. **Command Center Integration** - Dynamic currency symbols across all quadrants

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

### 2. Multi-Currency System (In Progress)
- 155 ISO 4217 currencies with symbols ✅
- 198 countries with regional classification ✅
- Database seeding script ✅
- Transaction/Reporting currency fields (Pending)
- Dynamic symbol display in UI (Pending)

---

## What's Been Implemented

### January 2025

#### Database Portability (Completed ✅) - 2025-01-09
- Created comprehensive `backend/data/currencies.json` with 155 ISO 4217 currencies including symbols
- Created comprehensive `backend/data/countries_regions.json` with 198 countries including region and default currency
- Created `backend/seed.py` database seeding script with CLI options
- Updated backend reference APIs to fetch from MongoDB database
- Added new API endpoint `GET /api/reference/currency/{code}` for single currency lookup
- Updated `DATABASE_SCHEMA.md` with seeding instructions
- Updated `README.md` with currency management documentation
- Database indexes created for currencies.code, countries.code, companies.currency, etc.

#### Database Seed Summary
- **Currencies**: 155 entries (USD, GBP, EUR, JPY, CNY, INR, etc. with symbols)
- **Countries**: 198 entries with ISO codes, regions, and default currencies
- **Entity Groups**: 3 system groups (APAC, EMEA, Americas)

### December 2024

#### Application Setup & Restoration
- Full-stack application setup (React + FastAPI + MongoDB)
- Repository cloned from `DigitransRealtimeFinance`
- Authentication system (JWT-based)
- Company/Entity management
- CORS and API routing fixes

#### Frontend Components (Completed)
- `/app/frontend/src/pages/CFOCommandCenter.js` - Executive dashboard
- `/app/frontend/src/pages/FinancialManagement.js` - Financial operations
- `/app/frontend/src/pages/FPAModuleNew.js` - Full FP&A module with 4 tabs
- `/app/frontend/src/pages/StrategicCapital.js` - Capital management
- `/app/frontend/src/pages/AIAdvisorPage.js` - AI assistant UI
- `/app/frontend/src/pages/IntegrationsPage.js` - ERP/Banking connections
- `/app/frontend/src/pages/SettingsPage.js` - User/Company settings

#### Backend Endpoints (Completed)
- `/api/auth/register` - User registration
- `/api/auth/login` - User authentication
- `/api/auth/me` - Get current user
- `/api/companies` - Company CRUD
- `/api/dashboard/{company_id}` - Dashboard metrics
- `/api/preferences` - User preferences
- `/api/reference/currencies` - List all currencies from DB
- `/api/reference/countries` - List all countries from DB
- `/api/reference/currency/{code}` - Get single currency
- `/api/reference/regions` - Get regional groups

---

## Prioritized Backlog

### P0 - Critical (Current Sprint)
- [ ] Update Transaction model with `transaction_currency` and `reporting_currency` fields
- [ ] Update Company model to use currency from master data
- [ ] Update frontend "Add Company" forms with searchable dropdowns
- [ ] Dynamic currency symbol display in all UI components

### P1 - High Priority
- [ ] Backend APIs for FP&A Planning versions (CRUD)
- [ ] Backend APIs for FP&A Drivers (CRUD)
- [ ] Loan Covenant Monitoring (Strategic Capital)
- [ ] Multi-Entity Consolidation with currency conversion

### P2 - Medium Priority
- [ ] Currency conversion logic for automatic consolidation
- [ ] AI Financial Advisor - LLM integration
- [ ] ERP Integration connectors (NetSuite, Oracle, SAP)
- [ ] Banking integration (TrueLayer)

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
│   ├── server.py                 # FastAPI application
│   └── .env                      # Backend config
├── frontend/
│   ├── src/
│   │   ├── App.js                # Main router & layout
│   │   ├── pages/                # Page components
│   │   └── components/           # Shadcn UI components
│   └── .env                      # Frontend config
├── DATABASE_SCHEMA.md            # Database documentation
├── README.md                     # Project documentation
└── memory/
    └── PRD.md                    # This file
```

## Database Schema (MongoDB)

### Master Data Collections
- **currencies** - ISO 4217 currency codes with symbols (155 records)
- **countries** - ISO 3166 country codes with regions (198 records)
- **entity_groups_master** - System-defined regional groups (3 records)

### Application Collections
- **users** - User accounts with authentication
- **companies** - Multi-entity company records (linked to currencies)
- **transactions** - Financial transactions (with transaction_currency, reporting_currency)
- **preferences** - User settings including consolidated_currency
- **entity_groups** - User-created entity groups

## Key API Endpoints

### Reference Data
- `GET /api/reference/currencies` - All currencies with symbols
- `GET /api/reference/currency/{code}` - Single currency by ISO code
- `GET /api/reference/countries` - All countries with regions
- `GET /api/reference/regions` - Regional groups

### Entity Management
- `POST /api/companies` - Create company with currency
- `GET /api/companies` - List user companies
- `PUT /api/user/consolidated-currency` - Set reporting currency

## Test Credentials
- **Email**: `test@example.com`
- **Password**: `Test123!`

## Notes
- All FP&A data is currently MOCKED in frontend
- Mock Data toggle available in header for demo purposes
- Currency symbols now available from database (155 currencies)
- Countries categorized into APAC, EMEA, Americas regions
