# Smart Expense Tracker & Bill Splitter

A full-stack mobile application for tracking personal expenses and splitting bills with friends. Built with React Native, Node.js, and PostgreSQL.

## Features

*   **Authentication**: Secure Register/Login with JWT.
*   **Dashboard**: View monthly spending, budgets (mocked), and charts.
*   **Expense Management**: Add personal expenses with categories and receipts (placeholder).
*   **Bill Splitting**: Create groups, add shared expenses, and track balances.
*   **Settle Up**: Record payments between group members to settle debts.

## Tech Stack

*   **Mobile**: React Native (Expo/CLI), TypeScript, Redux Toolkit, React Native Paper.
*   **Backend**: Node.js, Express.js, Sequelize ORM.
*   **Database**: PostgreSQL.

## Prerequisites

*   Node.js (v14+)
*   PostgreSQL (Local or hosted)
*   Android Studio / Xcode (for mobile emulator)

## Setup Instructions

### 1. Database Setup
Create a PostgreSQL database (e.g., `expense_tracker`).
Update `backend/.env` with your DB credentials.

### 2. Backend Setup
```bash
cd backend
npm install
# Create a .env file based on the example below
# DB_NAME=expense_tracker
# DB_USER=postgres
# DB_PASS=password
# DB_HOST=localhost
# JWT_SECRET=your_secret_key

# Run the server
node server.js
```
The server runs on `http://localhost:5000`.

### 3. Mobile App Setup
```bash
cd mobile
npm install

# Start the metro bundler
npm start

# Run on Android Emulator
npm run android
```
*Note: Ensure your emulator can reach the backend. If using Android Emulator, `localhost` refers to the device itself. The app is configured to use `10.0.2.2` for Android Emulator in `src/services/api.ts`.*

## Testing
To run backend tests:
```bash
cd backend
npm test
```

## Project Structure
*   `/backend`: API and Database models.
*   `/mobile`: React Native Frontend code.
*   `/docs`: Project documentation and plans.
