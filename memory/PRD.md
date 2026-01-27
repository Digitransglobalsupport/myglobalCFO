# Digitrans Global - Product Requirements Document

## Original Problem Statement
Digitrans Global is a digital transformation consultancy and SaaS provider. The platform includes:
1. **Corporate Website** - An 8-page corporate marketing site showcasing services and company information
2. **Realtime Finance** - Enterprise CFO Agent platform that automates finance operations, reconciliations, and reporting across multi-entity organizations

**Company Name:** Digitrans Global
**Product Name:** Realtime Finance (SaaS), plus Consultancy Services

---

## What's Been Implemented (Latest First)

### January 2025

#### Corporate Website - "Big Pivot" Redesign - 2025-01-22 ✅

**Complete redesign with Glassmorphism visual effects, interactive tabs, and value hooks:**

**Design System:**
- Primary: Brand Blue (#005994)
- Secondary: Brand Green (#87c71f) for highlights and CTAs
- Accent: Brand Gold (#D4A84B) for Realtime Finance product
- Background: Off-white (#FAFAFA)
- Typography: Playfair Display (headings), Inter (body)
- UI Style: Glassmorphism cards with backdrop blur (`.glass-card` class)

**Pages Implemented (8 Total):**

1. **Homepage (`/`)** - Corporate hub
   - Glassmorphism hero card with background image
   - Trust bar with stats (50+ Occupations, 3,589+ Projects, 8,543+ Customers)
   - Our Core Services section (3 cards: Digital Transformation, Programme Governance, Process Alignment)
   - Product Spotlight (Realtime Finance with gold accent card)
   - What Sets Us Apart testimonials
   - Global Footer CTA ("Ready to Transform?")
   - Corporate Footer with links

2. **Digital Transformation (`/services/digital-transformation`)**
   - Glassmorphism hero with "Core Service" badge
   - Value hook: "System Integration • Cloud API • Data Alignment"
   - Stats section (40% Faster, 95% Success, 30% Cost Reduction, 60% Efficiency)
   - Two service blocks: Post-Merger Integration, Business Process Alignment
   - Interactive Capabilities Tabs (Cloud Migration, System Integration, Process Automation, AI Implementation)
   - Global Footer CTA

3. **Programme Governance (`/services/programme-governance`)**
   - Glassmorphism hero with "Core Service" badge
   - Value hook: "Strategic Alignment • Risk & Compliance • Performance"
   - Stats with icons (98% On-Time, 45% Risk Reduction, 150+ Projects, 35% Cost Savings)
   - 4 Pillars Interactive Accordion:
     - Integration Programme Management
     - Change Management & Stakeholder Engagement
     - Technology Transformation Oversight
     - Performance & Risk Management
   - Our Approach 4-step workflow
   - Governance Dashboard visualization
   - Global Footer CTA

4. **Business Process Alignment (`/services/process-alignment`)** - NEW PAGE
   - Glassmorphism hero with "Core Service" badge
   - Value hook: "Standardisation • Consolidation • Mapping"
   - Stats (40% Efficiency, 60% Reduced Duplication, 95% Compliance, 3x Faster Onboarding)
   - What You'll Experience cards (Complete Visibility, Measurable Outcomes, Scalable Framework)
   - Interactive Service Tabs (Process Standardisation, Process Consolidation, Process Mapping & Validation)
   - Deliverables section
   - The Alignment Journey workflow
   - Global Footer CTA

5. **Realtime Finance (`/products/realtime-finance`)**
   - Gold accent theme (brand gold #D4A84B)
   - Glassmorphism hero with "SaaS Platform" badge
   - Value hook: "Your Enterprise CFO Agent Platform"
   - Metrics strip (14+ ERPs, 7D Planning, Real-time, 99.9% Uptime)
   - The Intelligence Hub (6 feature cards with hover effects)
   - Deep Capabilities (Strategic Capital, FP&A Planning, Compliance)
   - Seamless Integrations list
   - Why section with stat blocks
   - Trial signup dialog

6. **Industries (`/industries`)**
   - Glassmorphism hero
   - 6 industry cards: Payments & FinTech, Hospitality, Financial Services, Manufacturing, Retail & E-commerce, Professional Services
   - Industry deep dive panel (changes on card click)
   - Cross-Industry Capabilities grid

7. **Company (`/company`)**
   - Glassmorphism hero
   - Stats strip with icons
   - Mission & Vision glassmorphism cards
   - What Sets Us Apart (4 values)
   - Our Journey timeline (2015-2024)
   - Response Time card

8. **Contact (`/get-in-touch`)**
   - Glassmorphism contact form
   - Form fields: Full Name, Work Email, Company, Phone, Service of Interest, Message
   - Form validation
   - Contact information cards
   - Response Time info
   - Quick contact options (Live Chat - Coming Soon, Schedule a Call)
   - Map embed

**Navigation:**
- Fixed header with "Our Core Services" dropdown (3 services with icons)
- Products link to Realtime Finance
- Mobile hamburger menu with full navigation
- Footer with all service/company links
- Global Footer CTA component exported from HomePage.js

**SEO-Friendly URL Structure (for www.digitransglobal.com):**

| Page | Primary SEO Route | Legacy Aliases |
|------|------------------|----------------|
| Digital Transformation | `/consulting/unified-digital-transformation-services` | `/services/digital-transformation`, `/solutions/digital-transformation` |
| Programme Governance | `/consulting/integrated-programme-governance-solutions` | `/services/programme-governance`, `/solutions/programme-governance` |
| Process Alignment | `/consulting/business-process-alignment-standardisation` | `/services/process-alignment` |
| Realtime Finance | `/platform/realtime-finance-cfo-automation` | `/products/realtime-finance`, `/solutions/realtime-finance` |
| Industries | `/industries-we-serve` | `/industries` |
| About Us | `/about-digitrans-global` | `/company` |
| Contact | `/get-in-touch` | `/contact` |

**Files Updated:**
- `/app/frontend/src/pages/corporate/*.js` - All 8 pages redesigned with SEO-friendly links
- `/app/frontend/src/pages/corporate/index.js` - Added exports
- `/app/frontend/src/App.js` - Added new SEO routes + legacy aliases
- `/app/frontend/src/index.css` - Glassmorphism styles

**Testing:** 100% pass rate - All pages, navigation, interactive elements verified (iteration_14.json)

---

#### Corporate Website - 6-Page Marketing Site - 2025-01-22 (Superseded by Big Pivot)

Previous version - see Big Pivot redesign above for current state.

---

#### Admin Feature-Control Panel with RBAC - 2025-01-20 ✅

**Complete Admin Panel for centralized feature governance:**

**Backend RBAC Implementation:**
- `require_admin` middleware - Validates `User.role == "ADMIN"` before resolving admin requests
- Returns 403 Forbidden for unauthorized access attempts
- Uses existing user database (Email/Password) - no password duplication

**SystemConfig Database Model:**
- MongoDB collection storing global feature flags
- Keys: `enable_fetch_bridge`, `enable_predictive_mapping`, `enable_variance_resolver`, `enable_strategic_capital`, `enable_data_room`
- Visibility: `site_landing_visible`, `site_login_allowed`
- Tracks `updated_at` and `updated_by` for audit

**Admin API Endpoints:**
- `GET /api/admin/config` - Get full system config (admin only)
- `PUT /api/admin/config` - Update system config (admin only)
- `GET /api/admin/users` - Get all users (admin only)
- `PUT /api/admin/users/{id}/role` - Change user role (admin only, cannot demote self)
- `GET /api/system/config/public` - Public visibility config (no auth)
- `GET /api/system/features` - Feature flags for authenticated users

**Admin Panel UI (`/admin`):**
- **Feature Toggles Tab:** Agentic Features (Fetch Bridge, Predictive Mapping, Forensic Variance Resolver) + Product Features (Strategic Capital, Data Room)
- **Site Visibility Tab:** Public Landing Page toggle, Product Login Access toggle (maintenance mode)
- **User Management Tab:** User list with role dropdowns, "You" badge for current user, cannot change own role
- **Draft State:** Changes staged until explicit "Save Changes" button clicked
- **Unsaved Changes Banner:** Visual indicator when pending changes exist
- **Last Updated:** Timestamp display in footer

**Access Control:**
- Admin Panel link in sidebar (purple, admin-only visibility)
- `AdminRoute` component redirects non-admins to `/forbidden`
- 403 Forbidden page with "Go to Dashboard" and "Go Back" buttons
- Login maintenance mode shows "System Under Maintenance" dialog

**Default Configuration:**
- Feature toggles: Disabled by default (controlled rollout)
- Visibility toggles: Enabled by default (public site accessible)

**Testing:** 16/16 backend tests passed, 100% frontend UI verified

---

#### Agentic Features - Self-Healing Financial Data Engine - 2025-01-19 ✅

**Complete implementation of 4 AI Agents with audit trail:**

**1. FETCH AGENT - Autonomous Data Extraction**
- Scans email inboxes (Gmail/Outlook) for PDF attachments
- Extracts invoice data (vendor, amount, date, invoice number)
- Auto-matches invoices to unreconciled bank transactions
- One-click posting workflow after human approval
- APIs: `/api/agents/fetch/scan-inbox`, `/api/agents/fetch/match-invoices`

**2. MATCH AGENT - Predictive COA Logic**
- Fuzzy matching for Chart of Accounts suggestions (>80% confidence auto-apply)
- Historical pattern learning from existing mappings
- Anomaly detection (flags mappings deviating from group norms)
- Batch heal - propagate mapping rules across similar entities
- APIs: `/api/agents/match/suggest-mappings`, `/api/agents/match/detect-anomalies`, `/api/agents/match/batch-heal`

**3. HEAL AGENT - Autonomous Exception Resolution**
- Investigates IC variances by comparing ledgers
- Finds near-matches (inverted numbers like 123 vs 132, date-shifted entries)
- Proposes self-healing journals for small variances (FX rounding, timing diffs)
- Drafts missing entries for one-click posting
- APIs: `/api/agents/heal/investigate-variance`, `/api/agents/heal/pending`, `/api/agents/heal/approve-journal`

**4. COMPLIANCE AGENT - Technical Verification (IFRS/GAAP)**
- Ownership Logic Gate: Validates IC eliminations between consolidated entities only
- Blocks eliminations with standalone/minority interest entities
- FX Translation Audit: Verifies correct rate logic (Year-End Spot for BS, Average for P&L)
- Governance checks with violation tracking
- APIs: `/api/agents/compliance/governance-check`, `/api/agents/compliance/violations`, `/api/agents/compliance/validate-elimination`

**Audit Trail & Governance:**
- Logic Memo for every agent action (action, evidence, logic, confidence score)
- Immutable `agent_actions` collection (no edits allowed)
- 24-hour review period with rollback capability
- Self-Healing Inbox (notification categories: Automated, Proposed, Flagged)
- Bridge Report: Before vs After transformation visualization

**Frontend - Agent Hub Page (`/dashboard/agent-hub`):**
- Statistics cards: Total Actions, Automated, Proposed, Flagged, Rolled Back, Unread
- Quick Actions: Scan Inbox, Suggest Mappings, Investigate Variances, Governance Check
- Tabs: Notifications, Action Log, Bridge Report, Violations
- Action Log with filters (agent type, status) and Logic Memo viewer
- Bridge Report waterfall (Raw ERP → Agent Additions → Eliminations → Adjustments → Final)

**Testing:** 21/22 backend tests passed (iteration_11.json), 100% frontend verified

**MOCKED APIs:** Email inbox scanning uses mock data (not real Gmail/Outlook OAuth). PDF parsing simulated.

---

#### Inter-Company Eliminations Feature - 2025-01-16 ✅

**Complete IC Elimination Engine for Group Consolidation:**

**Backend APIs Implemented:**
- `POST /api/ic-transactions` - Create IC transaction
- `GET /api/ic-transactions` - List IC transactions (with filters)
- `GET /api/ic-transactions/{id}` - Get single IC transaction
- `PUT /api/ic-transactions/{id}` - Update IC transaction
- `DELETE /api/ic-transactions/{id}` - Delete IC transaction
- `POST /api/ic-transactions/manual-match` - Manually match two transactions
- `POST /api/ic-transactions/unmatch/{id}` - Unmatch transaction
- `POST /api/ic-transactions/generate-mock` - Generate test data
- `GET /api/ic-elimination-rules` - Get elimination rules
- `POST /api/ic-elimination-rules` - Create elimination rule
- `PUT /api/ic-elimination-rules/{id}` - Update rule
- `DELETE /api/ic-elimination-rules/{id}` - Delete rule
- `POST /api/ic-eliminations/auto-match` - Auto-match pending transactions
- `POST /api/ic-eliminations/run` - Run eliminations and create journal entries
- `GET /api/ic-eliminations/results` - Get elimination history
- `GET /api/ic-eliminations/statistics` - Get IC statistics

**IC Transaction Types Supported:**
- Sale (Revenue)
- Purchase (Expense)
- Loan (Intercompany Loans)
- Dividend
- Management Fee
- Royalty
- Asset Transfer
- Other

**IC Transaction Statuses:**
- Pending - Not yet matched
- Matched - Matched with counterparty
- Eliminated - Applied in consolidation
- Disputed - Mismatch detected

**IC Elimination Rules:**
- Amount tolerance (configurable %, default 1%)
- Date tolerance (configurable days, default 30)
- Reference matching (optional exact match)
- Auto-match on create (toggle)

**Elimination Journal Entries Generated:**
- Revenue/Expense elimination (IC Sales)
- AR/AP elimination
- Long-term debt/AR elimination (IC Loans)
- Dividend income/retained earnings elimination

**Frontend - New "IC Eliminations" Tab in ConsolidationPage:**
- Statistics cards (Total, Pending, Matched, Eliminated, Total Amount)
- IC Transactions table with status/type badges
- Action buttons: Generate Test Data, Rules, Auto-Match, Run Eliminations, Add IC Transaction
- Add IC Transaction dialog with all fields
- Rules configuration dialog
- Elimination results dialog with detailed breakdown
- Manual match by selecting two transactions
- Unmatch and delete actions

**Testing:** 29/29 backend tests passed, 100% frontend tests passed (iteration_10.json)

---

#### Deleted Redundant File - 2025-01-16 ✅
- Deleted `/app/frontend/src/pages/FPAModuleNew.js` (contents merged into FPAModule.js)

---

#### Restored Integrations Page - 2025-01-12 ✅

**Issue Fixed:**
- IntegrationsPage was accidentally overwritten during ERP Accounts feature implementation
- Restored missing integrations: ERP Platforms and Other Integrations (Gmail, Outlook, TrueLayer)

**Merged Page Structure (3 Tabs):**
1. **ERP Accounts Tab** - Manage named ERP connections (e.g., "UK Finance - Sage")
   - Test/Sync/Link Entities actions per account
   - Add ERP Account dialog
2. **ERP Platforms Tab** - 14 ERP platforms available
   - Enterprise: NetSuite, Microsoft Dynamics 365 Finance/BC, SAP S/4HANA, Workday Finance
   - SMB: Xero, QuickBooks, Sage, Zoho Books, FreeAgent, FreshBooks, Clear Books, Crunch, KashFlow
   - Filter buttons: All, Enterprise, SMB
3. **Other Integrations Tab** - Additional integrations
   - Gmail (Email monitoring)
   - Outlook (Microsoft email)
   - TrueLayer (Banking)

**Additional Fix:**
- Fixed syntax error in EntityTreeManager.js (orphaned code block)

**Testing:** 100% frontend tests passed (iteration_9.json)

---

#### System Migration: Companies → Entity Tree - 2025-01-12 ✅

**Unified Entity Management:**
- Migrated all existing companies to the new `entity_tree` collection
- `/companies` API now returns data from `entity_tree` with backward-compatible format
- All related endpoints updated: transactions, dashboard, consolidation groups
- Entity dropdown in Command Centre now uses unified entity_tree
- Preserved all company IDs for foreign key consistency

**Migration Details:**
- TopCo, Germany Global Co, Nigeria Global Co (user: ckfadd) → entity_tree
- Test Company UK, US Division (user: test@example.com) → entity_tree
- Digitrans Global Holdings, Digitrans UK Ltd, Digitrans Americas Inc → already in entity_tree

**Key Field Mappings:**
- `currency` → `local_currency`
- `company_type` (Standalone/TopCo/Subsidiary) → `entity_type` (standalone/holdco/subsidiary)
- `parent_company_id` → `parent_entity_id`

---

#### Core Consolidation & Data Integrity - 2025-01-12

**Story 1: Automated Multi-Entity Aggregation** ✅
- Entity Tree Management supporting 130+ entities
- Entity types: Standalone, Subsidiary, Holdco (multi-level hierarchy)
- Parent-child relationships with nested holdcos
- Entity attributes: code, name, country, currency, region, segment, ownership %
- Real-time aggregation with FX conversion using Frankfurter.app API
- ERP Integration Framework (Sage, NetSuite, QuickBooks, Xero, Oracle, SAP)
- Mock data generation for demo purposes, ready for real API connections

**Story 2: Unified Chart of Accounts (COA) Mapping** ✅
- 27 standard Group Schema categories (Revenue, COGS, OpEx, EBITDA, Assets, Liabilities, Equity)
- 15 required categories for valid consolidation
- Mapping engine translates local account codes to unified group schema
- Default ERP mappings for Sage, NetSuite, QuickBooks, Xero
- Per-entity mapping configuration with completion tracking
- Apply defaults with one click for ERP-connected entities

**Story 3: Missing Data Governance** ✅
- Overall Data Health percentage across all entities
- Entity-level health tracking (Complete, Partial, Incomplete)
- Data Quality Alerts with severity levels (High, Medium, Low)
- Missing mapping alerts flag incomplete categories
- Admin-configurable required categories
- Strict Mode toggle to block consolidation if data incomplete
- Consolidation Status indicator (Ready/Blocked)

**Additional Features Implemented:**
- Adjustment Journals (Excel parity for group-level accruals)
  - Journal types: Manual Accrual, Intercompany Elimination, FX Adjustment, Reclassification
  - Balanced/unbalanced journal validation
  - Post/unpost workflow
- ERP Connections management with test/sync capabilities
- Bulk entity import support

**New Pages:**
- `/dashboard/entity-tree` - Entity Tree Manager
- `/dashboard/coa-mapping` - COA Mapping Configuration  
- `/dashboard/data-governance` - Data Governance Dashboard

---

#### Code Quality Fix - 2025-01-12

**Fixed React Hooks Exhaustive-deps Warnings:**
- `CustomRatioBuilder.js` - Inlined fetch functions into useEffect, added proper dependencies
- `CFOCommandCenter.js` - Moved fetchAllData to useCallback, moved mock data constants to module scope
- `ReportingHorizonContext.js` - Converted loadPreferences/savePreferences to useCallback with proper deps

All three files now pass ESLint with zero warnings.

---

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
- [x] Inter-Company Eliminations (2025-01-16)
- [x] Agentic Features - Self-Healing Financial Data Engine (2025-01-19)
  - [x] Fetch Agent - Email inbox scanning & invoice extraction
  - [x] Match Agent - Predictive COA mapping with fuzzy logic
  - [x] Heal Agent - IC variance investigation & self-healing journals
  - [x] Compliance Agent - IFRS/GAAP validation & governance
  - [x] Audit Trail with Logic Memos
  - [x] Agent Hub page with Bridge Report

### P1 - High Priority (Next)
- [ ] Activate ERP Integrations - Replace mock financial data with live ERP data
- [ ] Real Gmail/Outlook OAuth integration for Fetch Agent
- [ ] Apply entity adjustments in consolidation calculations

### P2 - Medium Priority
- [ ] AI Financial Advisor - LLM integration
- [ ] ERP Integration connectors (NetSuite, Oracle, SAP)
- [ ] Banking integration (TrueLayer)

### P3 - Low Priority
- [ ] Currency fluctuation in What-If Modeling
- [ ] Advanced reporting/exports
- [ ] Email notifications
- [ ] Refactor landing page in App.js into separate components

---

## Technical Architecture

```
/app
├── backend/
│   ├── server.py             # FastAPI (7000+ lines)
│   ├── agents/               # NEW: Agentic Features Module
│   │   ├── __init__.py
│   │   ├── base.py           # AgentBase, LogicMemo, audit trail
│   │   ├── fetch_agent.py    # Email scanning, invoice extraction
│   │   ├── match_agent.py    # Predictive COA mapping
│   │   ├── heal_agent.py     # IC variance healing
│   │   └── compliance_agent.py # IFRS/GAAP validation
│   ├── data/                 # Reference data (currencies, countries)
│   └── seed.py               # Database seeding
├── frontend/
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useRAGPolicy.js  # RAG evaluation hooks
│   │   ├── pages/
│   │   │   ├── AgentHubPage.js  # NEW: Agent Hub
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
│   │   │   ├── ConsolidationPage.js # Multi-entity consolidation + IC Eliminations
│   │   │   └── ...
│   │   ├── context/
│   │   │   └── CurrencyContext.js
│   │   └── App.js
│   └── .env
├── tests/
│   ├── test_rag_policy_entity_adjustments.py  # 22 tests
│   ├── test_fpa_loans_consolidation.py        # 43 tests
│   ├── test_ic_eliminations.py                # 29 tests
│   └── test_agent_features.py                 # 22 tests (NEW)
└── test_reports/
    └── iteration_11.json      # Latest: 21/22 tests passed (Agentic Features)
```

## Database Collections (MongoDB)

**New Collections (Agentic Features):**
- **agent_actions** - Immutable audit trail with Logic Memos
- **agent_notifications** - Self-healing inbox notifications
- **agent_rollbacks** - Rollback records for training
- **self_healing_journals** - Proposed self-healing journal entries
- **missing_entry_drafts** - Drafted missing entries for one-click posting
- **governance_violations** - IFRS/GAAP compliance violations
- **audit_evidence** - Generated audit evidence for actions
- **extracted_invoices** - Invoices extracted from emails

**IC Eliminations Collections:**
- **ic_transactions** - Inter-company transactions between entities
- **ic_elimination_rules** - Matching rules (tolerance settings)
- **ic_elimination_results** - Elimination run history

**Existing Collections:**
- **rag_policies** - Custom RAG thresholds per company
- **entity_adjustments** - Per-entity accounting adjustments
- users, entity_tree, transactions, preferences
- planning_versions, drivers, loans, covenants, covenant_measurements
- consolidation_groups, consolidation_results, currencies, countries

## Key API Endpoints

### Agentic Features (NEW)
- `GET /api/agents/statistics` - Agent activity statistics
- `GET /api/agents/actions` - Action log with filters
- `GET /api/agents/notifications` - Self-healing inbox
- `POST /api/agents/fetch/scan-inbox` - Scan email for invoices
- `POST /api/agents/match/suggest-mappings` - Predictive COA suggestions
- `POST /api/agents/match/detect-anomalies` - Find mapping anomalies
- `POST /api/agents/heal/investigate-variance` - Investigate IC variances
- `POST /api/agents/compliance/governance-check` - Run governance checks
- `GET /api/agents/bridge-report` - Transformation waterfall

### IC Eliminations
- `POST /api/ic-transactions` - Create IC transaction
- `GET /api/ic-transactions` - List IC transactions
- `POST /api/ic-eliminations/auto-match` - Auto-match pending
- `POST /api/ic-eliminations/run` - Run eliminations
- `GET /api/ic-eliminations/statistics` - Get IC statistics

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

---

## Multi-App Shared Architecture - 2025-01-27 ✅

### Overview
Implemented cross-application integration sharing between multiple Emergent projects:
- **digitrans-global** - Corporate website
- **realtime-finance** - CFO Toolkit (this project)
- **realtime-pmo** - Project Management Office (external project)

### Architecture
```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  digitrans-global   │     │  realtime-finance   │     │   realtime-pmo      │
│  (Corporate Site)   │     │  (CFO Toolkit)      │     │  (PMO App)          │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
          │                          │                          │
          └──────────────────────────┼──────────────────────────┘
                                     ▼
                        ┌─────────────────────────┐
                        │   MongoDB Atlas         │
                        │   (Single Source)       │
                        │                         │
                        │   Collections:          │
                        │   - users               │
                        │   - apps                │
                        │   - shared_integrations │
                        │   - erp_accounts        │
                        └─────────────────────────┘
```

### New Database Collections

**`apps` Collection** - App Registry
```json
{
  "app_id": "realtime-pmo",
  "app_name": "Realtime PMO",
  "enabled_integrations": ["xero", "quickbooks", "jira", "asana"],
  "enabled_features": ["dashboard", "projects"],
  "status": "active"
}
```

**`shared_integrations` Collection** - Cross-App Integrations
```json
{
  "user_id": "uuid",
  "platform": "xero",
  "status": "connected",
  "source_app_id": "realtime-finance",
  "source_app_name": "Realtime Finance"
}
```

### New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shared/apps` | List all registered apps |
| GET | `/api/shared/apps/{app_id}` | Get app config |
| POST | `/api/shared/apps/seed` | Initialize apps (admin) |
| GET | `/api/shared/integrations/catalog` | Full integration catalog |
| GET | `/api/shared/integrations/catalog/{app_id}` | App-specific catalog |
| GET | `/api/shared/integrations/user?app_id=X` | User's integrations |
| POST | `/api/shared/integrations` | Create integration |
| PUT | `/api/shared/integrations/{id}` | Update integration |
| DELETE | `/api/shared/integrations/{id}` | Delete integration |
| POST | `/api/shared/integrations/{id}/sync?app_id=X` | Sync integration |

### New Files Created

**Backend:**
- `/app/backend/shared_schema.py` - Pydantic models for shared architecture
- `/app/backend/shared_routes.py` - Reference routes (integrated into server.py)

**Frontend:**
- `/app/frontend/src/shared/hooks/useIntegrations.js` - Shared hook for integrations
- `/app/frontend/src/shared/components/SharedIntegrationsPanel.jsx` - Drop-in UI component
- `/app/frontend/src/shared/index.js` - Module index

**Documentation:**
- `/app/MIGRATION_GUIDE.md` - Guide for retrofitting other apps

### Environment Variables

**Frontend (.env):**
```
REACT_APP_APP_ID=realtime-finance
```

**Backend (.env):**
- Both apps use same `MONGO_URL` and `JWT_SECRET`

### Registered Apps (Seeded)

| App ID | Name | Integrations |
|--------|------|-------------|
| digitrans-global | Digitrans Global | None (corporate site) |
| realtime-finance | Realtime Finance | xero, quickbooks, sage, netsuite, dynamics365, sap, truelayer, plaid, gmail, outlook, slack |
| realtime-pmo | Realtime PMO | ALL above + jira, asana, monday, teams |

### Integration Catalog (17 Platforms)

**ERP:** xero, quickbooks, sage, netsuite, dynamics365, sap
**Banking:** truelayer, plaid
**Email:** gmail, outlook
**Project Management:** jira, asana, monday
**Communication:** slack, teams

### Key Features

1. **Source Tracking:** `source_app_id` field tracks which app created each integration
2. **User-Level Sharing:** Integrations shared at user level (same login = same integrations)
3. **App-Specific Filtering:** Each app only sees integrations enabled for it
4. **Admin Control:** App registry managed via Admin Panel or API

---
