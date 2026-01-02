# Real-World Data Requirements for Governance, Risk, & Strategic Capital

## Overview

This document outlines the **real-world business data** required to populate the Governance, Risk, & Strategic Capital quadrant with actual production data instead of mocked data.

---

## 📊 Data Requirements by Module

### 1. Loan Covenant Monitor

#### Required Data Points

**From Accounting System (ERP)**:
```
✓ Total Debt (Current + Long-term)
  - Short-term debt / Current portion of long-term debt
  - Long-term debt
  - Lines of credit drawn
  - Capital leases (if treated as debt)

✓ Cash & Cash Equivalents
  - Bank account balances (all accounts)
  - Money market funds
  - Short-term investments (< 90 days)
  - Restricted cash (flagged separately)

✓ EBITDA Components
  - Revenue (trailing 12 months)
  - Cost of Goods Sold
  - Operating Expenses
  - Depreciation & Amortization
  - Interest Expense
  - Tax Expense
  - One-time/Non-recurring items (to be added back)

✓ Income Statement Data
  - EBIT (Operating Income)
  - Interest Expense
  - Net Operating Income

✓ Debt Service Information
  - Principal payments (scheduled)
  - Interest payments (scheduled)
  - Total debt service (monthly/quarterly)
```

**From Loan Documents/Banking Systems**:
```
✓ Loan Details
  - Loan ID / Reference number
  - Lender name
  - Original loan amount
  - Current outstanding balance
  - Interest rate
  - Maturity date
  - Payment schedule

✓ Covenant Definitions
  - Covenant type (Net Debt/EBITDA, Interest Coverage, DSCR, etc.)
  - Threshold value
  - Threshold type (maximum or minimum)
  - Calculation methodology
  - Test frequency (monthly, quarterly, annually)
  - Cure periods
  - Consequences of breach

✓ Historical Covenant Status
  - Prior period values
  - Trend data
  - Previous breaches (if any)
  - Waivers received
```

**Data Sources**:
- **Primary**: QuickBooks, Xero, NetSuite, SAP, Dynamics 365
- **Secondary**: Bank portal APIs, Loan servicing platforms
- **Manual**: Loan agreements (PDF parsing for covenant definitions)

**Update Frequency**: 
- Financial data: Daily (or real-time if ERP supports)
- Covenant calculations: Every 15 minutes
- Loan details: Weekly or when changes occur

**Calculation Requirements**:
```python
# Net Debt to EBITDA
net_debt = (total_debt - cash_and_equivalents)
ebitda = (revenue - cogs - opex + depreciation + amortization)
net_debt_to_ebitda = net_debt / ebitda

# Interest Coverage Ratio
ebit = revenue - cogs - opex + depreciation + amortization
interest_coverage = ebit / interest_expense

# Debt Service Coverage Ratio (DSCR)
net_operating_income = revenue - operating_expenses
total_debt_service = principal_payments + interest_payments
dscr = net_operating_income / total_debt_service

# Distance to Breach
if threshold_type == "max":
    distance = ((threshold - current_value) / threshold) * 100
else:  # min
    distance = ((current_value - threshold) / threshold) * 100

# Status determination
if distance > 10:
    status = "healthy"
elif distance > 0:
    status = "warning"
else:
    status = "breach"
```

---

### 2. AI Risk & Anomaly Feed

#### Required Data Points

**From Transaction Management System**:
```
✓ Transaction Details
  - Transaction ID
  - Date & timestamp
  - Amount
  - Currency
  - Type (expense, revenue, transfer, etc.)
  - Category (marketing, travel, software, etc.)
  - Vendor/Customer name
  - Entity/Subsidiary
  - GL account
  - Payment method
  - Invoice/PO reference
  - Approval status
  - Approved by (user ID)
  - Created by (user ID)

✓ Transaction Metadata
  - Entry method (manual, automated, import)
  - Source system
  - IP address (for manual entries)
  - Device type
  - Time of day
  - Day of week
  - Processing location
  - Batch ID (if applicable)

✓ Historical Transaction Data (30-90 days)
  - Category averages
  - Vendor payment patterns
  - Entity spending patterns
  - Typical transaction amounts by category
  - Normal processing times/windows
  - Seasonal patterns
```

**From Vendor Management**:
```
✓ Vendor Information
  - Vendor ID
  - Vendor name
  - Payment terms
  - Historical payment amounts
  - Payment frequency
  - Contract amounts (if applicable)
  - Active/Inactive status
```

