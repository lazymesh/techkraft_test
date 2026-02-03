# Concert Ticket Booking System
A full-stack concert ticket booking application with a React + TypeScript frontend and dual backend options (Golang or NestJS), designed to handle high-concurrency scenarios while preventing double-booking.

### Key Features
- **Three Ticket Tiers**: VIP ($100), Front Row ($50), General Admission GA ($10)
- **Real-time Availability**: Live ticket counts and availability status
- **Concurrency Control**: Prevents double-booking using database-level locking
- **Global User Support**: Optimized for distributed users worldwide
- **Dual Backend Options**: Choose between Golang or NestJS backends

## Architecture

### Backend Options

#### Option 1: Golang Backend
- **Framework**: Gorilla Mux for HTTP routing
- **Database**: PostgreSQL with pgx driver
- **Concurrency**: Row-level locking with `FOR UPDATE SKIP LOCKED`
- **CORS**: Configured for frontend communication
- **Docker**: Multi-stage build with Go alpine base

#### Option 2: NestJS Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Concurrency**: Pessimistic and optimistic locking
- **CORS**: Built-in CORS middleware
- **Validation**: Class-validator DTOs
- **Docker**: Multi-stage build with Node.js alpine

### Frontend (React + TypeScript)
- **UI Framework**: Material-UI (MUI)
- **State Management**: React hooks and context
- **HTTP Client**: Axios with error handling
- **Type Safety**: Full TypeScript implementation

## Quick Start

### Docker Setup (Recommended)

**Prerequisites:**
- Docker or Podman
- Docker Compose or Podman Compose

#### Option 1: Golang Backend
##### Using docker-compose
```bash
docker-compose -f docker-compose-go.yml up --build -d
```
##### Using podman-compose
```bash
podman-compose -f docker-compose-go.yml up --build -d
```

#### Option 2: NestJS Backend
##### Using docker-compose
```bash
docker-compose -f docker-compose-nestjs.yml up --build -d
```
##### Using podman-compose
```bash
podman-compose -f docker-compose-nestjs.yml up --build -d
```

This will start:
- **PostgreSQL** database on port 5432
- **Backend API** on port 8080 (Go or NestJS)
- **Frontend** on port 3000

**Access the application:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api/health
- **Database**: localhost:5432

**Stop the application:**
```bash
# For Golang backend
docker-compose -f docker-compose-go.yml down 
# or 
podman-compose -f docker-compose-go.yml down

# For NestJS backend
docker-compose -f docker-compose-nestjs.yml down
# or 
podman-compose -f docker-compose-nestjs.yml down
```

### Local Development Setup

#### Golang Backend
**Prerequisites:**
- Go 1.21+
- PostgreSQL
- Node.js 16+

```bash
# Change directory to backend-go
cd backend-go

# Start PostgreSQL
docker-compose up -d postgres
# Or
podman-compose up -d postgres

# Install dependencies and run backend
go mod download && go run main.go

# Change directory to frontend and run frontend
cd frontend && npm install && npm start
```

#### NestJS Backend
**Prerequisites:**
- Node.js 18+
- PostgreSQL

```bash
# Change directory to backend-nestjs
cd backend-nestjs

# Start PostgreSQL
docker-compose up -d postgres

# Install dependencies and run backend
npm install && npm start

# Change directory to frontend and run frontend
cd frontend && npm install && npm start
```

## Environment Variables

### Golang Backend (.env):
```bash
DATABASE_URL=postgres://ticketuser:ticketpass@localhost/ticketdb?sslmode=disable
PORT=8080
```

### NestJS Backend (.env):
```bash
PORT=8080
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=ticketuser
DB_PASSWORD=ticketpass
DB_DATABASE=ticketdb
```

### Frontend (.env):
```bash
REACT_APP_API_URL=http://localhost:8080/api
```

## API Endpoints

### Ticket Management
- `GET /api/tickets` - Get all tickets with booking status
- `GET /api/tickets/availability` - Get availability by tier

### Booking Operations
- `POST /api/bookings` - Create new booking

### Health Check
- `GET /api/health` - System health status

### Example Booking Request
```bash
curl -X POST http://localhost:8080/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "tier": "VIP",
    "quantity": 2,
    "payment_id": "pay_abc1234"
  }'
```

## Non-Functional Requirements

### Availability (99.99% Target)
While this implementation runs in a single-region setup, following can be done for high availability in a production environment:
- Both Golang and NestJS APIs can be run on multiple instances behind a load balancer
- PostgreSQL supports replication primary-replica setup can be utilized
- A multi-region setup with traffic routing and database replication would enable the system to meet the 99.99% availability target

### Scalability (1,000,000 DAU / 50,000 Concurrent Users)
- A load balancer distributes incoming traffic evenly across backend instances
- Row-level locking with `FOR UPDATE SKIP LOCKED` (Go) and pessimistic/optimistic locking (NestJS) allows concurrent booking requests to be processed safely without conflicts
- Each request is independent with respective database transaction
- Frequently accessed read endpoints (e.g., ticket availability) can be served via caching or read replicas to reduce load on the primary database
- Running on well-tested servers like NGINX, AWS CloudFront can handle multi-million users concurrently

### Performance (p95 < 500ms for Booking Requests)
This is achieved through:
- Indexed queries and limited row selection (LIMIT) minimize database scan time
- Booking transactions are kept minimal to reduce lock contention
- Using PostgreSQL row-level locking avoids costly application-level synchronization
- Version-based updates prevent unnecessary retries and ensure consistency with minimal overhead
- Post-booking operations (e.g., notifications) are decoupled from the critical booking request path