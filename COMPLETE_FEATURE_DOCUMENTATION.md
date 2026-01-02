# CFO Command Center - Complete Feature Documentation

## Application Overview
**MyGlobalCFO** is an Enterprise CFO Command Center designed to automate finance operations, reconciliations, and reporting across multi-entity organizations in real time.

---

## 📱 Main Navigation Sections

### 1. **TRANSACTIONS PAGE** (`/dashboard/transactions`)

#### Features:
- **Transaction Management Table**
  - Sortable columns: Date, Amount
  - Real-time transaction display
  - Multi-currency support
  
#### Filtering System:
- **Date Filter**: Filter by specific date
- **Description Filter**: Text search
- **Type Filter**: 
  - Invoice
  - Bill
  - Bank Transaction
  - Journal Entry
- **Category Filter**:
  - Sales
  - Marketing
  - Operations
  - Technology
  - Administration
- **Source Filter**:
  - Email
  - Xero
  - TrueLayer
  - Manual
- **Status Filter**:
  - Matched
  - Pending
  - Unmatched

#### Actions:
- 🔄 **Clear Filters**: Reset all filters
- **Generate Demo Data**: Create sample transactions
- 🗑️ **Clear All Data**: Delete all transactions
  
#### Display Elements:
- Badge indicators for transaction type
- Badge indicators for source
- Color-coded reconciliation status badges
- Currency formatting
- Empty state when no data available (respects Mock Data toggle)

---

### 2. **RECONCILIATION PAGE** (`/dashboard/reconciliation`)

#### Features:
- **Bank Reconciliation Dashboard**
- **Status Cards**:
  - **Matched Transactions**: Count of successfully matched items
  - **Pending Transactions**: Count of items awaiting review
  - **Unmatched Transactions**: Count of items requiring attention

#### Actions:
- 🔄 **Auto-Reconcile**: Automatically match bank transactions with accounting records

#### Display:
- Real-time status counts
- Color-coded status cards (green for matched, yellow for pending, red for unmatched)
- Empty state support when mock data is OFF

---

### 3. **ENTITY KPIs PAGE** (`/dashboard/entity-kpis`)

#### Features:
- **Group Performance Summary** (Multi-Entity View)
  - Total Revenue across all entities
  - Total EBITDA
  - Group Margin %
  - Total Cash position

#### Individual Entity KPIs:
Each entity card displays:
- **Revenue**: Current revenue figure
- **EBITDA**: Earnings Before Interest, Taxes, Depreciation, and Amortization
- **EBITDA Margin %**: Profitability metric
- **Revenue Growth %**: Year-over-year growth
- **Cash Balance**: Available cash
- **Runway**: Days of operation remaining (based on burn rate)
- **Monthly Burn Rate**: Cash consumed per month
- **Quick Ratio**: Liquidity measure

#### Status Indicators:
- ✅ **Healthy**: Green badge
- ⚠️ **Warning**: Yellow badge
- 🔴 **Critical**: Red badge

#### Color Coding:
- Positive metrics: Green
- Warning metrics: Yellow
- Negative/Critical metrics: Red

#### Actions:
- 🔄 **Refresh KPIs**: Reload real-time data
- 📊 **View Details**: Drill down into entity specifics

---

### 4. **REPORTS PAGE** (`/dashboard/reports`)

#### Report Types:

**A. AR Aging Analysis**
- **Current**: Outstanding amount (0-30 days)
- **30 Days**: Outstanding amount (30-60 days)
- **60 Days**: Outstanding amount (60-90 days)
- **90+ Days**: Overdue amounts (90+ days)

**B. Cost Center Breakdown**
- Top cost centers by amount
- Individual cost center names
- Amount spent per cost center

#### Features:
- Real-time financial reporting
- Currency-formatted values
- Breakdown by aging categories
- Visual display of top spending areas

---

### 5. **INTEGRATIONS PAGE** (`/dashboard/integrations`)

This page has **TWO TABS**:

#### **Tab 1: ERP Integrations (14 Platforms)**

**Platform Categories:**

