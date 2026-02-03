import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('api')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('tickets')
  async getTickets() {
    try {
      return await this.ticketsService.findAll();
    } catch (error) {
      throw new HttpException('Failed to fetch tickets', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('tickets/availability')
  async getAvailability() {
    try {
      return await this.ticketsService.getAvailability();
    } catch (error) {
      throw new HttpException('Failed to fetch availability', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('bookings')
  async createBooking(@Body() createBookingDto: CreateBookingDto) {
    try {
      return await this.ticketsService.createBooking(createBookingDto);
    } catch (error) {
      if (error.message.includes('Insufficient tickets')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      if (error.message.includes('already booked')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      throw new HttpException('Booking failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  async getHealth() {
    try {
      return await this.ticketsService.getHealth();
    } catch (error) {
      throw new HttpException('Health check failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
