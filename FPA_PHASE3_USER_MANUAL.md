# Driver-Based Financial Modeling
## User Manual - Phase 3

**MyGlobalCFO | Financial Planning & Analysis Module**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Accessing the FP&A Module](#accessing-the-fpa-module)
3. [Managing Operational Drivers](#managing-operational-drivers)
4. [Creating and Managing Formulas](#creating-and-managing-formulas)
5. [Entering Driver Values](#entering-driver-values)
6. [Viewing Calculated Results](#viewing-calculated-results)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is Driver-Based Modeling?

Driver-based modeling is a financial planning approach that links operational metrics (drivers) to financial outcomes through mathematical formulas. Instead of manually entering budget values for every account, you define the key drivers that influence your business and let the system calculate financial results automatically.

### Benefits

✅ **Save Time:** Eliminate manual calculations  
✅ **Increase Accuracy:** Reduce human errors  
✅ **Gain Flexibility:** Easily adjust assumptions and see immediate impact  
✅ **Ensure Consistency:** Calculations are uniform across all periods  
✅ **Enable Scenario Analysis:** Quickly model different business scenarios

### How It Works

1. **Define Drivers:** Create operational metrics (e.g., headcount, units sold, prices)
2. **Build Formulas:** Link drivers to financial accounts with mathematical expressions
3. **Enter Values:** Input actual driver values for specific time periods
4. **Auto-Calculate:** System automatically calculates financial account values
5. **Review Results:** View calculated planning data in your forecast

---

## Accessing the FP&A Module

### Step 1: Navigate to FP&A

From your main dashboard, click on the **FP&A** tab in the navigation menu.

![Dashboard with FP&A Tab](screenshots/manual_01_dashboard_fpa_tab.png)
*The FP&A tab is located in the main navigation bar*

### Step 2: Choose a Section

The FP&A module has five main sections:

- **Overview:** Dashboard view of your planning activity
- **Planning:** Main planning interface with driver values
- **Drivers:** Manage operational drivers and formulas
- **Setup Integrations:** Connect to accounting systems
- **User Permissions:** Manage team access (admin only)

---

## Managing Operational Drivers

### What are Operational Drivers?

Operational drivers are the key metrics that drive your business performance. Examples include:

- **Headcount:** Number of employees in different departments
- **Units:** Products or services sold
- **Currency:** Prices, salaries, costs
- **Percentage:** Growth rates, inflation, margins

### Viewing Existing Drivers

1. Click on the **Drivers** tab in the FP&A module
2. The **Operational Drivers** tab shows all your current drivers

![Drivers Overview](screenshots/manual_02_drivers_overview.png)
*Drivers page showing operational drivers and formulas*

Each driver card displays:
- **Name:** Descriptive name of the driver
- **Type Badge:** Color-coded badge indicating driver type
  - 🔵 Blue = Headcount
  - 🟠 Orange = Currency  
  - 🟢 Green = Units
  - 🟣 Purple = Percentage
- **Code:** Short code used in formulas (e.g., HC_SALES, UNITS_SOLD)
- **Unit:** Measurement unit (employees, units, USD, %)
- **Description:** What this driver represents

![Drivers List](screenshots/manual_03_drivers_list.png)
*Example of operational drivers with different types*

### Creating a New Driver

#### Step 1: Open the Create Dialog

Click the **+ New Driver** button in the top right corner.

![Create Driver Dialog Empty](screenshots/manual_04_create_driver_empty.png)
*Empty create driver form*

#### Step 2: Fill in Driver Details

Complete the following fields:

**Driver Name** (required)
- Enter a descriptive name for your driver
- Example: "Customer Support Headcount"

**Driver Code** (required)
- Use uppercase letters and underscores
- This code will be used in formulas
- Example: "HC_SUPPORT"
- 💡 Tip: Keep codes short but meaningful

**Type** (required)
- Select from the dropdown:
  - **Headcount:** For employee counts
  - **Units:** For quantities sold/produced
  - **Percentage:** For rates and ratios
  - **Currency:** For monetary values
  - **Custom:** For any other metric

**Unit** (optional)
- Specify the unit of measurement
- Examples: "employees", "units", "%", "USD"

**Description** (optional)
- Provide context about what this driver represents
- Example: "Number of customer support team members"

![Create Driver Filled](screenshots/manual_05_create_driver_filled.png)
*Completed driver creation form*

#### Step 3: Create the Driver

Click the **Create Driver** button. You'll see a success notification, and your new driver will appear in the list.

### Editing or Deleting Drivers

- **Edit:** Currently, drivers need to be deleted and recreated to modify
- **Delete:** Click the trash icon (🗑️) on any driver card
  - Note: You cannot delete drivers that are used in active formulas

---

## Creating and Managing Formulas

### What are Formulas?

Formulas are mathematical expressions that link your operational drivers to financial accounts. When driver values change, formulas automatically recalculate the corresponding account values.

### Viewing Formulas

1. Navigate to the **Drivers** page
2. Click the **Formulas** tab

![Formulas Tab](screenshots/manual_06_formulas_tab.png)
*Formulas tab showing existing formulas*

Each formula card shows:
- **Formula Name:** Descriptive name
- **Target Account:** Which account this formula calculates
- **Expression:** The mathematical formula
- **Dependencies:** Which drivers are used

### Creating a New Formula

#### Step 1: Open the Create Dialog

Click the **+ New Formula** button.

![Create Formula Empty](screenshots/manual_07_create_formula_empty.png)
*Empty formula creation form*

#### Step 2: Fill in Formula Details

**Formula Name** (required)
- Give your formula a descriptive name
- Example: "Gross Profit"

**Target Account** (required)
- Select which financial account this formula will calculate
- Example: "Gross Profit (account)"

**Formula Expression** (required)
- Write your mathematical formula using driver codes
- Example: `REVENUE - COGS`
- Example: `UNITS_SOLD * AVG_PRICE`
- Example: `HC_SALES * AVG_SALARY * (1 + INFLATION / 100)`

**Supported Operations:**
- Basic: `+`, `-`, `*`, `/`, `()`
- Functions: `abs()`, `round()`, `min()`, `max()`, `sum()`, `pow()`, `sqrt()`

**Dependencies** (required)
- List all driver codes used in your expression
- Separate with commas
- Example: "REVENUE, COGS"
- Example: "UNITS_SOLD, AVG_PRICE"

![Create Formula Filled](screenshots/manual_08_create_formula_filled.png)
*Completed formula creation form*

#### Step 3: Validate Your Formula

Before creating, click the **Validate Formula** button to check for errors.

![Formula Validation](screenshots/manual_09_formula_validation.png)
*Validation shows if formula is correct*

✅ **Valid Formula:** Green checkmark with success message  
❌ **Invalid Formula:** Red X with error details

Common validation errors:
- Missing dependencies in the expression
- Invalid syntax
- Using forbidden keywords

#### Step 4: Create the Formula

Once validation passes, click the **Create Formula** button. The formula will appear in your list and start working immediately.

### Formula Examples

**Example 1: Revenue Calculation**
```
Expression: UNITS_SOLD * AVG_PRICE
Dependencies: UNITS_SOLD, AVG_PRICE
Result: Total revenue from unit sales
```

**Example 2: Salary Expense**
```
Expression: HC_SALES * AVG_SAL_SALES * (1 + INFLATION / 100) / 12
Dependencies: HC_SALES, AVG_SAL_SALES, INFLATION
Result: Monthly salary expense adjusted for inflation
```

**Example 3: Cost of Goods Sold**
```
Expression: UNITS_SOLD * COGS_PER_UNIT
Dependencies: UNITS_SOLD, COGS_PER_UNIT
Result: Total cost based on units and per-unit cost
```

---

## Entering Driver Values

### Step 1: Navigate to the Planning Page

Click on the **Planning** tab in the FP&A module.

![Planning Overview](screenshots/manual_10_planning_overview.png)
*Planning page with versions and filters*

### Step 2: Select a Planning Version

From the left sidebar, choose which planning version you want to work with:
- **Budget:** Annual budget planning
- **Forecast:** Updated forecasts
- **Scenario:** "What-if" scenarios

The selected version will be highlighted with a blue border.

### Step 3: Select a Time Period

In the filters section, use the **Period** dropdown to select a month.

![Select Period](screenshots/manual_11_select_period.png)
*Selecting a time period activates driver values section*

🔔 **Important:** The Driver Values section only appears after you select a time period.

### Step 4: Enter Driver Values

Scroll down to the **Driver Values** section. You'll see all your operational drivers listed.

![Driver Values Section](screenshots/manual_12_driver_values_section.png)
*Driver values interface for entering operational metrics*

For each driver:
1. **Review the driver information:**
   - Name and type badge
   - Driver code and unit
   - Description (if provided)

2. **Enter a value in the input field:**
   - Type the numeric value
   - The system will show a "Modified" badge

![Entering Values](screenshots/manual_13_entering_values.png)
*Entering driver values shows modified state*

3. **Save the value:**
   - Click the individual **Save** button (💾) next to each driver, OR
   - Use the **Save All** button at the top to save all modified values at once

![Modified State](screenshots/manual_14_modified_state.png)
*Modified badge indicates unsaved changes*

### Step 5: Confirm Auto-Calculation

After saving, you'll see:
- ✅ Success notification
- "Modified" badges clear
- Values are persisted

🔔 **Auto-Calculation Note:** When you save a driver value, all formulas that depend on that driver will automatically recalculate. This happens in real-time!

![More Drivers](screenshots/manual_15_more_drivers.png)
*Additional drivers in the list with helpful information*

The bottom of the Driver Values section shows helpful information about auto-calculation:

> 💡 **Auto-calculation:** When you save a driver value, all formulas that depend on this driver will automatically recalculate. Changes will be reflected in your planning data immediately.

---

## Viewing Calculated Results

### Step 1: Scroll to Planning Data

After entering and saving driver values, scroll down to the **Planning Data** section.

![Planning Data Calculated](screenshots/manual_16_planning_data_calculated.png)
*Planning data table showing auto-calculated values*

### Understanding the Planning Data Table

The table displays:

| Column | Description |
|--------|-------------|
| **Entity** | Legal entity or subsidiary |
| **Department** | Organizational department |
| **Account** | Financial account name |
| **Period** | Time period (YYYY-MM format) |
| **Value** | Calculated amount (formatted as currency) |
| **Notes** | Shows "Auto-calculated from formula" for driver-based values |

### Example Calculation

From the screenshot above, you can see:

**Revenue Calculation:**
- Account: Product Revenue
- Period: 2026-01
- Value: $50,000
- Formula: UNITS_SOLD (1000) × AVG_PRICE (50) = $50,000 ✅

**COGS Calculation:**
- Account: Cost of Goods Sold
- Period: 2026-01
- Value: $20,000
- Formula: UNITS_SOLD (1000) × COGS_PER_UNIT (20) = $20,000 ✅

### Filtering Results

Use the filter dropdowns at the top of the Planning page to narrow down your view:
- **Entity:** Filter by legal entity
- **Department:** Filter by department
- **Account:** Filter by specific account
- **Period:** Filter by time period

---

## Best Practices

### Driver Naming Conventions

✅ **DO:**
- Use clear, descriptive names: "Sales Headcount" not "HC1"
- Keep codes uppercase with underscores: `HC_SALES`, `UNITS_SOLD`
- Include units in the unit field: "employees", "USD", "%"
- Add helpful descriptions

❌ **DON'T:**
- Use spaces in codes: "HC SALES" ❌ → "HC_SALES" ✅
- Use special characters: "HC@SALES" ❌
- Make codes too long: "HEADCOUNT_SALES_TEAM" ❌ → "HC_SALES" ✅

### Formula Best Practices

✅ **DO:**
- Keep formulas simple and readable
- Break complex calculations into multiple formulas
- Document your logic in the formula name
- Validate formulas before saving
- Test with sample values

❌ **DON'T:**
- Create circular dependencies (A depends on B, B depends on A)
- Use hardcoded values (use drivers instead)
- Create overly complex expressions
- Skip validation

### Data Entry Tips

✅ **DO:**
- Enter driver values consistently (use the same units)
- Review calculated results after entering values
- Save frequently
- Use "Save All" for bulk updates

❌ **DON'T:**
- Mix units (e.g., thousands vs actual numbers)
- Forget to save changes
- Enter values without understanding the formula impact

---

## Troubleshooting

### Common Issues

#### Issue: Driver Values Section Not Appearing

**Symptom:** The Driver Values section is not visible on the Planning page.

**Solution:**
1. Make sure you've selected a planning version from the left sidebar
2. Select a time period from the Period filter
3. The section will appear automatically

#### Issue: Formula Not Calculating

**Symptom:** After saving driver values, the planning data doesn't update.

**Possible Causes:**
1. **Missing driver values:** Ensure ALL dependencies have values entered
2. **Wrong time period:** Check that driver values are entered for the correct period
3. **Formula error:** Go to Drivers → Formulas and verify the formula is active

**Solution:**
- Navigate to Planning page
- Select the same version and period
- Enter values for all required drivers
- Save and check Planning Data table

#### Issue: Formula Validation Fails

**Symptom:** Red X appears when validating a formula.

**Common Reasons:**
1. **Syntax error:** Check parentheses, operators
2. **Misspelled driver code:** Verify codes match exactly
3. **Missing dependency:** Add all used drivers to dependencies list
4. **Invalid operation:** Check for division by zero or invalid functions

**Solution:**
- Review the error message carefully
- Double-check driver codes (case-sensitive)
- Ensure all variables in expression are listed in dependencies
- Use simple test values to validate logic

#### Issue: Unexpected Calculation Results

**Symptom:** Calculated values don't match expected results.

**Debugging Steps:**
1. Check driver values are entered correctly
2. Review the formula expression for logic errors
3. Verify unit consistency (annual vs monthly, thousands vs actual)
4. Test formula with simple round numbers first

#### Issue: Cannot Delete a Driver

**Symptom:** Driver delete button doesn't work or shows error.

**Reason:** The driver is used in an active formula.

**Solution:**
1. Navigate to Drivers → Formulas
2. Find and delete formulas using that driver
3. Then delete the driver

### Getting Help

For additional assistance:
- **In-App Help:** Scroll to bottom of Drivers page for quick reference
- **Documentation:** Refer to technical documentation in `/app` folder
- **Support:** Contact your system administrator

---

## Appendix: Help Section

At the bottom of the Drivers & Formulas page, you'll find a helpful guide:

**💡 How Driver-Based Modeling Works**

1. **Create Drivers:** Define operational metrics like headcount, units sold, average salary
2. **Build Formulas:** Link drivers to financial accounts with mathematical expressions
3. **Auto-Calculate:** When you change a driver value, all dependent accounts recalculate automatically

**Example Formula:**
```
Salary Expense = HC_SALES * AVG_SALARY * (1 + INFLATION)
```

---

## Quick Reference Card

### Driver Types

| Type | Badge Color | Examples |
|------|-------------|----------|
| Headcount | 🔵 Blue | HC_SALES, HC_ENG |
| Units | 🟢 Green | UNITS_SOLD, UNITS_PRODUCED |
| Currency | 🟠 Orange | AVG_PRICE, AVG_SALARY, COGS_PER_UNIT |
| Percentage | 🟣 Purple | INFLATION, GROWTH_RATE |
| Custom | ⚫ Gray | Any other metric |

### Formula Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `A + B` |
| `-` | Subtraction | `A - B` |
| `*` | Multiplication | `A * B` |
| `/` | Division | `A / B` |
| `()` | Grouping | `(A + B) * C` |
| `abs()` | Absolute value | `abs(A - B)` |
| `round()` | Round number | `round(A * B)` |
| `min()` | Minimum | `min(A, B)` |
| `max()` | Maximum | `max(A, B)` |

### Workflow Summary

```
1. Create Drivers
   ↓
2. Build Formulas
   ↓
3. Select Version + Period
   ↓
4. Enter Driver Values
   ↓
5. Save Values
   ↓
6. View Auto-Calculated Results
```

---

## Glossary

**Driver:** An operational metric that influences financial results (e.g., headcount, units sold)

**Formula:** A mathematical expression that links drivers to financial accounts

**Driver Code:** A short, uppercase identifier used in formulas (e.g., HC_SALES)

**Planning Version:** A specific forecast scenario (Budget, Forecast, or Scenario)

**Time Period:** The month for which you're entering driver values (YYYY-MM format)

**Auto-Calculation:** The automatic recalculation of financial accounts when driver values change

**Dependencies:** The drivers required by a formula to perform its calculation

---

*Last Updated: December 2025*  
*Version: Phase 3*  
*MyGlobalCFO - Financial Planning & Analysis Module*
