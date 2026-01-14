# AIleana - Payments & Calls Backend Service

A NestJS-based backend service for handling user wallets, payments, and call sessions.

## Features

- **User Management**: Registration and authentication with JWT (access & refresh tokens)
- **Wallet System**: User wallet management with balance tracking (Primary & Call Credits)
- **Payment Processing**: Integration with Monnify payment gateway (mocked for development)
- **Call Management**: Call initiation and session tracking with cost calculation
- **API Documentation**: Swagger/OpenAPI documentation
- **Docker Support**: Complete Docker setup with docker-compose

## Tech Stack

- **Framework**: NestJS 11.1.11
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT (Passport.js) with refresh token support
- **Payment Gateway**: Monnify (mocked for development)
- **API Documentation**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or use Docker)
- Docker & Docker Compose (optional, recommended)

## Installation

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/Pelumiade/Alleana.git
cd Alleana
```

2. Create `.env` file:
```bash
cat > .env << EOF
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=alleana
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
MONNIFY_API_KEY=mock-api-key
MONNIFY_SECRET_KEY=mock-secret-key
MONNIFY_BASE_URL=https://api.monnify.com
MONNIFY_CONTRACT_CODE=mock-contract-code
PORT=3000
NODE_ENV=development
EOF
```

3. Build and start the services:
```bash
docker compose build
docker compose up -d
```

The API will be available at `http://localhost:3001`
Swagger documentation at `http://localhost:3001/api`

### Manual Installation

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database:
```bash
createdb alleana
```

3. Create `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=alleana
JWT_SECRET=<generate-secret-here>
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

4. Run the application:
```bash
npm run start:dev
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login user (returns access_token & refresh_token)
- `POST /auth/refresh` - Refresh access token
- `POST /users/register` - Register new user

### Users
- `GET /users/me` - Get current user profile (Protected)

### Wallets
- `GET /wallets` - Get user wallets (Protected)
- `GET /wallets/:uuid` - Get wallet by UUID (Protected)

### Payments
- `POST /payments` - Create payment (Protected)
- `GET /payments` - Get user payments (Protected)
- `GET /payments/:uuid` - Get payment by UUID (Protected)
- `POST /payments/verify/:paymentReference` - Verify payment status (Protected)

### Calls
- `POST /calls` - Initiate a call (Protected)
- `GET /calls` - Get user call sessions (Protected)
- `GET /calls/:uuid` - Get call session by UUID (Protected)
- `PATCH /calls/:uuid/answer` - Answer a call (Protected)
- `PATCH /calls/:uuid/end` - End a call (Protected)

## API Documentation

Once the server is running, visit `http://localhost:3001/api` to access the Swagger documentation.

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Security Features

- **JWT Authentication**: Access tokens (24h expiry) and refresh tokens (7d expiry)
- **Password Hashing**: bcrypt with salt rounds
- **Protected Routes**: All sensitive endpoints require authentication
- **Input Validation**: DTO validation with class-validator
- **UUID Exposure**: Only UUIDs exposed, never integer IDs

## Payment Flow

1. User creates a payment (Monnify or Wallet method)
2. For Monnify: Payment status set to "processing", checkout URL generated
3. User verifies payment → Status changes to "completed"
4. Call credits wallet automatically created/credited
5. User can now initiate calls using call credits

## Call Flow

1. User initiates call → Balance checked, 10 NGN reserved
2. Call answered → `started_at` timestamp set
3. Call ended → Duration calculated, final cost computed
4. Balance adjusted based on actual call duration

## Testing

All endpoints have been tested and verified:
- ✅ User registration and authentication
- ✅ JWT token generation and refresh
- ✅ Payment creation and verification
- ✅ Wallet management
- ✅ Call initiation and management
- ✅ Error handling

## Project Structure

```
src/
├── auth/           # Authentication module
├── users/          # User management
├── wallets/        # Wallet system
├── payments/       # Payment processing
├── calls/          # Call management
├── common/         # Shared utilities, guards, decorators
└── main.ts         # Application entry point
```

## License

ISC

## Repository

https://github.com/Pelumiade/Alleana.git
