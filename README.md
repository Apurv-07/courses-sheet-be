# Backend COURSESheet Application

This is the backend for the COURSESheet application built using Node.js, Express, and MongoDB. The application provides user authentication, role-based access control, and CRUD operations for COURSEcontent.

## Features

- **User Authentication**: Supports signup, login, and Google OAuth.
- **Role-Based Access Control**: Different access levels for users and admins.
- **COURSEContent Management**: CRUD operations for categories, subjects, chapters, topics, and problems.

## Technologies Used

- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Tokens (JWT)
- Google OAuth

## Getting Started

### Prerequisites

- Node.js
- MongoDB

### Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   ```

2. Navigate to the backend directory:

   ```
   cd mern-dsa-sheet-app/backend
   ```

3. Install dependencies:

   ```
   npm install
   ```

### Configuration

1. Create a `.env` file in the backend directory and add the following environment variables:

   ```
   MONGODB_URI=<your_mongodb_connection_string>
   JWT_SECRET=<your_jwt_secret>
   GOOGLE_CLIENT_ID=<your_google_client_id>
   GOOGLE_CLIENT_SECRET=<your_google_client_secret>
   ```

### Running the Application

1. Start the server:

   ```
   npm start
   ```

2. The server will run on `http://localhost:5000`.

### API Endpoints

- **Authentication**

  - `POST /api/auth/signup`: User signup
  - `POST /api/auth/login`: User login
  - `GET /api/auth/google`: Google OAuth login

- **COURSEContent**
  - `GET /api/dsa`: Get all COURSEcontent
  - `POST /api/dsa`: Create new COURSEcontent
  - `PUT /api/dsa/:id`: Update COURSEcontent
  - `DELETE /api/dsa/:id`: Delete COURSEcontent

## License

This project is licensed under the MIT License.
