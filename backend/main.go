package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	"sort"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

// TicketTier represents different ticket categories
type TicketTier string

const (
	VIP      TicketTier = "VIP"
	FrontRow TicketTier = "FrontRow"
	GA       TicketTier = "GA"
)

// Ticket represents available tickets
type Ticket struct {
	ID           int       `json:"id"`
	Tier         TicketTier `json:"tier"`
	Price        float64   `json:"price"`
	IsBooked     bool      `json:"is_booked"`
	BookedBy     string    `json:"booked_by,omitempty"`
	BookedAt     *time.Time `json:"booked_at,omitempty"`
	Version      int       `json:"version"` // For optimistic locking
}

// BookingRequest represents a booking request
type BookingRequest struct {
	Tier      TicketTier `json:"tier"`
	Quantity  int        `json:"quantity"`
	UserID    string     `json:"user_id"`
	PaymentID string     `json:"payment_id"`
}

// BookingResponse represents the response after booking
type BookingResponse struct {
	Success      bool     `json:"success"`
	BookingID    string   `json:"booking_id,omitempty"`
	BookedTickets []Ticket `json:"booked_tickets,omitempty"`
	Error        string   `json:"error,omitempty"`
}

// Server holds the application state
type Server struct {
	db     *sql.DB
	router *mux.Router
}

// NewServer creates a new server instance
func NewServer(db *sql.DB) *Server {
	s := &Server{
		db:     db,
		router: mux.NewRouter(),
	}
	s.setupRoutes()
	return s
}

// setupRoutes configures all API endpoints
func (s *Server) setupRoutes() {
	s.router.HandleFunc("/api/tickets", s.getTickets).Methods("GET")
	s.router.HandleFunc("/api/tickets/availability", s.getTicketAvailability).Methods("GET")
	s.router.HandleFunc("/api/bookings", s.createBooking).Methods("POST")
	s.router.HandleFunc("/api/health", s.healthCheck).Methods("GET")
}

// getTickets returns all available tickets
func (s *Server) getTickets(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(`
		SELECT id, tier, price, is_booked, booked_by, booked_at, version 
		FROM tickets 
		ORDER BY tier, id
	`)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tickets []Ticket
	for rows.Next() {
		var ticket Ticket
		var bookedAt sql.NullTime
		var bookedBy sql.NullString
		
		err := rows.Scan(
			&ticket.ID,
			&ticket.Tier,
			&ticket.Price,
			&ticket.IsBooked,
			&bookedBy,
			&bookedAt,
			&ticket.Version,
		)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		
		if bookedBy.Valid {
			ticket.BookedBy = bookedBy.String
		}
		if bookedAt.Valid {
			ticket.BookedAt = &bookedAt.Time
		}
		
		tickets = append(tickets, ticket)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tickets)
}