**Enterprise ERPs:**
1. **NetSuite** (Oracle) - OAuth2, TBA authentication
2. **Microsoft Dynamics 365 Finance** - OAuth2
3. **Microsoft Dynamics 365 Business Central** - OAuth2
4. **SAP S/4HANA** - OAuth2, API Key
5. **Workday Finance** - OAuth2

**SMB Accounting Platforms:**
6. **Zoho Books** - OAuth2, API Key
7. **FreeAgent** (UK-focused) - OAuth2
8. **FreshBooks** - OAuth2
9. **Clear Books** (UK) - OAuth2, API Key
10. **Crunch Accounting** (UK) - OAuth2
11. **KashFlow** (UK) - API Key
12. **QuickBooks Online** - OAuth2 ✅ CONNECTED
13. **Xero** - OAuth2 ✅ CONNECTED (User has active connection)
14. **Sage** - OAuth2 ✅ CONNECTED

#### Features per Platform:
- **Connection Status Badges**:
  - ✅ Connected (Green)
  - ⚠️ Error (Red)
  - 🕐 Syncing (Gray)
  - Not Connected (Gray)
  
- **Platform Information**:
  - Category (Enterprise/SMB)
  - Description
  - Authentication methods supported
  - Last sync timestamp

- **Actions**:
  - **Connect**: Initiate OAuth2 flow
  - **Sync**: Trigger data synchronization
  - **Disconnect**: Remove integration
  
- **Filter Tabs**:
  - All Platforms (14)
  - Enterprise (5 platforms)
  - SMB (9 platforms)

- **Sync All Button**: Synchronize all connected platforms

#### **Tab 2: Other Integrations**

**Available Integrations:**
- **Email Integrations**:
  - Gmail (OAuth2)
  - Outlook (OAuth2)
- **Banking**:
  - TrueLayer (Bank feed integration)
  
**OAuth2 Setup Flow:**
1. Click "Connect"
2. Enter Client ID & Client Secret
3. Authorize via popup window
4. Connection established

**Features:**
- Test Connection button
- Configure Settings button
- Delete integration option
- Connection status tracking
- Credential management

---

### 6. **FINANCE SOURCING PAGE** (`/dashboard/finance-sourcing`)

#### Features:
- **AI-Powered Finance Recommendations**
- **Finance Option Cards** displaying:
  - **Type Badge**: Loan, Credit Line, Grant, etc.
  - **Provider**: Name of financial institution
  - **Interest Rate %**: Cost of borrowing
  - **Amount Range**: Available funding range
  - **Eligibility**: Requirements to qualify
  - **Source URL**: Link to provider details

#### Actions:
- 🔍 **Search Options**: Find finance opportunities matched to your business profile

#### Display:
- Card-based layout for each option
- External links to provider websites
- Empty state when no options loaded

---

### 7. **AI ADVISOR PAGE** (`/dashboard/ai-advisor`)

#### Features:
- **AI Financial Chat Interface** (Embedded iframe)
- **Natural Language Queries** about finances
- **Multi-Session Support**
- **Entity-Specific Context**

#### Core Capabilities:
- **Session Management**:
  - Create new chat sessions
  - Load previous conversations
  - Session history tracking

- **Entity Selection**:
  - Choose which company/entity to query about
  - Context-aware responses based on selected entity

- **Suggested Questions**:
  - Pre-built financial queries
  - Entity-specific question templates
  - Quick-start conversation topics

- **Voice Input**:
  - Speech recognition support
  - Microphone integration
  - Voice-to-text conversion

- **Access Control**:
  - Admin-controlled access
  - User authorization system
  - Permission-based feature availability

#### AI Features:
- Financial trend analysis
- Cash flow insights
- Predictive analytics
- Custom financial queries
- Context-aware responses based on company data

---

### 8. **FP&A (FINANCIAL PLANNING & ANALYSIS) MODULE** (`/dashboard/fpa/overview`)

This is a **COMPREHENSIVE PLANNING SUITE** with multiple subsections:

#### **FP&A Navigation Tabs:**

#### **A. Overview** (`/dashboard/fpa/overview`)

