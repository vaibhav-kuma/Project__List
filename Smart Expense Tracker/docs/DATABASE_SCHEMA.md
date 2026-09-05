# Database Schema Design

## 1. Tables Structure

### `users`
Stores user profile and authentication details.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, Default: uuid_generate_v4() | Unique User ID |
| `username` | VARCHAR(50) | NOT NULL | Display name |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| `password_hash` | VARCHAR(255) | NOT NULL | Hashed password |
| `profile_pic_url` | TEXT | NULL | Avatar URL |
| `created_at` | TIMESTAMP | Default: NOW() | |

### `categories`
Expense categories. Can be system default or user-specific.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Category ID |
| `name` | VARCHAR(50) | NOT NULL | e.g. "Food", "Rent" |
| `type` | VARCHAR(20) | CHECK (in ('income', 'expense')) | Category type |
| `user_id` | UUID | FK `users.id`, NULL | Shared if NULL, private if set |
| `icon` | VARCHAR(50) | NULL | Icon identifier |

### `groups`
Bill splitting groups.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Group ID |
| `name` | VARCHAR(100) | NOT NULL | Group Name |
| `created_by` | UUID | FK `users.id` | Admin of group |
| `created_at` | TIMESTAMP | Default: NOW() | |

### `group_members`
Association between users and groups.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `group_id` | UUID | FK `groups.id` | Composite PK |
| `user_id` | UUID | FK `users.id` | Composite PK |
| `joined_at` | TIMESTAMP | Default: NOW() | |

### `expenses`
Records individual expenses. If `group_id` is present, it's a shared expense.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | Expense ID |
| `user_id` | UUID | FK `users.id` | Who paid/created it |
| `group_id` | UUID | FK `groups.id`, NULL | If part of a group |
| `category_id` | UUID | FK `categories.id` | |
| `amount` | DECIMAL(10,2) | NOT NULL | Total amount |
| `description` | TEXT | NULL | Note/Description |
| `date` | DATE | NOT NULL | Expense date |
| `created_at` | TIMESTAMP | Default: NOW() | |

### `shared_expenses`
Defines the split details for a group expense (who owes what).
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `expense_id` | UUID | FK `expenses.id` | The parent expense |
| `user_id` | UUID | FK `users.id` | The user who owes/shares this |
| `amount_owed` | DECIMAL(10,2) | NOT NULL | Amount this user is responsible for |
| `percentage` | DECIMAL(5,2) | NULL | If split by % |

### `settlements`
Payments between users to settle debts.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `group_id` | UUID | FK `groups.id` | Context of settlement |
| `payer_id` | UUID | FK `users.id` | Who is paying |
| `payee_id` | UUID | FK `users.id` | Who gets paid |
| `amount` | DECIMAL(10,2) | NOT NULL | |
| `date` | DATE | Default: NOW() | |
| `status` | VARCHAR(20) | 'pending', 'completed' | |

### `budgets`
Monthly budget limits per category.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `user_id` | UUID | FK `users.id` | |
| `category_id` | UUID | FK `categories.id` | |
| `amount_limit` | DECIMAL(10,2) | NOT NULL | Max budget |
| `month` | INT | Check (1-12) | |
| `year` | INT | | |

### `receipts`
Scanned receipt metadata.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK | |
| `expense_id` | UUID | FK `expenses.id` | Linked expense |
| `image_url` | TEXT | NOT NULL | Cloud storage URL |
| `scanned_at` | TIMESTAMP | Default: NOW() | |
| `raw_text` | TEXT | NULL | OCR Output |

## 2. Relationships Diagram (Textual)
*   **User** (1) ---- (N) **Expenses**
*   **User** (1) ---- (N) **Groups** (via GroupMembers)
*   **Group** (1) ---- (N) **Expenses**
*   **Expense** (1) ---- (N) **SharedExpenses** (Split details)
*   **Expense** (1) ---- (1) **Receipt**
*   **User** (1) ---- (N) **Settlements** (as payer or payee)

## 3. Indexes
*   `expenses`: `idx_expenses_user_date` (user_id, date) - For querying monthly history.
*   `expenses`: `idx_expenses_group` (group_id) - For retrieving group expenses.
*   `shared_expenses`: `idx_shared_expense_user` (user_id) - To calc total debt.
*   `users`: `idx_users_email` (unique) - Login lookup.