**From User Management**:
```
✓ User Context
  - User ID
  - User role
  - Department
  - Approval limits
  - Recent activity patterns
```

**Data Sources**:
- **Primary**: MyGlobalCFO Transaction Database
- **Secondary**: ERP systems (Xero, QuickBooks, NetSuite)
- **Tertiary**: Payment processors (Stripe, PayPal)

**Update Frequency**:
- Transaction sync: Real-time or every 5 minutes
- Anomaly detection: Run on every new transaction batch
- Historical baseline: Recalculate daily

**Anomaly Detection Logic**:
```python
# Unusual Spending Detection
category_avg_30d = get_category_average(category, 30)
category_std_30d = get_category_std_dev(category, 30)
deviation_percent = ((amount - category_avg_30d) / category_avg_30d) * 100

if deviation_percent > 150:
    severity = "high"
    flag_anomaly(type="unusual_spending")

# Duplicate Transaction Detection
recent_transactions = get_recent_transactions(vendor_id, 48_hours)
for txn in recent_transactions:
    if (abs(txn.amount - current_amount) < 1.0 and 
        txn.vendor_id == current_vendor_id):
        similarity_score = calculate_similarity(txn, current_txn)
        if similarity_score > 0.85:
            severity = "medium"
            flag_anomaly(type="duplicate_transaction")

# Unusual Timing Detection
normal_hours = get_normal_processing_hours(entity)
if current_hour not in normal_hours:
    if amount > threshold:
        severity = "low"
        flag_anomaly(type="unusual_timing")

# Unusual Approver Detection
expected_approvers = get_approvers_for_amount(amount)
if current_approver not in expected_approvers:
    severity = "medium"
    flag_anomaly(type="unusual_approver")

# Velocity Anomaly
recent_count = count_transactions(entity, 24_hours)
avg_daily_count = get_average_daily_count(entity, 30)
if recent_count > (avg_daily_count * 2):
    severity = "medium"
    flag_anomaly(type="high_velocity")

# Confidence Calculation
confidence = calculate_confidence(
    historical_data_quality=0.9,
    pattern_strength=0.85,
    deviation_magnitude=deviation_percent / 100
)
```

**AI/ML Requirements**:
- Machine learning model for pattern recognition
- Historical baseline data (minimum 90 days)
- Anomaly classification model
- Confidence scoring algorithm
- False positive tracking and learning

---

### 3. AR Exposure & Liquidity Analysis

#### Required Data Points

**From Accounts Receivable System**:
```
✓ Invoice Details
  - Invoice ID
  - Customer ID
  - Customer name
  - Invoice date
  - Due date
  - Amount
  - Currency
  - Outstanding balance
  - Days outstanding
  - Payment terms
  - Entity/Subsidiary
  - Status (open, overdue, paid)

✓ Aging Buckets
  - Current (0-30 days): Sum of balances
  - 30 Days (31-60 days): Sum of balances
  - 60 Days (61-90 days): Sum of balances
  - 90+ Days: Sum of balances
  - Total AR: Sum of all balances

✓ Customer Payment History
  - Historical payment patterns
  - Average days to pay
  - Payment reliability score
  - Credit limit
  - Credit terms
```

**From Cash Management**:
```
✓ Cash Flow Data
  - Monthly burn rate (last 3 months average)
  - Operating cash flow
  - Capital expenditures
  - Debt service payments
  - Current cash balance
```

**Data Sources**:
- **Primary**: ERP AR module (Xero, QuickBooks, NetSuite)
- **Secondary**: MyGlobalCFO consolidated AR
- **Tertiary**: Customer payment portals

**Update Frequency**:
- AR balances: Daily
- Aging calculations: Daily
- Payment history: Updated on each payment received
- Burn rate: Recalculated monthly

**Calculation Requirements**:
```python
# AR Aging Buckets
invoices = get_all_open_invoices()
current = sum([inv.balance for inv in invoices if inv.days_outstanding <= 30])
days_30 = sum([inv.balance for inv in invoices if 31 <= inv.days_outstanding <= 60])
days_60 = sum([inv.balance for inv in invoices if 61 <= inv.days_outstanding <= 90])
days_90_plus = sum([inv.balance for inv in invoices if inv.days_outstanding > 90])
total_ar = current + days_30 + days_60 + days_90_plus

# At-Risk Capital
at_risk_capital = days_90_plus

# Monthly Burn Rate
last_3_months_expenses = get_expenses(months=3)
monthly_burn_rate = last_3_months_expenses / 3

# Risk Ratio
risk_ratio = at_risk_capital / monthly_burn_rate

# Top Overdue Customers
overdue_invoices = [inv for inv in invoices if inv.days_outstanding > 90]
top_customers = sorted(overdue_invoices, key=lambda x: x.balance, reverse=True)[:3]

# Quick Ratio (for liquidity analysis)
current_assets = cash + current + days_30
quick_ratio = current_assets / monthly_burn_rate
```