**Quick Stats Dashboard:**
- **Planning Dimensions**: Total count of all dimensions
  - Entities count
  - Departments count
  - Accounts count
  - Products count
  - Customer Segments count
  - Geographies count

- **Planning Versions**: Count of budgets, forecasts, scenarios
- **Drivers & Formulas**: Driver-based modeling count
- **Integrations**: Connected platforms count

**Recent Planning Versions List:**
- Version name
- Type badge (Budget/Forecast/Actuals/Scenario)
- Time period (start to end)
- Rolling indicator badge
- Click to navigate to planning page

**Quick Actions:**
- Budget & Forecast
- Manage Drivers
- Setup Integrations
- User Permissions
- Setup Dimensions

**Feature Highlights:**
- Multi-Dimensional Planning card
- Driver-Based Modeling card
- Rolling Forecasts card

---

#### **B. Planning** (`/dashboard/fpa/planning`)

**Planning Version Management:**
- **Create New Versions**:
  - Name
  - Version Type: Budget, Forecast, Actuals, Scenario
  - Fiscal Year
  - Start Period (Month/Year)
  - End Period (Month/Year)
  - Rolling Forecast toggle
  - Rolling Months count (12-18)

**Planning Grid:**
- Multi-dimensional data entry
- Filter by:
  - Entity
  - Department
  - Time Period
  - Account

**Features:**
- Lock/Unlock version editing
- AI-Powered Forecast generation
- AI Insights analysis
- Driver Values Manager
- Real-time data entry
- Version comparison
- Export capabilities

**AI Features:**
- **AI Forecast**: Generate predictions based on historical data
- **AI Insights**: Get analysis on planning data
  
---

#### **C. Drivers** (`/dashboard/fpa/drivers`)

**Driver-Based Planning:**
- Create operational drivers
- Define formulas
- Link drivers to accounts
- Real-time recalculation
- Driver libraries

**Driver Types:**
- Revenue drivers (headcount, pricing, volume)
- Cost drivers (per-unit costs, fixed costs)
- Operational drivers (efficiency metrics)

---

#### **D. Setup Integrations** (`/dashboard/fpa/setup-integrations`)

Connect FP&A module to data sources:
- ERP systems
- Accounting platforms
- Data warehouses
- Custom APIs

---

#### **E. Scenarios** (`/dashboard/fpa/scenario-planning`)

**Scenario Planning Features:**
- Create what-if scenarios
- Model different business outcomes
- Compare scenarios side-by-side
- Sensitivity analysis
- Risk modeling

**Scenario Types:**
- Best case
- Worst case
- Most likely
- Custom scenarios

---

#### **F. Rolling Forecast** (`/dashboard/fpa/rolling-forecast`)

**Automated Rolling Forecasts:**
- 12-18 month rolling window
- Automatic period updates
- Actuals integration
- Continuous planning approach
- Forecast vs Actuals comparison

---

#### **G. User Permissions** (`/dashboard/fpa/user-permissions`)

**Access Control:**
- User role management
- Dimension-level permissions
- Version access control
- Read/Write/Admin permissions

---

### 9. **SETTINGS PAGE** (`/dashboard/settings`)

#### **Settings Categories:**

#### **A. Main Menu**
Navigation to different settings sections:
- Color Customization
- KPI Configuration
- Dashboard Layout
- Entity Groups Management
- AI Advisor Settings

#### **B. Color Customization**
- **Primary Color Picker**: Main theme color
- **Secondary Color Picker**: Accent color
- **Background Color Picker**: Page background
- **Text Color Picker**: Typography color
- **Real-time Preview**: See changes immediately
- **Save/Reset Options**

#### **C. KPI Configuration**
Customize dashboard KPIs:
- **Available KPIs**:
  - Total Group Revenue
  - Group EBITDA
  - Total Group Cash
  - Group Runway
- **Toggle Enable/Disable** each KPI
- **Reorder KPIs** (drag and drop)
- **Custom KPI labels**

#### **D. Dashboard Layout**
- Grid layout customization
- Widget positioning
- Responsive design settings

