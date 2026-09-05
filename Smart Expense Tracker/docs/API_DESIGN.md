# API Design

## Authentication
### Register User
*   **POST** `/api/auth/register`
*   **Request Body**:
    ```json
    {
      "username": "john_doe",
      "email": "john@example.com",
      "password": "securePassword123"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "token": "jwt_token_string",
      "user": { "id": "uuid", "username": "john_doe", "email": "john@example.com" }
    }
    ```

### Login User
*   **POST** `/api/auth/login`
*   **Request Body**:
    ```json
    {
      "email": "john@example.com",
      "password": "securePassword123"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "token": "jwt_token_string",
      "user": { "id": "uuid", "username": "john_doe", "email": "john@example.com" }
    }
    ```

## Expenses
### Get All Expenses
*   **GET** `/api/expenses`
*   **Query Params**: `page`, `limit`, `startDate`, `endDate`, `categoryId`
*   **Response**: `[ { expense_object }, ... ]`

### Create Expense
*   **POST** `/api/expenses`
*   **Request Body**:
    ```json
    {
      "amount": 50.00,
      "category_id": "uuid",
      "date": "2023-10-27",
      "description": "Lunch",
      "group_id": "uuid (optional)"
    }
    ```

### Upload Receipt
*   **POST** `/api/expenses/receipt`
*   **Body**: `multipart/form-data` (file)
*   **Response**: `{ "text": "Extracted text...", "data": { "total": 50.00, "date": "..." } }`

## Groups
### Create Group
*   **POST** `/api/groups`
*   **Request Body**: `{ "name": "Trip to Vegas", "members": ["user_id_1", "user_id_2"] }`

### Get Group Details
*   **GET** `/api/groups/:id`
*   **Response**: Group details including members and balances.

### Add Shared Expense
*   **POST** `/api/groups/:id/expenses`
*   **Request Body**:
    ```json
    {
      "amount": 100,
      "description": "Hotel",
      "splits": [
        { "user_id": "id1", "amount": 50 },
        { "user_id": "id2", "amount": 50 }
      ]
    }
    ```

## Reports
### Monthly Summary
*   **GET** `/api/reports/monthly`
*   **Response**: `{ "total": 1200, "by_category": [...] }`
