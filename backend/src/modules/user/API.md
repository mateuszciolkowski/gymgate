# User API

## Get User by ID

- **Endpoint:** `GET /api/users/:id`
- **Description:** Retrieves a user by their ID.
- **Success Response:**
  - **Code:** 200
  - **Content:**
    ```json
    {
      "success": true,
      "data": {
        "id": "string",
        "email": "string",
        "firstName": "string",
        "lastName": "string",
        "phone": "string"
      }
    }
    ```
- **Error Response:**
  - **Code:** 404
  - **Content:**
    ```json
    {
      "success": false,
      "error": "User not found"
    }
    ```
