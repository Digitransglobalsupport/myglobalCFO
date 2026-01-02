# Driver-Based Modeling - Quick Start Guide

**Get started with driver-based financial planning in 5 minutes!**

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Create Your First Driver (2 minutes)

1. Navigate to **FP&A** → **Drivers**
2. Click **+ New Driver**
3. Fill in:
   - **Name:** Units Sold
   - **Code:** UNITS_SOLD
   - **Type:** Units
   - **Unit:** units
4. Click **Create Driver** ✅

### Step 2: Create a Formula (2 minutes)

1. Click the **Formulas** tab
2. Click **+ New Formula**
3. Fill in:
   - **Name:** Revenue from Sales
   - **Account:** Select "Revenue" account
   - **Expression:** `UNITS_SOLD * AVG_PRICE`
   - **Dependencies:** UNITS_SOLD, AVG_PRICE
4. Click **Validate Formula**
5. If valid ✅, click **Create Formula**

### Step 3: Enter Values & See Magic! (1 minute)

1. Go to **FP&A** → **Planning**
2. Select a version (e.g., "2026 Annual Budget")
3. Select period: **2026-01**
4. Scroll to **Driver Values**
5. Enter:
   - UNITS_SOLD: **1000**
   - AVG_PRICE: **50**
6. Click **Save All**
7. Scroll down to see **$50,000 calculated automatically!** 🎉

---

## 💡 Common Formulas

### Revenue Formulas
```
Revenue = UNITS_SOLD * AVG_PRICE

Subscription Revenue = SUBSCRIBERS * MONTHLY_PRICE
```

### Cost Formulas
```
COGS = UNITS_SOLD * COST_PER_UNIT

Salary Expense = HEADCOUNT * AVG_SALARY / 12
```

### Margin Formulas
```
Gross Profit = REVENUE - COGS

Operating Income = REVENUE - COGS - OPEX
```

---

## 🎯 Best Practices

### ✅ DO
- Use clear driver names
- Keep formulas simple
- Validate before creating
- Save driver values frequently
- Review calculated results

### ❌ DON'T
- Use spaces in driver codes
- Create circular dependencies
- Skip validation
- Mix units (thousands vs actual)

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Driver Values not showing | Select version + period first |
| Formula not calculating | Enter ALL required driver values |
| Validation fails | Check driver codes match exactly |
| Can't delete driver | Delete formulas using it first |

---

## 📊 Example Scenario

**Goal:** Calculate monthly salary expense

**Step 1: Create Drivers**
- Driver 1: `HC_SALES` (Headcount, 5 employees)
- Driver 2: `AVG_SALARY` (Currency, $60,000)

**Step 2: Create Formula**
```
Formula: Monthly Salary Expense
Expression: HC_SALES * AVG_SALARY / 12
Dependencies: HC_SALES, AVG_SALARY
Target: Salary Expense account
```

**Step 3: Enter Values**
- HC_SALES = 5
- AVG_SALARY = 60,000

**Result:** $25,000 per month (5 × 60,000 / 12) ✅

---

## 🎓 Learning Path

1. ✅ **Start Here:** Create 2-3 simple drivers
2. ✅ **Next:** Build a basic formula (Revenue or COGS)
3. ✅ **Then:** Enter values and verify calculations
4. ✅ **Advanced:** Create multi-driver formulas with inflation/growth
5. ✅ **Expert:** Build complete P&L driven by 10-15 drivers

---

## 🆘 Need Help?

- **Full Manual:** See `/app/FPA_PHASE3_USER_MANUAL.md`
- **In-App Help:** Scroll to bottom of Drivers page
- **Examples:** Check pre-loaded sample drivers and formulas

---

**Time to first calculation: ~5 minutes**  
**Effort level: Low**  
**Value: High** 🚀

*Start building smarter forecasts today!*
