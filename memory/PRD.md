# MyGlobalCFO - Product Requirements Document

## Original Problem Statement
Enterprise CFO Agent platform that automates finance operations, reconciliations, and reporting across multi-entity organizations with multi-currency support.

### Current Feature Request (Completed ✅)
1. **Database Portability & Documentation** ✅ - Generated migration/seed files for currencies and countries
2. **Multi-Country & Entity Standardization** ✅ - Global Entity Registry with standardized country names
3. **Multi-Currency Engine** ✅ - Full currency array with symbols, transaction/reporting currency support
4. **Command Center Integration** ✅ - Dynamic currency symbols across all quadrants

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

---

## What's Been Implemented

### January 2025

#### Multi-Currency Engine Complete - 2025-01-10
**Backend Updates:**
- Transaction model extended with:
  - `transaction_currency` - ISO 4217 code of original transaction
  - `reporting_currency` - Group currency for consolidation
  - `reporting_amount` - Amount converted to reporting currency
  - `fx_rate` - Exchange rate at transaction time
- Company model extended with:
  - `country_code` - ISO 3166-1 alpha-3 code
  - `global_region` - Auto-detected from country (APAC/EMEA/Americas)
  - `reporting_currency` - Optional group reporting currency
- POST /api/transactions auto-populates currency fields from company
- GET /api/reference/currency/{code} endpoint for single currency lookup

**Frontend Updates:**
- Created `CurrencyContext.js` provider with:
  - `formatCurrency(amount, currencyCode)` - Formats with correct symbol
  - `getSymbol(currencyCode)` - Returns currency symbol
  - `getCountryDefaultCurrency(country)` - Auto-maps country to currency
  - `getCountryRegion(country)` - Auto-detects region
  - `searchCurrencies(query)` / `searchCountries(query)` - For dropdowns
- Updated Settings page with searchable dropdowns:
  - Country dropdown with 198 countries (search by name or code)
  - Currency dropdown with 155 currencies (search by code or name)
  - Auto-population: selecting Germany → EUR + EMEA
- Updated CFO Command Center with dynamic currency:
  - Liquidity Strip shows correct symbol (£, $, €, ¥)
  - All quadrants use formatCurrency from context
  - Anomaly alerts use dynamic currency symbol
- Company list shows currency symbol next to code

**Testing:**
- 19 backend tests created and passed
- Frontend features verified via Playwright

#### Database Portability (Completed ✅) - 2025-01-09
- Created comprehensive `backend/data/currencies.json` with 155 ISO 4217 currencies
- Created comprehensive `backend/data/countries_regions.json` with 198 countries
- Created `backend/seed.py` database seeding script
- Updated backend reference APIs to fetch from MongoDB
- Added database indexes for optimal performance
- Updated `DATABASE_SCHEMA.md` and `README.md`

---

## Prioritized Backlog

### P0 - Critical (Completed)
- [x] Database portability with seed script
- [x] Transaction model with multi-currency fields
- [x] Company model with country/region/currency
- [x] Searchable dropdowns in Add Company form
- [x] Dynamic currency symbols in UI

### P1 - High Priority (Next)
- [ ] Backend APIs for FP&A Planning versions (CRUD)
- [ ] Backend APIs for FP&A Drivers (CRUD)
- [ ] Loan Covenant Monitoring backend (Strategic Capital)
- [ ] Multi-Entity Consolidation with currency conversion

### P2 - Medium Priority
- [ ] Live FX rate fetching (currency conversion)
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
│   ├── tests/
│   │   └── test_multi_currency.py # 19 backend tests
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── CurrencyContext.js # Currency provider
│   │   ├── App.js                # Main router with CurrencyProvider
│   │   ├── pages/
│   │   │   ├── SettingsPage.js   # Searchable dropdowns
│   │   │   └── CFOCommandCenter.js # Dynamic currency display
│   │   └── components/
│   └── .env
├── test_reports/
│   └── iteration_1.json          # Latest test results
├── DATABASE_SCHEMA.md
├── README.md
└── memory/
    └── PRD.md
```

## Database Schema (MongoDB)

### Master Data Collections
- **currencies** - 155 ISO 4217 currencies (code, name, symbol, decimal_places)
- **countries** - 198 ISO 3166 countries (name, code, region, default_currency)
- **entity_groups_master** - 3 system regional groups (APAC, EMEA, Americas)

### Application Collections
- **users** - User accounts with authentication
- **companies** - Extended with country_code, global_region, reporting_currency
- **transactions** - Extended with transaction_currency, reporting_currency, reporting_amount, fx_rate
- **preferences** - User settings
- **entity_groups** - User-created entity groups

## Key API Endpoints

### Reference Data (No Auth Required)
- `GET /api/reference/currencies` - All 155 currencies with symbols
- `GET /api/reference/currency/{code}` - Single currency by ISO code
- `GET /api/reference/countries` - All 198 countries with regions
- `GET /api/reference/regions` - Regional groups (APAC, EMEA, Americas)

### Entity Management (Auth Required)
- `POST /api/companies` - Create company with full multi-currency support
- `GET /api/companies` - List user companies with currency info
- `POST /api/transactions` - Auto-populates currency from company

## Test Credentials
- **Email**: `test@example.com`
- **Password**: `Test123!`

## Test Companies
- **Test Company UK**: GBP (£), United Kingdom, EMEA
- **US Division**: USD ($), United States, Americas

## Notes
- FP&A data is MOCKED in frontend (toggle in header)
- Dashboard metrics use mock data when mockDataEnabled=true
- Currency symbols fully dynamic from database
- Country-to-currency auto-mapping implemented
