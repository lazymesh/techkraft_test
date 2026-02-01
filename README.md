# Concert Ticket Booking System

A full-stack concert ticket booking application with a React + TypeScript frontend and Golang backend, designed to handle high-concurrency scenarios while preventing double-booking.

## 🎯 Project Overview

This system demonstrates a production-ready ticket booking platform that can handle global users at scale, with particular attention to concurrency control, data consistency, and user experience.

### Key Features

- **Three Ticket Tiers**: VIP ($100), Front Row ($50), General Admission ($10)
- **Real-time Availability**: Live ticket counts and availability status
- **Concurrency Control**: Prevents double-booking using database-level locking
- **Global User Support**: Optimized for distributed users worldwide
- **Responsive UI**: Modern Material-UI design with mobile support

## 🏗️ Architecture

### Backend (Golang)
- **Framework**: Gorilla Mux for HTTP routing
- **Database**: PostgreSQL with transactional support
- **Concurrency Control**: Database row-level locking with `FOR UPDATE SKIP LOCKED`
- **Optimistic Locking**: Version-based conflict prevention
- **API Design**: RESTful endpoints with JSON responses

### Frontend (React + TypeScript)
- **UI Framework**: Material-UI (MUI) v5
- **State Management**: React hooks with local state
- **HTTP Client**: Axios with error handling
- **Type Safety**: Full TypeScript implementation

## 🚀 Quick Start

### Prerequisites
- Go 1.21+
- Node.js 16+
- PostgreSQL 13+
- Docker (optional)

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   go mod download
   ```

2. **Database Setup**
   ```bash
   # Create database
   createdb ticketdb
   
   # Set connection string (default: postgres://user:password@localhost/ticketdb?sslmode=disable)
   export DATABASE_URL="postgres://user:password@localhost/ticketdb?sslmode=disable"
   ```

3. **Run Server**
   ```bash
   go run main.go
   ```
   
   Server will start on `http://localhost:8080`

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```
   
   Frontend will start on `http://localhost:3000`

### Docker Setup (Backend Only)

```bash
# Build and run backend services with Docker Compose
cd backend
docker-compose up --build
```

This will start:
- PostgreSQL database on port 5432
- Backend API on port 8080

Then start the frontend separately:
```bash
cd frontend
npm install
npm start
```

Access the application at: http://localhost:3000

## 📊 API Endpoints

### Ticket Management
- `GET /api/tickets` - Get all tickets with booking status
- `GET /api/tickets/availability` - Get availability summary by tier
- `POST /api/bookings` - Create new booking
- `GET /api/health` - Health check endpoint

### Booking Flow
1. Check ticket availability
2. Submit booking request with user ID and payment ID
3. System validates availability and processes payment
4. Tickets are atomically booked using database transactions

## 🔒 Concurrency & Consistency

### Double-Booking Prevention

The system uses multiple layers of protection against double-booking:

1. **Database Row-Level Locking**
   ```sql
   SELECT id, tier, price, version 
   FROM tickets 
   WHERE tier = $1 AND is_booked = false 
   FOR UPDATE SKIP LOCKED
   LIMIT $2
   ```
   - `FOR UPDATE` locks selected rows for the transaction
   - `SKIP LOCKED` skips already locked rows, preventing deadlocks

2. **Optimistic Locking**
   ```sql
   UPDATE tickets 
   SET is_booked = true, booked_by = $1, booked_at = $2, version = version + 1
   WHERE id = $3 AND version = $4
   ```
   - Version field prevents concurrent modifications
   - Update fails if version changed since selection

3. **Database Transactions**
   - All booking operations are wrapped in ACID transactions
   - Automatic rollback on any failure

### Race Condition Handling

The booking flow is designed to handle race conditions gracefully:

1. **Ticket Selection**: Uses `SKIP LOCKED` to avoid waiting for locked tickets
2. **Availability Check**: Validates sufficient tickets before proceeding
3. **Atomic Updates**: All ticket updates happen in a single transaction
4. **Conflict Resolution**: Failed bookings return clear error messages

## 📈 Scalability Design

### Target Metrics
- **Daily Active Users**: ~1,000,000 DAU
- **Peak Concurrent Users**: ~50,000
- **Booking Response Time**: p95 < 500ms
- **Availability Target**: 99.99%

### Scaling Strategies

#### Database Scaling
1. **Read Replicas**
   - Separate read replicas for ticket catalog queries
   - Primary database handles all write operations (bookings)
   - Reduces read load on primary database

2. **Connection Pooling**
   - Configured connection pools (pgxpool)
   - Connection limits based on database capacity
   - Proper connection lifecycle management

3. **Database Sharding**
   - Horizontal sharding by event or region
   - Each shard handles independent ticket inventories
   - Cross-shard bookings handled by coordination service

#### Application Scaling
1. **Horizontal Scaling**
   - Stateless backend design enables horizontal scaling
   - Load balancer distributes traffic across instances
   - Auto-scaling based on CPU/memory metrics

2. **Caching Strategy**
   - Redis for ticket availability caching
   - Cache invalidation on successful bookings
   - CDN for static assets

3. **Microservices Architecture**
   - Separate services for catalog, booking, and payments
   - Independent scaling per service
   - Circuit breakers for fault isolation
   

### Environment Variables
```bash
# Backend
DATABASE_URL="postgres://user:password@localhost/ticketdb?sslmode=disable"
PORT="8080"

# Frontend
REACT_APP_API_URL="http://localhost:8080/api"
```

### Database Schema
```sql
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    tier VARCHAR(20) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    booked_by VARCHAR(255),
    booked_at TIMESTAMP,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```