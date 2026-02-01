export type TicketTier = 'VIP' | 'FrontRow' | 'GA';

export interface Ticket {
  id: number;
  tier: TicketTier;
  price: number;
  is_booked: boolean;
  booked_by?: string;
  booked_at?: string;
  version: number;
}

export interface TicketAvailability {
  tier: string;
  total: number;
  available: number;
  price: number;
}

export interface BookingRequest {
  tier: TicketTier;
  quantity: number;
  user_id: string;
  payment_id: string;
}

export interface BookingResponse {
  success: boolean;
  booking_id?: string;
  booked_tickets?: Ticket[];
  error?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  loading: boolean;
}