---

### 4. Cash Runway Analysis

#### Required Data Points

**From Cash Management**:
```
✓ Current Cash Position
  - All bank account balances
  - Money market accounts
  - Short-term investments
  - Restricted cash (excluded from runway)

✓ Historical Cash Flow (6-12 months)
  - Operating cash inflows
  - Operating cash outflows
  - Monthly net cash flow
  - Seasonality patterns

✓ Committed Expenses
  - Payroll obligations
  - Debt service payments
  - Vendor commitments
  - Lease/rent payments
  - Subscription payments

✓ Expected Receipts
  - AR collections forecast
  - Contract payments due
  - Expected financing
```

**Data Sources**:
- **Primary**: Bank APIs (Plaid, TrueLayer)
- **Secondary**: ERP cash management module
- **Tertiary**: Manual forecasts/budgets

**Update Frequency**:
- Cash balances: Real-time or hourly
- Burn rate calculation: Daily
- Runway calculation: Daily
- Forecast updates: Weekly

**Calculation Requirements**:
```python
# Current Cash (excluding restricted)
current_cash = sum([account.balance for account in bank_accounts 
                    if not account.is_restricted])

# Monthly Burn Rate
last_3_months = get_cash_flow_data(months=3)
total_outflows = sum([month.outflows for month in last_3_months])
total_inflows = sum([month.inflows for month in last_3_months])
monthly_burn = (total_outflows - total_inflows) / 3

# Cash Runway (in days)
runway_days = (current_cash / monthly_burn) * 30

# Runway Status
if runway_days < 90:
    status = "urgent"
elif runway_days < 180:
    status = "moderate"
else:
    status = "healthy"

# Extended Runway (with AR collections)
collectible_ar = current_ar + ar_30_days  # Assume 60-day collection
extended_cash = current_cash + collectible_ar
extended_runway = (extended_cash / monthly_burn) * 30
```

---

### 5. Strategic Capital Sourcing

#### Required Data Points

**From Financial Performance**:
```
✓ Key Financial Metrics
  - Monthly recurring revenue (MRR)
  - Annual recurring revenue (ARR)
  - Revenue growth rate (YoY, MoM)
  - EBITDA
  - EBITDA margin
  - Gross profit margin
  - Customer acquisition cost (CAC)
  - Lifetime value (LTV)
  - LTV/CAC ratio

✓ Company Profile
  - Industry/sector
  - Company age
  - Number of employees
  - Geographic locations
  - Business model (SaaS, e-commerce, etc.)
  - Growth stage (seed, series A, etc.)
  - Venture-backed status
```

**From Existing Debt Profile**:
```
✓ Current Debt Position
  - Total outstanding debt
  - Debt-to-equity ratio
  - Debt-to-EBITDA ratio
  - Interest coverage ratio
  - Credit score (if available)
  - Existing lender relationships
```

**From Capital Requirements**:
```
✓ Funding Needs
  - Requested amount
  - Use of funds
  - Desired term
  - Acceptable interest rate range
  - Urgency (days needed)
```

**External Data (API Integrations)**:
```
✓ Funding Provider APIs
  - Stripe Capital API
  - Lendio API
  - Funding Circle API
  - Government grant databases (Grants.gov, Innovate UK)
  - Bank lending platforms

✓ Credit Bureau Data
  - Business credit score
  - Credit history
  - Public records
```

**Data Sources**:
- **Primary**: MyGlobalCFO consolidated financials
- **Secondary**: ERP systems
- **External**: Funding platform APIs
- **Manual**: Company profile data

**Update Frequency**:
- Financial metrics: Daily
- Funding matching: On-demand when runway < 90 days
- Provider rates: Weekly (via API updates)
- Eligibility checks: Real-time

