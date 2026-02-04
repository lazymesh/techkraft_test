import { Controller, Get, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('api')
export class TicketsController {
  private readonly logger = new Logger(TicketsController.name);

  constructor(private readonly ticketsService: TicketsService) {}

  @Get('tickets')
  async getTickets() {
    try {
      return await this.ticketsService.findAll();
    } catch (error) {
      this.logger.error('Failed to fetch tickets', error);
      throw new HttpException('Failed to fetch tickets', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('tickets/availability')
  async getAvailability() {
    try {
      return await this.ticketsService.getAvailability();
    } catch (error) {
      this.logger.error('Failed to fetch availability', error);
      throw new HttpException('Failed to fetch availability', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('bookings')
  async createBooking(@Body() createBookingDto: CreateBookingDto) {
    try {
      this.logger.log(`Creating booking: ${JSON.stringify(createBookingDto)}`);
      return await this.ticketsService.createBooking(createBookingDto);
    } catch (error) {
      this.logger.error('Booking failed', error);
      
      if (error.message.includes('Insufficient tickets')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      if (error.message.includes('already booked')) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      
      // Handle validation errors
      if (error.response && error.response.message) {
        throw new HttpException({
          error: 'Validation failed',
          details: error.response.message
        }, HttpStatus.BAD_REQUEST);
      }
      
      throw new HttpException('Booking failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  async getHealth() {
    try {
      return await this.ticketsService.getHealth();
    } catch (error) {
      this.logger.error('Health check failed', error);
      throw new HttpException('Health check failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