#### **E. Entity Groups Management**

**Create Entity Groups:**
- Group Name
- Description
- Select multiple entities to group
- Save group

**Edit Groups:**
- Modify group name
- Update description
- Add/remove entities
- Delete group

**Use Cases:**
- Regional grouping (EMEA, APAC, Americas)
- Business unit grouping
- Legal entity grouping
- Custom consolidation views

#### **F. Company/Entity Management**
- **Add New Company**:
  - Company Name
  - Country
  - Currency
  - Company Type: Standalone, TopCo, Subsidiary
  - Parent Company selection (for subsidiaries)

- **View All Entities**:
  - Entity list
  - Entity details
  - Delete entity option

#### **G. AI Advisor Settings** (Admin Only)
- **Global Enable/Disable**: Turn AI Advisor on/off for organization
- **User Authorization**:
  - List all users
  - Toggle AI access per user
  - Authorized users list
- **Save Settings**

---

## 🎯 CFO COMMAND CENTER (`/dashboard/fpa/command-center`)

### **Strategic Analytics Dashboard**

#### **Header Section:**
- Page title: "Command Centre"
- Subtitle: "Strategic Analytics & Sync Layer"
- Refresh button

#### **AI Executive Summary Card:**
- 📈 AI-generated narrative summary
- Real-time insights
- Gradient blue background

#### **Anomaly Detection Alerts:**
- 🚨 Anomalies Detected count
- Individual anomaly cards showing:
  - Metric name
  - Current value
  - Expected range
  - Deviation percentage
  - Color-coded (red for over, green for under)

#### **Global Liquidity Strip:**
Top-level liquidity metrics:
- Total cash across all entities
- Available credit lines
- Short-term investments
- Total liquidity position
- Runway calculation

#### **Four Strategic Quadrants:**

**Quadrant 1: Profitability & Unit Economics**
- Revenue metrics
- EBITDA analysis
- Margin trends
- Unit economics breakdown
- Customer acquisition cost
- Lifetime value

**Quadrant 2: Operational Efficiency**
- Days Sales Outstanding (DSO)
- Days Payable Outstanding (DPO)
- Cash conversion cycle
- Inventory turnover
- Operating expense ratio
- Headcount efficiency

**Quadrant 3: Strategic What-If**
- Scenario modeling
- Impact analysis
- Sensitivity testing
- Strategic decisions modeling
- Investment impact

**Quadrant 4: Sync Status**
- ERP sync status
- Last sync timestamps
- Data freshness indicators
- Integration health
- Sync error alerts
- Platform connection status

---

## 🔐 **Authentication & User Management**

### **Landing Page** (`/`)
- Hero section
- Feature showcase
- Sign In / Sign Up forms
- Password reset flow

### **User Features:**
- JWT token authentication
- bcrypt password hashing
- Role-based access (admin/tenant)
- Multi-user support
- Session management

---

## 🛠️ **Global Features (Available Across App)**

### **Mock Data Toggle** (In Header)
- **Purpose**: Switch between mock data and real data
- **Location**: Main dashboard header
- **Persistence**: localStorage
- **Impact**: Affects all pages
- **States**: 
  - ON: Show mock/demo data
  - OFF: Show only real data (empty states if no data)

### **Entity/Company Selector** (In Header)
- Dropdown to switch between companies
- Multi-entity support
- Filters data by selected entity

### **Currency Support**
- Multi-currency transactions
- Currency conversion
- Per-entity currency settings
- FP&A module has dedicated currency selector

---

## 📊 **Data Models & Dimensions**

### **7-Dimensional Planning Model:**
1. **Entity**: Legal entities, companies, subsidiaries
2. **Department**: Cost centers, business units
3. **Time**: Months, quarters, fiscal years
4. **Account**: P&L accounts, balance sheet accounts
5. **Product**: Product lines, SKUs
6. **Customer Segment**: B2B, B2C, Enterprise, SMB
7. **Geography**: Regions, countries, branches

---

## 🔗 **Integration Capabilities**

