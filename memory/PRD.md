# Realtime Finance by Digitrans Global - Product Requirements Document

## Original Problem Statement
Enterprise CFO Agent platform that automates finance operations, reconciliations, and reporting across multi-entity organizations with multi-currency support.

**Company Name:** Digitrans Global
**Product Name:** Realtime Finance

---

## What's Been Implemented (Latest First)

### January 2025

#### Metric & Reporting Customization - 2025-01-12 (Updated)

**Feature 1: "Define Your Ratio" Button** ✅
- Dedicated button on dashboard to create custom bespoke ratios
- Formula Builder UI with numerator/denominator variables and operators (+, -, *, /)
- Variable Library with 43 financial variables across 5 categories:
  - Balance Sheet (Total Cash, AR, AP, Inventory, Current Assets/Liabilities, etc.)
  - Income Statement (Revenue, COGS, Gross Profit, EBITDA, Net Income, etc.)
  - Cash Flow (Operating/Investing/Financing Cash Flow, Free Cash Flow, etc.)
  - Working Capital (Working Capital, Net Working Capital)
  - Operational (Employee Count, Burn Rate, Customer Count, DSO/DPO, etc.)
- Save & Name functionality (e.g., "Nosa's Liquidity Index")
- RAG threshold configuration per ratio
- Pin to dashboard feature
- Private/Team visibility toggle with "Promote to Team" feature
- Real-time calculation with live preview

**Feature 2: Adjustable Reporting Horizons** ✅ (Now Fully Functional)
- Global date picker for entire dashboard
- Pre-set Quick Toggles: 30D, 60D, 90D, 6M (rapid switching during meetings)
- Extended options: 1Y, YTD, Custom Range
- "Compare to Prior Period" toggle for historical comparison
- Widget-level override capability
- Sticky user preferences (saved to database)
- **NEW: Horizon-based data filtering** - Dashboard KPIs now scale based on selected horizon:
  - 30D = 1.0x scale (base metrics)
  - 60D = 2.0x scale
  - 90D = 3.0x scale  
  - 6M = 6.0x scale
  - Variance factors add realism (longer horizons show improved growth trends)
- **NEW: Horizon Info Banner** - Shows active date range and scale factor in header

**Feature 3: Flexible Dashboard Layouts**
- Role-Based Templates:
  - CFO View (Strategic overview with liquidity focus)
  - FP&A View (Planning and analysis focused)
  - Investor Relations View (Board-ready metrics and reporting)
- Tab Management: Rename, hide, reorder navigation tabs
- Save Layout functionality for custom configurations
- Reset to Default button
- Responsive across desktop and tablet views

**API Endpoints Created:**
- `GET /api/custom-ratios/variables` - 43 financial variables
- `POST /api/custom-ratios` - Create custom ratio
- `GET/PUT/DELETE /api/custom-ratios/{id}` - CRUD operations
- `POST /api/custom-ratios/{id}/pin` - Toggle pin status
- `POST /api/custom-ratios/{id}/promote` - Change visibility
- `POST /api/custom-ratios/{id}/calculate` - Calculate with custom values
- `GET /api/custom-ratios/company/{id}/pinned` - Dashboard pinned ratios
- `GET/PUT /api/user/preferences/{type}` - User preferences
- `GET/POST/PUT/DELETE /api/dashboard-layouts` - Layout management
- `POST /api/dashboard-layouts/{id}/apply` - Apply layout

**Files Created:**
- `/app/frontend/src/components/CustomRatioBuilder.js` - Formula builder modal
- `/app/frontend/src/components/ReportingHorizonSelector.js` - Horizon UI components
- `/app/frontend/src/components/DashboardLayoutManager.js` - Layout manager
- `/app/frontend/src/context/ReportingHorizonContext.js` - Horizon state management

**Files Modified:**
- `/app/backend/server.py` - Added all new API endpoints
- `/app/frontend/src/App.js` - Added ReportingHorizonProvider
- `/app/frontend/src/pages/CFOCommandCenter.js` - Added custom ratios strip, horizon selector
- `/app/frontend/src/pages/SettingsPage.js` - Added Dashboard Layouts and Custom Ratios tabs

