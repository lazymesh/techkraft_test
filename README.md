# Concert Ticket Booking System

A full-stack concert ticket booking application with a React + TypeScript frontend and Golang backend.

### Key Features

- **Three Ticket Tiers**: VIP ($100), Front Row ($50), General Admission GA ($10)
- **Real-time Availability**: Live ticket counts and availability status
- **Concurrency Control**: Prevents double-booking using database-level locking
- **Global User Support**: Optimized for distributed users worldwide
- **Responsive UI**: Modern Material-UI design with mobile support

## Architecture

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

## Quick Start

### Docker Setup (Recommended)

**Prerequisites:**
- docker or podman
- docker-compose or podman-compose

**Complete Application:**
```bash
# Build and run all services
docker-compose up --build -d or podman-compose up --build -d
```

This will start:
- **PostgreSQL** database on port 5432
- **Backend API** on port 8080
- **Frontend** on port 3000

**Access the application:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api/health
- **Database**: localhost:5432

**Stop the application:**
```bash
docker-compose down or podman-compose down
```

### Local Development Setup

**Prerequisites:**
- Go 1.21+
- Node.js 16+
- PostgreSQL 13+

**Backend Setup:**
```bash
cd backend
go mod download
go run main.go
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm start
```

### Environment Variables

**Backend (.env):**
```bash
DATABASE_URL=postgres://<dbuser>:<dbpass>@localhost/<db>?sslmode=disable
PORT=8080
```

**Frontend (.env):**
```bash
REACT_APP_API_URL=/api
```

## API Endpoints

### Ticket Management
- `GET /api/tickets` - Get all tickets with booking status
- `GET /api/tickets/availability` - Get availability summary by tier
- `POST /api/bookings` - Create new booking
- `GET /api/health` - Health check endpoint

### Example Usage
```bash
# Check ticket availability
curl http://localhost:3000/api/tickets/availability

# Create a booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "tier": "VIP",
    "quantity": 2
  }'
```

##  Concurrency & Consistency

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

### CORS Configuration

The backend includes CORS middleware to allow frontend requests:
```go
corsHandler := handlers.CORS(
    handlers.AllowedOrigins([]string{"http://localhost:3000"}),
    handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
    handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
    handlers.AllowCredentials(),
)
```

# Non-Functional Requirements
### Availability (99.99% Target)
While this implementation runs in a single-region setup, following can be done for high availability in a production environment:
The Golang API be run on multiple instances behind a load balancer.
PostgreSQL supports replication primary–replica setup can be utilized.
A multi-region setup with traffic routing and database replication would enable the system to meet the 99.99% availability target.

### Scalability (1,000,000 DAU / 50,000 Concurrent Users)
A load balancer distributes incoming traffic evenly across backend instances. Row-level locking with FOR UPDATE SKIP LOCKED allows concurrent booking requests to be processed safely without conflicts. Each Request are independent of other request with respective database transaction. Frequently accessed read endpoints (e.g., ticket availability) can be served via caching or read replicas to reduce load on the primary database. Running on
well tested servers like NGINX, AWS cloudfront etc can certainly handle multi-million users concurrently.

### Performance (p95 < 500ms for Booking Requests)
This is achieved through:
Indexed queries and limited row selection (LIMIT) minimize database scan time.
Booking transactions are kept minimal to reduce lock contention.
Using PostgreSQL row-level locking avoids costly application-level synchronization.
Version-based updates prevent unnecessary retries and ensure consistency with minimal overhead.
Post-booking operations (e.g., notifications) are decoupled from the critical booking request path.