import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Slider,
  Paper,
} from '@mui/material';
import { Close, Payment } from '@mui/icons-material';
import { BookingRequest, BookingResponse, TicketAvailability } from '../types';

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  tier: string;
  availability?: TicketAvailability;
  onBookingSubmit: (booking: BookingRequest) => void;
  bookingResult: BookingResponse | null;
}

const BookingModal: React.FC<BookingModalProps> = ({
  open,
  onClose,
  tier,
  availability,
  onBookingSubmit,
  bookingResult,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [userId, setUserId] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxQuantity = availability?.available || 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId.trim() || !paymentId.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    const booking: BookingRequest = {
      tier: tier as any,
      quantity,
      user_id: userId.trim(),
      payment_id: paymentId.trim(),
    };

    await onBookingSubmit(booking);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      // Reset form
      setQuantity(1);
      setUserId('');
      setPaymentId('');
    }
  };

  const totalPrice = (availability?.price || 0) * quantity;

  const generatePaymentId = () => {
    const id = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setPaymentId(id);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h5" component="h2" fontWeight="bold">
          Book {tier} Tickets
        </Typography>
        <IconButton onClick={handleClose} disabled={isSubmitting}>
          <Close />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 1 }}>
          {bookingResult && (
            <Alert 
              severity={bookingResult.success ? 'success' : 'error'} 
              sx={{ mb: 2 }}
            >
              {bookingResult.success 
                ? `Booking successful! Booking ID: ${bookingResult.booking_id}`
                : bookingResult.error
              }
            </Alert>
          )}

          <Paper sx={{ p: 2, mb: 3, backgroundColor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              {tier} Tier Details
            </Typography>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body1">Price per ticket:</Typography>
              <Typography variant="body1" fontWeight="bold">
                ${availability?.price.toFixed(2) || '0.00'}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body1">Available tickets:</Typography>
              <Typography variant="body1" fontWeight="bold">
                {availability?.available || 0}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body1">Total price:</Typography>
              <Typography variant="h6" color="primary" fontWeight="bold">
                ${totalPrice.toFixed(2)}
              </Typography>
            </Box>
          </Paper>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Number of Tickets
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select how many tickets you want to book (1-{maxQuantity})
            </Typography>
            <Slider
              value={quantity}
              onChange={(_, value) => setQuantity(value as number)}
              min={1}
              max={maxQuantity}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: Math.min(5, maxQuantity), label: Math.min(5, maxQuantity).toString() },
                { value: maxQuantity, label: maxQuantity.toString() },
              ].filter((mark, index, arr) => arr.findIndex(m => m.value === mark.value) === index)}
              valueLabelDisplay="auto"
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="primary" textAlign="center">
              {quantity} ticket{quantity > 1 ? 's' : ''} selected
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter your user ID"
            required
            disabled={isSubmitting}
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Payment ID"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              placeholder="Enter payment ID"
              required
              disabled={isSubmitting}
              helperText="This is a simulated payment ID"
            />
            <Button
              variant="outlined"
              size="small"
              onClick={generatePaymentId}
              disabled={isSubmitting}
              sx={{ mt: 1 }}
              startIcon={<Payment />}
            >
              Generate Payment ID
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              This is a simulation. Payment processing has a 90% success rate.
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleClose} 
            disabled={isSubmitting}
            size="large"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !userId.trim() || !paymentId.trim()}
            size="large"
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <Payment />}
            sx={{ minWidth: 120 }}
          >
            {isSubmitting ? 'Processing...' : `Pay $${totalPrice.toFixed(2)}`}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BookingModal;
