# UI/UX Design Specifications

## 1. Design System
*   **Primary Color**: `#6200EE` (Deep Purple) - Premium feel.
*   **Secondary Color**: `#03DAC6` (Teal) - For accents/success.
*   **Background**: `#121212` (Dark Mode) / `#F5F5F5` (Light Mode).
*   **Typography**: Inter or Roboto.

## 2. Screen Specifications

### Screen 1: Splash & Onboarding
*   **Layout**: Full screen slide with illustration + text + "Next/Skip" buttons.
*   **Slides**:
    1.  "Track your daily expenses easily."
    2.  "Split bills with friends instantly."
    3.  "Get insights on your spending habits."

### Screen 2: Login / Register
*   **Layout**: Logo at top, specific input fields (Email, Password), prominent "Login" button, "Forgot Password?" link.
*   **Components**: validation-enabled text inputs, social login buttons (Google/Apple).

### Screen 3: Home Dashboard
*   **Layout**:
    *   **Top**: Greeting + Profile Pic + Notification Bell.
    *   **Card**: "Total Spent This Month" vs "Budget".
    *   **Chart**: Mini pie chart of categories.
    *   **List**: "Recent Transactions" (limit 5).
    *   **FAB**: Floating Action Button (+) to add expense/scan receipt.

### Screen 4: Add Expense
*   **Layout**: Scrollable form.
*   **Inputs**: Amount (Large Text), Category (Grid/Dropdown), Date, Note.
*   **Camera Integration**: Button "Scan Receipt" that opens camera view.

### Screen 9: Group Detail
*   **Layout**:
    *   **Header**: Group Name + Total Expense.
    *   **Balances**: Card showing "You owe $X" or "You are owed $Y".
    *   **List**: Shared expenses sorted by date.
    *   **Action**: "Settle Up" button at the bottom.

## 3. Navigation Flow
*   **Auth Stack**: Onboarding -> Login/Register -> **MainApp**.
*   **Main App (Tab Navigator)**:
    *   Home (Dashboard)
    *   Groups (List of groups)
    *   Reports (Detailed charts)
    *   Profile (Settings)
*   **Modals**: Add Expense, Scan Receipt, Group Settings.
