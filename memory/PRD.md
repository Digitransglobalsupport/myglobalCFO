# MyGlobalCFO - Product Requirements Document

## Original Problem Statement
Enterprise CFO Agent platform that automates finance operations, reconciliations, and reporting across multi-entity organizations with multi-currency support.

---

## What's Been Implemented (Latest First)

### January 2025

#### Core Platform Flexibility - 2025-01-10

**Custom Policy Parameters (RAG Status):**
- 15 configurable financial metrics with RAG thresholds
- Per-company customization (DSO at 75 days instead of 45, etc.)
- Metrics: DSO, DPO, Cash Runway, EBITDA Margin, Gross Margin, Current Ratio, Quick Ratio, Revenue Growth, Debt to Equity, Interest Coverage, Working Capital Ratio, AR/AP/Inventory Turnover, Burn Rate
- Evaluate endpoint to calculate status based on company policy
- Default to system thresholds when no custom policy set

**Bespoke Entity Adjustments:**
- 8 adjustment types: Currency Translation, Revenue Recognition, Depreciation, Inventory Valuation, Consolidation, Intercompany, Tax Treatment, Custom
- Per-entity accounting logic and presentation tweaks
- Parameters stored as flexible JSON for each adjustment type
- Active/inactive toggle for each adjustment

**APIs Added:**
- `GET /api/rag-policies/defaults` - 15 default metrics
- `GET /api/rag-policies/{company_id}` - Company policy or defaults
- `POST /api/rag-policies` - Create custom policy
- `PUT /api/rag-policies/{company_id}` - Update policy
- `DELETE /api/rag-policies/{company_id}` - Reset to defaults
- `POST /api/rag-policies/{company_id}/evaluate` - Calculate RAG status
- `GET /api/entity-adjustments/types` - 8 adjustment types
- `POST/GET/PUT/DELETE /api/entity-adjustments` - CRUD
- `GET /api/entity-adjustments/company/{id}/summary` - Summary by type

**Frontend:**
- New "RAG Policies" tab in Settings
- New "Entity Adjustments" tab in Settings
- 22 backend tests passing

---

#### Live FX Rates & Frontend Integration - 2025-01-10
- Frankfurter API (ECB data) replacing mock FX data
- FP&A Module with backend integration
- Strategic Capital with Loans/Covenants
- New Consolidation Page with FX conversion
- 43 backend tests passing

---

#### P1 Backend APIs - 2025-01-10
- FP&A Planning Versions CRUD with lock/copy
- FP&A Drivers CRUD with duplicate validation
- Loan Covenant Monitoring with measurement tracking
- Multi-Entity Consolidation with currency conversion
- 62 backend tests passing

---

## Prioritized Backlog

### P0 - Critical (All Complete ✅)
- [x] Database portability with seed script
- [x] Multi-currency engine with symbols
- [x] Dynamic currency display in UI
- [x] FP&A Planning Versions CRUD
- [x] FP&A Drivers CRUD
- [x] Loan Covenant Monitoring
- [x] Multi-Entity Consolidation
- [x] Live FX rate fetching
- [x] Custom RAG Policies
- [x] Bespoke Entity Adjustments

### P2 - Medium Priority (Next)
- [ ] AI Financial Advisor - LLM integration
- [ ] ERP Integration connectors (NetSuite, Oracle, SAP)
- [ ] Banking integration (TrueLayer)
- [ ] Apply RAG policies to dashboard KPIs (highlight based on status)
- [ ] Apply entity adjustments in consolidation calculations

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
│   ├── server.py             # FastAPI (2600+ lines)
│   ├── data/                  # Reference data (currencies, countries)
│   └── seed.py               # Database seeding
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SettingsPage.js     # RAG Policies + Entity Adjustments
│   │   │   ├── FPAModule.js        # FP&A with backend integration
│   │   │   ├── StrategicCapital.js # Loans + Covenants
│   │   │   ├── ConsolidationPage.js # Multi-entity consolidation
│   │   │   └── ...
│   │   ├── context/
│   │   │   └── CurrencyContext.js
│   │   └── App.js
│   └── .env
├── tests/
│   ├── test_rag_policy_entity_adjustments.py  # 22 tests
│   └── test_fpa_loans_consolidation.py        # 43 tests
└── test_reports/
    └── iteration_4.json      # Latest: 22 tests passed
```

## Database Collections (MongoDB)

**New Collections:**
- **rag_policies** - Custom RAG thresholds per company
- **entity_adjustments** - Per-entity accounting adjustments

**Existing Collections:**
- users, companies, transactions, preferences
- planning_versions, drivers, loans, covenants, covenant_measurements
- consolidation_groups, consolidation_results, currencies, countries

## Key API Endpoints

### RAG Policies
- `GET /api/rag-policies/defaults` - Default thresholds
- `GET /api/rag-policies/{company_id}` - Get or defaults
- `POST /api/rag-policies` - Create
- `PUT /api/rag-policies/{company_id}` - Update
- `DELETE /api/rag-policies/{company_id}` - Reset
- `POST /api/rag-policies/{company_id}/evaluate` - Calculate status

### Entity Adjustments
- `GET /api/entity-adjustments/types` - 8 adjustment types
- `GET /api/entity-adjustments` - List with filters
- `POST /api/entity-adjustments` - Create
- `PUT /api/entity-adjustments/{id}` - Update
- `DELETE /api/entity-adjustments/{id}` - Delete
- `GET /api/entity-adjustments/company/{id}/summary` - Summary

## Default RAG Metrics

| Metric | Green | Amber | Direction |
|--------|-------|-------|-----------|
| DSO | ≤30 | ≤45 | Lower is Better |
| DPO | ≥30 | ≥20 | Higher is Better |
| Cash Runway | ≥180 days | ≥90 days | Higher is Better |
| EBITDA Margin | ≥20% | ≥10% | Higher is Better |
| Gross Margin | ≥60% | ≥40% | Higher is Better |
| Current Ratio | ≥2.0 | ≥1.5 | Higher is Better |
| Quick Ratio | ≥1.5 | ≥1.0 | Higher is Better |
| Revenue Growth | ≥15% | ≥5% | Higher is Better |
| Debt to Equity | ≤1.0 | ≤2.0 | Lower is Better |
| Interest Coverage | ≥3.0 | ≥1.5 | Higher is Better |
| Working Capital | ≥1.2 | ≥1.0 | Higher is Better |
| AR Turnover | ≥12 | ≥8 | Higher is Better |
| AP Turnover | ≥8 | ≥6 | Higher is Better |
| Inventory Turnover | ≥6 | ≥4 | Higher is Better |
| Burn Rate | ≤50k | ≤100k | Lower is Better |

## Entity Adjustment Types

1. **Currency Translation** - FX translation method
2. **Revenue Recognition** - Revenue recognition policy
3. **Depreciation** - Depreciation calculation method
4. **Inventory Valuation** - Inventory costing method
5. **Consolidation** - Entity consolidation method
6. **Intercompany** - IC elimination rules
7. **Tax Treatment** - Local tax calculation
8. **Custom** - User-defined adjustments

## Test Credentials
- **Email**: `test@example.com`
- **Password**: `Test123!`

## Test Data
- **Test Company UK**: GBP (£), United Kingdom
- **US Division**: USD ($), United States
- **Barclays Business Loan**: £500k at 6.5%
- **DSCR Covenant**: >= 1.25, current 1.5 (compliant)
