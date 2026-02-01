import axios from 'axios';
import { Ticket, TicketAvailability, BookingRequest, BookingResponse } from './types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ticketApi = {
  // Get all tickets
  getTickets: async (): Promise<Ticket[]> => {
    try {
      const response = await api.get('/tickets');
      return response.data;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  },

  // Get ticket availability by tier
  getTicketAvailability: async (): Promise<TicketAvailability[]> => {
    try {
      const response = await api.get('/tickets/availability');
      return response.data;
    } catch (error) {
      console.error('Error fetching ticket availability:', error);
      throw error;
    }
  },

  // Create booking
  createBooking: async (booking: BookingRequest): Promise<BookingResponse> => {
    try {
      const response = await api.post('/bookings', booking);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw error;
    }
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; database: string; timestamp: string }> => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },
};