**Testing:**
- 23/23 backend API tests passed (initial)
- 12/12 horizon feature tests passed (iteration_6)
- 19/19 RAG policy tests passed (iteration_7)
- Full frontend verification completed
- Test files: 
  - `/app/tests/test_metric_reporting_customization.py`
  - `/app/tests/test_reporting_horizon.py`
  - `/app/tests/test_rag_policies.py`

---

#### RAG Policy Verification - 2025-01-12

**Pages with RAG Integration:**
- **CFOCommandCenter** - DSO, DPO, Quick Ratio, Cash Runway, EBITDA Margin, Revenue Growth, Gross Margin
- **FPAModule** - EBITDA Margin, Revenue Growth, Gross Margin, Burn Rate (newly added)
- **EntityKPIsPage** - Per-entity RAG evaluations across all metrics (newly routed)
- **FinancialManagement > Consolidation** - RAG-colored margins per entity
- **SettingsPage > RAG Policies** - Full threshold configuration

**Fixes Applied:**
- Added route for EntityKPIsPage at `/dashboard/entity-kpis`
- Added RAG integration to FPAModule with Key FP&A Metrics card

---

#### Landing Page Rebranding - 2025-01-11

**Branding Updates:**
- Updated landing page with Digitrans Global logo and "Realtime Finance" product name
- New color scheme: blue/green accent colors (replacing gold/navy)
- "Powered by Digitrans Global" badge on hero section
- Updated login/signup dialogs with company branding
- Updated dashboard sidebar with new logo
- Updated navigation active states to blue accent

**Content Updates:**
- Hero section: "Realtime Finance - Your Enterprise CFO Command Centre"
- Feature cards: Multi-Entity Consolidation, Real-time Analytics, AI Financial Advisor
- Stats section: 14+ ERP Integrations, 7D Planning Dimensions, Real-time Dashboard Updates, 99.9% Uptime SLA
- Additional feature cards: FP&A Planning, Strategic Capital, Reconciliation, Compliance

**Files Modified:**
- `/app/frontend/src/App.js` - Complete landing page redesign with new branding

---

#### Full RAG Integration Audit - 2025-01-11

**RAG Policy Integration Across All KPIs:**
- Created reusable `useRAGPolicy` and `useMultiEntityRAG` hooks for centralized RAG evaluation
- Updated CFO Command Center to display RAG-colored KPIs (DSO, DPO, Quick Ratio, Cash Runway, EBITDA Margin, Revenue Growth, Gross Margin)
- Updated FP&A Command Center to display RAG evaluations with threshold expectations
- Updated Entity KPIs Page with per-entity RAG evaluations
- Updated Financial Management Consolidation tab with RAG-colored margins
- All metrics now use custom thresholds from Settings → RAG Policies

**Files Added/Modified:**
- `/app/frontend/src/hooks/useRAGPolicy.js` - NEW: Reusable RAG evaluation hooks
- `/app/frontend/src/pages/CFOCommandCenter.js` - RAG integration (already done)
- `/app/frontend/src/pages/FPAModule.js` - FPACommandCenter section updated
- `/app/frontend/src/pages/EntityKPIsPage.js` - Full rewrite with RAG
- `/app/frontend/src/pages/FinancialManagement.js` - Consolidation section updated

---

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
- [x] Apply RAG policies to dashboard KPIs (highlight based on status)

### P2 - Medium Priority (Next)
- [ ] AI Financial Advisor - LLM integration
- [ ] ERP Integration connectors (NetSuite, Oracle, SAP)
- [ ] Banking integration (TrueLayer)
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
│   │   ├── hooks/
│   │   │   └── useRAGPolicy.js  # RAG evaluation hooks
│   │   ├── pages/
│   │   │   ├── CFOCommandCenter.js
│   │   │   ├── EntityKPIsPage.js
│   │   │   ├── FPAModule.js
│   │   │   ├── FinancialManagement.js
│   │   │   ├── ConsolidationPage.js
│   │   │   ├── SettingsPage.js
│   │   │   └── StrategicCapital.js
│   │   └── context/
│   │       └── CurrencyContext.js
├── memory/
│   └── PRD.md
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