**Matching Logic**:
```python
# Eligibility Scoring
def calculate_eligibility(company_data, funding_option):
    score = 0.0
    
    # Revenue requirements
    if funding_option.min_revenue:
        if company_data.arr >= funding_option.min_revenue:
            score += 0.25
    
    # Profitability requirements
    if funding_option.requires_positive_ebitda:
        if company_data.ebitda > 0:
            score += 0.20
    
    # Growth requirements
    if funding_option.min_growth_rate:
        if company_data.growth_rate >= funding_option.min_growth_rate:
            score += 0.20
    
    # Debt capacity
    debt_to_ebitda = company_data.total_debt / company_data.ebitda
    if debt_to_ebitda < funding_option.max_debt_to_ebitda:
        score += 0.20
    
    # Industry match
    if company_data.industry in funding_option.target_industries:
        score += 0.15
    
    return score

# Match Scoring (combining eligibility + other factors)
def calculate_match_score(company_data, funding_option):
    eligibility = calculate_eligibility(company_data, funding_option)
    
    # Approval speed bonus (if urgent need)
    if company_data.runway_days < 90:
        if funding_option.approval_days < 5:
            speed_bonus = 0.10
        elif funding_option.approval_days < 15:
            speed_bonus = 0.05
        else:
            speed_bonus = 0.0
    else:
        speed_bonus = 0.0
    
    # Cost efficiency (lower rates = higher score)
    if funding_option.interest_rate == 0:  # Grants
        cost_score = 0.15
    elif funding_option.interest_rate < 0.06:
        cost_score = 0.10
    elif funding_option.interest_rate < 0.10:
        cost_score = 0.05
    else:
        cost_score = 0.0
    
    match_score = eligibility + speed_bonus + cost_score
    return min(match_score, 1.0)  # Cap at 100%

# Recommendation Ranking
recommendations = []
for option in funding_providers:
    if calculate_eligibility(company_data, option) > 0.5:  # 50% threshold
        match_score = calculate_match_score(company_data, option)
        recommendations.append({
            "option": option,
            "match_score": match_score,
            "eligibility": calculate_eligibility(company_data, option)
        })

# Sort by match score
recommendations.sort(key=lambda x: x["match_score"], reverse=True)
```

---

### 6. Health Scoring System

#### Required Data Points

**Aggregated from All Modules Above**:
```
✓ Covenant Compliance Score
  - Number of healthy covenants
  - Number of warning covenants
  - Number of breached covenants
  - Total number of covenants
  
  Formula: healthy_count / total_count

✓ Fraud Risk Score
  - Number of high severity anomalies
  - Number of medium severity anomalies
  - Number of low severity anomalies
  - Total number of anomalies
  
  Formula: 1.0 - (high * 0.3 + medium * 0.15 + low * 0.05)

✓ Liquidity Strength Score
  - Quick ratio
  - Current ratio
  - Cash runway days
  - AR risk ratio
  
  Formula: min(quick_ratio / 3, 1.0)
```

**Data Sources**:
- Derived from modules 1-5 above
- No additional external data needed

**Update Frequency**:
- Recalculated every 15 minutes
- Triggered on any underlying data change

**Calculation Requirements**:
```python
# Overall Health Score
covenant_weight = 0.40
fraud_weight = 0.30
liquidity_weight = 0.30

health_score = (
    covenant_compliance_score * covenant_weight +
    fraud_risk_score * fraud_weight +
    liquidity_strength_score * liquidity_weight
)

# Status Determination
if health_score > 0.80:
    status = "healthy"
    color = "green"
elif health_score > 0.60:
    status = "warning"
    color = "yellow"
else:
    status = "critical"
    color = "red"
```

---

## 🔌 Integration Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     External Systems                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   Data Ingestion Layer                       │
│  • ERP Connectors (Xero, QuickBooks, NetSuite, SAP)        │
│  • Banking APIs (Plaid, TrueLayer)                          │
│  • Funding Platform APIs                                     │
│  • Manual Data Entry Forms                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                Data Transformation Layer                     │
│  • Data validation                                           │
│  • Currency conversion                                       │
│  • Data normalization                                        │
│  • Calculation engine                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   MyGlobalCFO Database                       │
│  Collections:                                                │
│  • loans                                                     │
│  • loan_covenants                                           │
│  • transactions (for anomaly detection)                      │
│  • ar_invoices                                              │
│  • cash_accounts                                            │
│  • company_metrics                                          │
│  • anomaly_alerts                                           │
│  • funding_recommendations                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Governance Risk Capital Service                 │
│  • Covenant calculation service                              │
│  • Anomaly detection service                                 │
│  • AR analysis service                                       │
│  • Cash runway service                                       │
│  • Capital matching service                                  │
│  • Health scoring service                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Endpoints                           │
│  GET /api/cfo/dashboard/governance-risk-capital             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Dashboard                         │
│  GovernanceRiskCapitalQuadrant Component                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Data Collection Checklist