### **ERP/Accounting (14 Platforms)**
- Xero ✅
- QuickBooks ✅
- Sage ✅
- NetSuite
- Microsoft Dynamics 365 (Finance & Business Central)
- SAP S/4HANA
- Workday Finance
- Zoho Books
- FreeAgent, FreshBooks, Clear Books, Crunch, KashFlow

### **Email Integrations**
- Gmail (OAuth2)
- Outlook (OAuth2)
- Attachment extraction
- Invoice parsing

### **Banking**
- TrueLayer (Real-time bank feeds)
- Transaction reconciliation
- Cash flow tracking

---

## 🤖 **AI-Powered Features**

### **AI Financial Advisor**
- Natural language queries
- Entity-specific insights
- Session-based conversations
- Voice input support
- Suggested questions

### **AI Planning Tools**
- AI-Powered Forecasting
- Anomaly Detection
- Predictive analytics
- Insight generation
- Narrative summaries

### **AI Document Parsing**
- GPT-5 powered extraction
- Invoice data extraction
- Receipt processing
- Statement parsing

---

## 📈 **Reporting & Analytics**

### **Available Reports:**
- AR Aging Analysis
- Cost Center Breakdown
- Entity Performance KPIs
- Group Consolidation
- Transaction Reports
- Reconciliation Status
- Cash Flow Analysis
- Profitability Analysis
- Operational Efficiency Metrics

---

## 🎨 **UI/UX Features**

### **Design System:**
- Shadcn UI components
- Responsive design (mobile, tablet, desktop)
- Dark mode support (via color customization)
- Drag-and-drop interfaces
- Real-time previews
- Loading states
- Empty states
- Error states

### **Interactive Elements:**
- Sortable tables
- Filterable data grids
- Searchable dropdowns
- Date pickers (Month/Year pickers)
- Color pickers
- Toast notifications
- Dialog modals
- Badge indicators
- Charts (Recharts library)

---

## 🔒 **Security & Permissions**

### **Access Control:**
- JWT authentication
- Role-based permissions (Admin/Tenant)
- User authorization per feature
- API key encryption
- OAuth2 secure flows
- Credential management

### **Data Security:**
- Encrypted credential storage
- Secure token handling
- CORS configuration
- Environment variable management

---

## 📱 **Technical Stack Summary**

### **Frontend:**
- React
- React Router
- Axios
- Shadcn UI
- Tailwind CSS
- Recharts
- React Grid Layout
- Lucide Icons

### **Backend:**
- FastAPI (Python)
- MongoDB (Motor async driver)
- JWT authentication
- Bcrypt
- Pydantic models

### **Integrations:**
- OAuth2 flows
- REST APIs
- WebSockets (for real-time updates)
- Speech Recognition API (Web Speech API)

---

## 🎯 **Key Value Propositions**

### **For CFOs:**
1. **Single Pane of Glass**: All financial data in one place
2. **Real-Time Insights**: Live data from 14+ ERPs
3. **AI-Powered Decisions**: Predictive analytics and recommendations
4. **Multi-Entity Consolidation**: Group-level reporting
5. **Strategic Planning**: FP&A suite with driver-based modeling
6. **Automated Reconciliation**: Save hours of manual work
7. **Anomaly Detection**: Catch issues before they become problems

### **For Finance Teams:**
1. **Automated Data Entry**: Reduce manual work
2. **Driver-Based Planning**: Model complex scenarios
3. **Rolling Forecasts**: Always up-to-date predictions
4. **Collaborative Planning**: Multi-user permissions
5. **Audit Trail**: Track all changes
6. **Custom Reporting**: Build what you need

---

## 📝 **Summary Statistics**

- **Total Pages**: 25+ unique pages
- **FP&A Module Pages**: 8 subsections
- **ERP Integrations**: 14 platforms
- **Planning Dimensions**: 7 dimensions
- **Report Types**: 10+ report types
- **AI Features**: 5+ AI-powered capabilities
- **API Endpoints**: 40+ backend APIs
- **UI Components**: 50+ reusable components

---

*This documentation covers the complete feature set as of January 2, 2026.*
