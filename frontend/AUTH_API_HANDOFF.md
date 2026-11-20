# CodeKnit Authentication API Handoff

Owner: Member 1 — Frontend integration
Backend implementation: Member 3

## API contract

Base URL: configured through `VITE_API_BASE_URL`.

### POST /api/auth/register

Request:
- fullName
- email
- username
- password

Success response:
- user.userId — generated uniquely by the server
- user.fullName
- user.email
- user.username

### POST /api/auth/login

Request:
- identifier — email or username
- password
- rememberMe

Success response: authenticated user profile.

### GET /api/auth/me

Returns the currently authenticated user's profile.

### POST /api/auth/logout

Ends the current authenticated session.

### POST /api/auth/forgot-password

Request:
- email

Return a generic confirmation message that does not reveal whether an account exists.

## Backend security requirements

- Hash passwords securely on the server. Never store plaintext passwords.
- Never return passwords or password hashes.
- Use secure, HttpOnly, SameSite session cookies over HTTPS.
- Implement CSRF protection appropriate to the cookie-based session design.
- Validate and normalize registration fields on the server.
- Enforce unique email addresses and usernames.
- Apply login and password-reset rate limits.
- Generate the CodeKnit User ID on the server.
- Return consistent JSON errors with appropriate HTTP status codes.
- Configure CORS for the approved frontend origin if frontend and backend use different origins.

## Frontend integration notes

- `src/services/authService.ts` contains the API request functions.
- `src/types/auth.types.ts` defines shared authentication types.
- Credentials must not be saved in localStorage or sessionStorage.
- The frontend must display the User ID returned by the server.
- Authentication is not functional until the backend endpoints are implemented and connected.