### Phase 1: Core Financial Data
- [ ] Connect to primary ERP system
- [ ] Map GL accounts to standard categories
- [ ] Extract balance sheet data (debt, cash)
- [ ] Extract P&L data (revenue, expenses, EBITDA components)
- [ ] Extract cash flow statements
- [ ] Set up daily sync schedule

### Phase 2: Loan & Banking Data
- [ ] Collect all loan agreements (PDFs)
- [ ] Parse covenant definitions from loan docs
- [ ] Enter loan details manually (if no API)
- [ ] Connect to bank APIs for cash balances
- [ ] Set up real-time bank feed sync
- [ ] Configure covenant calculation rules

### Phase 3: Transaction Data
- [ ] Ensure transaction sync is working
- [ ] Collect 90 days of historical transactions
- [ ] Tag transactions with entities/categories
- [ ] Set up real-time transaction monitoring
- [ ] Configure anomaly detection thresholds

### Phase 4: AR & Customer Data
- [ ] Extract all open invoices from ERP
- [ ] Get customer master data
- [ ] Calculate historical payment patterns
- [ ] Set up daily AR aging sync
- [ ] Configure collection alerts

### Phase 5: External Integrations
- [ ] Register with funding platform APIs
- [ ] Configure API credentials
- [ ] Map company profile data
- [ ] Set up eligibility rules
- [ ] Test matching logic

---

## 🔧 Implementation Priority

### High Priority (Week 1-2)
1. **Loan Covenant Monitor**
   - Most critical for compliance
   - Data: Debt, Cash, EBITDA from ERP
   - Effort: Medium (requires loan doc parsing)

2. **Cash Runway Analysis**
   - Critical for survival
   - Data: Bank balances, cash flow history
   - Effort: Low (straightforward calculation)

### Medium Priority (Week 3-4)
3. **AR Exposure Analysis**
   - Important for liquidity management
   - Data: AR aging from ERP
   - Effort: Low (standard ERP report)

4. **Strategic Capital Sourcing**
   - Valuable for growth planning
   - Data: Company metrics + external APIs
   - Effort: Medium (external API integrations)

### Lower Priority (Week 5-6)
5. **AI Risk & Anomaly Feed**
   - Nice-to-have, fraud prevention
   - Data: Transaction history (90+ days)
   - Effort: High (ML model training)

6. **Health Scoring**
   - Depends on all above modules
   - Data: Aggregated from other modules
   - Effort: Low (simple calculations)

---

## 📊 Sample Data Schema

### Loans Collection
```json
{
  "loan_id": "LOAN-2024-001",
  "lender_name": "Silicon Valley Bank",
  "original_amount": 1500000,
  "outstanding_balance": 1200000,
  "interest_rate": 0.075,
  "origination_date": "2024-01-15",
  "maturity_date": "2027-01-15",
  "payment_schedule": "monthly",
  "entity_id": "ENT-001",
  "status": "active"
}
```

### Loan Covenants Collection
```json
{
  "covenant_id": "COV-001",
  "loan_id": "LOAN-2024-001",
  "covenant_type": "net_debt_to_ebitda",
  "threshold_value": 2.5,
  "threshold_type": "max",
  "test_frequency": "quarterly",
  "calculation_method": "(total_debt - cash) / ebitda_ttm",
  "cure_period_days": 30,
  "active": true
}
```

### Transactions Collection (for anomaly detection)
```json
{
  "transaction_id": "TXN-20240102-001",
  "date": "2024-01-02T14:35:00Z",
  "amount": 45000,
  "currency": "USD",
  "type": "expense",
  "category": "marketing",
  "vendor_id": "VEN-123",
  "vendor_name": "Marketing Agency Ltd",
  "entity_id": "ENT-002",
  "gl_account": "6100",
  "payment_method": "bank_transfer",
  "approved_by": "USER-005",
  "created_by": "USER-012",
  "metadata": {
    "entry_method": "manual",
    "ip_address": "192.168.1.100",
    "timestamp_utc": "2024-01-02T14:35:23Z"
  }
}
```

