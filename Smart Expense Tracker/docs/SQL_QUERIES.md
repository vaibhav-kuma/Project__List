# SQL Queries for Expense Tracker

## 1. Get Monthly Expense Summary by Category
```sql
SELECT 
    c.name as category_name, 
    SUM(e.amount) as total_spent
FROM expenses e
JOIN categories c ON e.category_id = c.id
WHERE e.user_id = $USER_ID 
  AND e.date >= DATE_TRUNC('month', CURRENT_DATE)
  AND e.date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY c.name
ORDER BY total_spent DESC;
```

## 2. Calculate Total Owed/Owing in a Group
```sql
-- This requires checking SharedExpenses where we are the debtor, 
-- minus SharedExpenses where we paid (if the model assumes payer pays full initially).
-- Simplified logic: Net Balance usually = (Paid Amount) - (Share Amount)

SELECT 
    u.username,
    COALESCE(paid.total_paid, 0) - COALESCE(share.total_share, 0) as net_balance
FROM group_members gm
JOIN users u ON gm.user_id = u.id
LEFT JOIN (
    SELECT user_id, SUM(amount) as total_paid
    FROM expenses 
    WHERE group_id = $GROUP_ID
    GROUP BY user_id
) paid ON u.id = paid.user_id
LEFT JOIN (
    SELECT user_id, SUM(amount_owed) as total_share
    FROM shared_expenses se
    JOIN expenses e ON se.expense_id = e.id
    WHERE e.group_id = $GROUP_ID
    GROUP BY user_id
) share ON u.id = share.user_id
WHERE gm.group_id = $GROUP_ID;
```

## 3. Get Spending Trend for Last 6 Months
```sql
SELECT 
    TO_CHAR(date, 'YYYY-MM') as month_year, 
    SUM(amount) as total
FROM expenses
WHERE user_id = $USER_ID
  AND date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
GROUP BY 1
ORDER BY 1 ASC;
```

## 4. Find Top 5 Spending Categories
```sql
SELECT c.name, SUM(e.amount) as total_spent
FROM expenses e
JOIN categories c ON e.category_id = c.id
WHERE e.user_id = $USER_ID
GROUP BY c.name
ORDER BY total_spent DESC
LIMIT 5;
```

## 5. Calculate Each Member's Share in Group Expense
```sql
-- Retrieve the breakdown for a specific expense
SELECT 
    u.username, 
    se.amount_owed
FROM shared_expenses se
JOIN users u ON se.user_id = u.id
WHERE se.expense_id = $EXPENSE_ID;
```

## 6. Get Pending Settlements for a User
```sql
SELECT 
    s.id,
    payer.username as payer_name,
    payee.username as payee_name,
    s.amount,
    g.name as group_name
FROM settlements s
JOIN users payer ON s.payer_id = payer.id
JOIN users payee ON s.payee_id = payee.id
JOIN groups g ON s.group_id = g.id
WHERE (s.payer_id = $USER_ID OR s.payee_id = $USER_ID)
  AND s.status = 'pending';
```

## 7. Search Expenses by Date Range and Category
```sql
SELECT e.*, c.name as category_name
FROM expenses e
JOIN categories c ON e.category_id = c.id
WHERE e.user_id = $USER_ID
  AND e.date BETWEEN $START_DATE AND $END_DATE
  AND c.id = $CATEGORY_ID
ORDER BY e.date DESC;
```