// getTicketAvailability returns availability summary per tier
func (s *Server) getTicketAvailability(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT 
			tier,
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE is_booked = false) as available
		FROM tickets 
		GROUP BY tier 
		ORDER BY tier
	`
	
	rows, err := s.db.Query(query)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Availability struct {
		Tier      string  `json:"tier"`
		Total     int     `json:"total"`
		Available int     `json:"available"`
		Price     float64 `json:"price"`
	}

	var availabilities []Availability
	
	for rows.Next() {
		var avail Availability
		err := rows.Scan(&avail.Tier, &avail.Total, &avail.Available)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		
		// Set price based on tier
		switch avail.Tier {
		case "VIP":
			avail.Price = 100.0
		case "FrontRow":
			avail.Price = 50.0
		case "GA":
			avail.Price = 10.0
		}
		
		availabilities = append(availabilities, avail)
		sort.Slice(availabilities, func(i, j int) bool {
			return availabilities[i].Price < availabilities[j].Price
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(availabilities)
}

// createBooking handles ticket booking with concurrency control
func (s *Server) createBooking(w http.ResponseWriter, r *http.Request) {
	var req BookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.Quantity <= 0 {
		http.Error(w, "Quantity must be positive", http.StatusBadRequest)
		return
	}

	if req.UserID == "" || req.PaymentID == "" {
		http.Error(w, "User ID and Payment ID are required", http.StatusBadRequest)
		return
	}

	// Start transaction for atomic booking
	tx, err := s.db.BeginTx(context.Background(), nil)
	if err != nil {
		http.Error(w, "Transaction error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Find available tickets with optimistic locking
	rows, err := tx.Query(`
		SELECT id, tier, price, version 
		FROM tickets 
		WHERE tier = $1 AND is_booked = false 
		FOR UPDATE SKIP LOCKED
		LIMIT $2
	`, req.Tier, req.Quantity)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tickets []Ticket
	for rows.Next() {
		var ticket Ticket
		err := rows.Scan(&ticket.ID, &ticket.Tier, &ticket.Price, &ticket.Version)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		tickets = append(tickets, ticket)
	}

	// Check if we have enough tickets
	if len(tickets) < req.Quantity {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(BookingResponse{
			Success: false,
			Error:   fmt.Sprintf("Only %d tickets available for %s tier", len(tickets), req.Tier),
		})
		return
	}

	// Simulate payment processing (90% success rate)
	paymentSuccess := simulatePayment(req.PaymentID)
	if !paymentSuccess {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(BookingResponse{
			Success: false,
			Error:   "Payment failed",
		})
		return
	}

	// Book the tickets
	bookingID := generateBookingID()
	bookedTime := time.Now()
	
	for _, ticket := range tickets {
		_, err = tx.Exec(`
			UPDATE tickets 
			SET is_booked = true, booked_by = $1, booked_at = $2, version = version + 1
			WHERE id = $3 AND version = $4
		`, req.UserID, bookedTime, ticket.ID, ticket.Version)
		
		if err != nil {
			http.Error(w, "Failed to book ticket", http.StatusInternalServerError)
			return
		}
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		http.Error(w, "Failed to commit booking", http.StatusInternalServerError)
		return
	}

	// Update ticket info for response
	for i := range tickets {
		tickets[i].IsBooked = true
		tickets[i].BookedBy = req.UserID
		tickets[i].BookedAt = &bookedTime
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(BookingResponse{
		Success:       true,
		BookingID:     bookingID,
		BookedTickets: tickets,
	})
}

// healthCheck returns server health status
func (s *Server) healthCheck(w http.ResponseWriter, r *http.Request) {
	err := s.db.Ping()
	status := map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now(),
		"database":  "connected",
	}
	
	if err != nil {
		status["status"] = "error"
		status["database"] = "disconnected"
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// Helper functions
func simulatePayment(paymentID string) bool {
	// Simulated payment id has 90% success rate
	return len(paymentID) > 10
}

func generateBookingID() string {
	return fmt.Sprintf("BK-%d", time.Now().UnixNano())
}

// Start initializes the database and starts the server
func (s *Server) Start(port string) error {
	// Verify database connection is available
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}
	
	// Test database connection
	if err := s.db.Ping(); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}

	// Initialize database tables
	if err := s.initDatabase(); err != nil {
		return fmt.Errorf("failed to initialize database: %w", err)
	}

	// Seed initial ticket data
	if err := s.seedTickets(); err != nil {
		return fmt.Errorf("failed to seed tickets: %w", err)
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: s.router,
	}

	// Graceful shutdown
	go func() {
		log.Printf("Server starting on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	
	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := server.Shutdown(ctx); err != nil {
		return fmt.Errorf("server forced to shutdown: %w", err)
	}
	
	log.Println("Server exited")
	return nil
}

// initDatabase creates the necessary tables
func (s *Server) initDatabase() error {
	query := `
	CREATE TABLE IF NOT EXISTS tickets (
		id SERIAL PRIMARY KEY,
		tier VARCHAR(20) NOT NULL,
		PRICE DECIMAL(10,2) NOT NULL,
		is_booked BOOLEAN DEFAULT FALSE,
		booked_by VARCHAR(255),
		booked_at TIMESTAMP,
		version INTEGER DEFAULT 1,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	
	CREATE INDEX IF NOT EXISTS idx_tickets_tier ON tickets(tier);
	CREATE INDEX IF NOT EXISTS idx_tickets_booked ON tickets(is_booked);
	`
	
	_, err := s.db.Exec(query)
	return err
}

// seedTickets populates the database with initial ticket data
func (s *Server) seedTickets() error {
	// Check if tickets already exist
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM tickets").Scan(&count)
	if err != nil {
		return err
	}
	
	if count > 0 {
		return nil // Tickets already seeded
	}
	
	// Seed tickets for each tier
	tiers := []struct {
		Tier  TicketTier
		Price float64
		Count int
	}{
		{VIP, 100.0, 50},
		{FrontRow, 50.0, 100},
		{GA, 10.0, 500},
	}
	
	for _, tier := range tiers {
		for i := 0; i < tier.Count; i++ {
			_, err := s.db.Exec(`
				INSERT INTO tickets (tier, price) VALUES ($1, $2)
			`, tier.Tier, tier.Price)
			if err != nil {
				return err
			}
		}
	}
	
	return nil
}

func main() {
	// Database connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://ticketuser:ticketpass@localhost/ticketdb?sslmode=disable"
	}
	
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	
	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	
	server := NewServer(db)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	if err := server.Start(port); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