### AR Invoices Collection
```json
{
  "invoice_id": "INV-2024-0015",
  "customer_id": "CUST-045",
  "customer_name": "Enterprise Corp",
  "invoice_date": "2023-10-15",
  "due_date": "2023-11-15",
  "amount": 45000,
  "outstanding_balance": 45000,
  "currency": "USD",
  "entity_id": "ENT-001",
  "status": "overdue",
  "days_outstanding": 105,
  "payment_terms": "net_30"
}
```

### Cash Accounts Collection
```json
{
  "account_id": "CASH-001",
  "bank_name": "JPMorgan Chase",
  "account_number": "****1234",
  "account_type": "checking",
  "currency": "USD",
  "balance": 425000,
  "last_updated": "2024-01-02T16:00:00Z",
  "entity_id": "ENT-001",
  "is_restricted": false
}
```

### Company Metrics Collection
```json
{
  "entity_id": "ENT-001",
  "period": "2024-01",
  "metrics": {
    "revenue": 850000,
    "cogs": 340000,
    "operating_expenses": 425000,
    "depreciation": 15000,
    "amortization": 5000,
    "interest_expense": 12500,
    "ebitda": 105000,
    "ebit": 85000,
    "net_income": 62000
  },
  "calculated_at": "2024-02-01T00:00:00Z"
}
```

---

## 🚀 Getting Started with Real Data

### Step 1: Enable ERP Integration
```bash
# Configure ERP credentials in .env
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
```

### Step 2: Initial Data Load
```bash
# Run data sync script
python scripts/sync_erp_data.py --erp=xero --entity=all

# Verify data
python scripts/verify_data_quality.py
```

### Step 3: Configure Covenants
```bash
# Upload loan agreements
python scripts/parse_loan_covenants.py --file=loan_agreement.pdf

# Manually enter covenant details via admin interface
# Or use API: POST /api/admin/loan-covenants
```

### Step 4: Enable Real-Time Monitoring
```bash
# Start background jobs
python scripts/start_covenant_monitor.py
python scripts/start_anomaly_detector.py
python scripts/start_cash_tracker.py
```

### Step 5: Switch to Real Data
```javascript
// In frontend code
const useRealData = true;

// In API calls
const response = await axios.get(
  `${API}/cfo/dashboard/governance-risk-capital`,
  { params: { user_id: userId, use_mocked_data: false } }
);
```

---

## 📈 Data Quality Requirements

### Minimum Data Requirements
- **Historical transactions**: 90 days minimum for anomaly detection
- **Cash flow history**: 6 months for burn rate accuracy
- **Loan documents**: All active loan agreements
- **AR aging**: Current snapshot from ERP
- **Bank balances**: Real-time or daily

### Data Accuracy
- Financial data: 99.9% accuracy required
- Covenant calculations: Must match loan agreement formulas exactly
- Cash balances: Real-time preferred, hourly minimum
- Transaction categorization: 95% accuracy target

### Data Completeness
- All active loans documented: 100%
- All covenant thresholds defined: 100%
- Transaction categorization: 95%
- Customer payment terms: 90%

---

## 🔐 Data Security Considerations

- **Encryption**: All financial data encrypted at rest and in transit
- **Access Control**: Role-based access to sensitive covenant data
- **Audit Trail**: All data modifications logged
- **Data Retention**: Financial data retained for 7 years
- **PII Protection**: Customer data anonymized where possible
- **Compliance**: SOC 2, GDPR, CCPA compliance maintained

---

## ✅ Summary

**Critical Data Sources**:
1. ✅ ERP System (Xero, QuickBooks, NetSuite, SAP)
2. ✅ Banking APIs (Plaid, TrueLayer)
3. ✅ Loan Documents (PDF parsing or manual entry)
4. ✅ Transaction Management System
5. ✅ Funding Platform APIs (optional)

**Key Data Points** (Top 10):
1. Total Debt
2. Cash Balance
3. EBITDA (trailing 12 months)
4. Interest Expense
5. Transaction History (90 days)
6. AR Aging Buckets
7. Monthly Burn Rate
8. Covenant Thresholds
9. Bank Account Balances
10. Company Revenue & Growth Rate

**Implementation Effort**:
- **Phase 1** (Core): 2-3 weeks
- **Phase 2** (Advanced): 3-4 weeks
- **Phase 3** (AI/ML): 4-6 weeks

---

**Document Version**: 1.0  
**Last Updated**: January 2, 2026  
**Status**: Production Ready
