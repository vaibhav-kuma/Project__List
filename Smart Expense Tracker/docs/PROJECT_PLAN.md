# Project Plan: Smart Expense Tracker & Bill Splitter

## 1. Project Folder Structure
We will follow a monorepo-style structure separating the mobile app and the backend API.

```
/smart-expense-tracker
├── /backend                 # Node.js Express API
│   ├── /src
│   │   ├── /config          # DB config, environment vars
│   │   ├── /controllers     # Route controllers
│   │   ├── /middleware      # Auth, validation, error handling
│   │   ├── /models          # Database models (Sequelize/TypeORM/Raw SQL)
│   │   ├── /routes          # API routes
│   │   ├── /services        # Business logic (OCR, calculations)
│   │   ├── /utils           # Helper functions
│   │   └── app.js           # App entry point
│   ├── .env
│   └── package.json
│
├── /mobile                  # React Native App
│   ├── /src
│   │   ├── /assets          # Images, fonts
│   │   ├── /components      # Reusable UI components
│   │   ├── /navigation      # React Navigation setup
│   │   ├── /screens         # Screen components
│   │   ├── /services        # API calls
│   │   ├── /store           # Redux slices
│   │   ├── /types           # TypeScript interfaces
│   │   ├── /utils           # Helpers
│   │   └── theme.ts         # Design tokens
│   ├── App.tsx
│   └── package.json
│
└── /docs                    # Documentation (User stories, schemas)
```

## 2. Features List

### MVP (Minimum Viable Product)
1.  **User Authentication**: Register, Login, JWT handling.
2.  **Expense Management**: Add, Edit, Delete manual expenses.
3.  **Categories**: Pre-defined and custom categories.
4.  **Groups & Bill Splitting**: Create groups, add members, split expenses (Equally/Unequally).
5.  **Settlements**: Calculate who owes whom and mark as settled.
6.  **Dashboard**: Weekly/Monthly summary of spending.

### Future Features
1.  **Receipt Scanning (OCR)**: Auto-extract details from images.
2.  **Budget Limits & Alerts**: Notifications when nearing limits.
3.  **Recurring Expenses**: Auto-add subscriptions.
4.  **Multi-currency Support**: Handle international trips.
5.  **Export Reports**: PDF/CSV export.
6.  **Social Login**: Google/Apple Auth.

## 3. User Roles
*   **Individual User**: Can manage personal expenses, view own reports, and manage profile.
*   **Group Admin**: Can create groups, add/remove members, and manage group settings. (Note: In this app, any user can likely create a group and be its admin).
*   **Group Member**: Can add expenses to the group and view group activity.

## 4. Tech Stack Recommendation
*   **Mobile App**: React Native (with TypeScript).
    *   *Why*: Cross-platform (iOS/Android), strong ecosystem, good performance.
    *   *UI Library*: React Native Paper (for Material Design) or NativeBase.
    *   *State Management*: Redux Toolkit.
*   **Backend**: Node.js with Express.
    *   *Why*: JavaScript everywhere, fast development, vast library support.
*   **Database**: PostgreSQL.
    *   *Why*: Relational data (User <-> Group <-> Expense) fits SQL perfectly. Robustness.
*   **OCR**: Tesseract.js (or Google Cloud Vision API for better accuracy in future).

## 5. Timeline Estimation (3 Months)

| Phase | Duration | Key Deliverables |
| :--- | :--- | :--- |
| **Month 1: Foundation & Backend** | Weeks 1-4 | - Database Schema Design<br>- API Setup (Auth, CRUD)<br>- Basic Bill Splitting Logic<br>- Folder Structure & CI/CD Setup |
| **Month 2: App Development (MVP)** | Weeks 5-8 | - UI/UX Implementation (Dashboard, Forms)<br>- State Management (Redux)<br>- Integration with Backend<br>- Group & Settlement Features |
| **Month 3: Advanced & Polish** | Weeks 9-12 | - Receipt OCR Integration<br>- Charts & Reports<br>- Budget ALerts<br>- Testing (Unit/Integration)<br>- Bug Fixes & Deployment |
