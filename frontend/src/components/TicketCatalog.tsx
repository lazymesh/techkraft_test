import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Star,
  LocalActivity,
  AccessTime,
} from '@mui/icons-material';
import { TicketAvailability, BookingRequest, BookingResponse } from '../types';
import { ticketApi } from '../api';
import BookingModal from './BookingModal';

const TicketCatalog: React.FC = () => {
  const [availability, setAvailability] = useState<TicketAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [bookingResult, setBookingResult] = useState<BookingResponse | null>(null);

  useEffect(() => {
    fetchTicketAvailability(); // Initial fetch with loading
    
    // Set up interval to refresh every 20 seconds (silent refresh)
    const intervalId = setInterval(() => fetchTicketAvailability(false), 20000);
    
    // Cleanup interval when component unmounts
    return () => clearInterval(intervalId);
  }, []);

  const fetchTicketAvailability = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const data = await ticketApi.getTicketAvailability();
      setAvailability(data);
    } catch (err) {
      setError('Failed to load ticket availability. Please try again later.');
      console.error('Error fetching availability:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleBookTickets = (tier: string) => {
    setSelectedTier(tier);
    setBookingModalOpen(true);
    setBookingResult(null);
  };

  const handleBookingSubmit = async (booking: BookingRequest) => {
    try {
      const result = await ticketApi.createBooking(booking);
      setBookingResult(result);
      
      if (result.success) {
        // Refresh availability after successful booking (silent refresh)
        await fetchTicketAvailability(false);
        setBookingModalOpen(false);
      }
    } catch (err) {
      console.error('Booking error:', err);
      setBookingResult({
        success: false,
        error: 'An unexpected error occurred during booking.',
      });
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'VIP':
        return <Star color="warning" />;
      case 'FrontRow':
        return <LocalActivity color="info" />;
      case 'GA':
        return <AccessTime color="success" />;
      default:
        return <LocalActivity />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VIP':
        return 'warning';
      case 'FrontRow':
        return 'info';
      case 'GA':
        return 'success';
      default:
        return 'default';
    }
  };

  const getAvailabilityStatus = (available: number, total: number) => {
    const percentage = (available / total) * 100;
    
    if (percentage === 0) {
      return {
        color: 'error' as const,
        label: 'Sold Out',
        icon: <Error color="error" />,
      };
    } else if (percentage < 20) {
      return {
        color: 'warning' as const,
        label: 'Limited',
        icon: <Error color="warning" />,
      };
    } else {
      return {
        color: 'success' as const,
        label: 'Available',
        icon: <CheckCircle color="success" />,
      };
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center" fontWeight="bold">
        Concert Ticket Booking
      </Typography>
      
      <Typography variant="h6" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Select your preferred ticket tier and book your seats
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {bookingResult && (
        <Alert 
          severity={bookingResult.success ? 'success' : 'error'} 
          sx={{ mb: 4 }}
          onClose={() => setBookingResult(null)}
        >
          {bookingResult.success 
            ? `Booking successful! Booking ID: ${bookingResult.booking_id}. ${bookingResult.booked_tickets?.length} tickets booked.`
            : bookingResult.error
          }
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
        {availability.map((tier) => {
          const status = getAvailabilityStatus(tier.available, tier.total);
          const isSoldOut = tier.available === 0;

          return (
            <Box key={tier.tier} sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 24px)' }, maxWidth: { md: 'calc(33.333% - 24px)' } }}>
              <Card 
                elevation={3}
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: isSoldOut ? 0.7 : 1,
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    {getTierIcon(tier.tier)}
                    <Typography variant="h5" component="h2" sx={{ ml: 1, fontWeight: 'bold' }}>
                      {tier.tier}
                    </Typography>
                  </Box>

                  <Box mb={2}>
                    <Chip 
                      label={status.label}
                      color={status.color}
                      variant="outlined"
                      icon={status.icon}
                      sx={{ mb: 1 }}
                    />
                  </Box>

                  <Typography variant="h4" color="primary" gutterBottom fontWeight="bold">
                    ${tier.price.toFixed(2)}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Per ticket
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Box mb={3}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Availability:</strong> {tier.available} / {tier.total}
                    </Typography>
                    
                    <Box 
                      sx={{ 
                        width: '100%', 
                        backgroundColor: 'grey.200', 
                        borderRadius: 1, 
                        height: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${(tier.available / tier.total) * 100}%`,
                          backgroundColor: tier.available > 0 ? 'success.main' : 'error.main',
                          height: '100%',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>
                  </Box>

                  {tier.tier === 'VIP' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      • Premium seating<br/>
                      • Backstage access<br/>
                      • Complimentary drinks
                    </Typography>
                  )}

                  {tier.tier === 'FrontRow' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      • Front row seats<br/>
                      • Early entry<br/>
                      • Meet & greet opportunity
                    </Typography>
                  )}

                  {tier.tier === 'GA' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      • General admission<br/>
                      • Standing room<br/>
                      • Full venue access
                    </Typography>
                  )}
                </CardContent>

                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    color={getTierColor(tier.tier) as any}
                    size="large"
                    fullWidth
                    disabled={isSoldOut}
                    onClick={() => handleBookTickets(tier.tier)}
                    sx={{ py: 1.5 }}
                  >
                    {isSoldOut ? 'Sold Out' : 'Book Tickets'}
                  </Button>
                </Box>
              </Card>
            </Box>
          );
        })}
      </Box>

      <BookingModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        tier={selectedTier}
        availability={availability.find(a => a.tier === selectedTier)}
        onBookingSubmit={handleBookingSubmit}
        bookingResult={bookingResult}
      />
    </Container>
  );
};

export default TicketCatalog;
