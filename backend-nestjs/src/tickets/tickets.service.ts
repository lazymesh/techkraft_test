import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    private dataSource: DataSource,
  ) {}

  async findAll(): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      order: { tier: 'ASC', id: 'ASC' },
    });
  }

  async getAvailability(): Promise<any[]> {
    const result = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .select('ticket.tier', 'tier')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN ticket.is_booked = false THEN 1 ELSE 0 END)', 'available')
      .addSelect('MIN(ticket.price)', 'price')
      .groupBy('ticket.tier')
      .getRawMany();

    return result.map(row => ({
      tier: row.tier,
      total: parseInt(row.total),
      available: parseInt(row.available),
      price: parseFloat(row.price),
    }));
  }

  async createBooking(createBookingDto: CreateBookingDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find available tickets with row-level locking (equivalent to FOR UPDATE SKIP LOCKED)
      const tickets = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .setLock('pessimistic_write')
        .where('ticket.tier = :tier AND ticket.is_booked = false', {
          tier: createBookingDto.tier,
        })
        .orderBy('ticket.id', 'ASC')
        .take(createBookingDto.quantity)
        .getMany();

      if (tickets.length < createBookingDto.quantity) {
        throw new ConflictException('Insufficient tickets available');
      }

      const bookingTime = new Date();
      const bookingId = `BK${Date.now()}`;

      // Update tickets with optimistic locking
      for (const ticket of tickets) {
        const updateResult = await queryRunner.manager.update(
          Ticket,
          { 
            id: ticket.id, 
            version: ticket.version 
          },
          {
            is_booked: true,
            booked_by: createBookingDto.user_id,
            booked_at: bookingTime,
            version: ticket.version + 1,
          },
        );

        if (updateResult.affected === 0) {
          throw new ConflictException('Ticket was already booked by another user');
        }
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        booking_id: bookingId,
        tickets_booked: tickets.length,
        total_amount: tickets.reduce((sum, ticket) => sum + parseFloat(ticket.price.toString()), 0),
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err instanceof ConflictException) {
        throw err;
      }
      throw new ConflictException('Booking failed due to concurrent access');
    } finally {
      await queryRunner.release();
    }
  }

  async seedTickets() {
    const ticketRepository = this.dataSource.getRepository(Ticket);
    
    // Check if tickets already exist
    const existingCount = await ticketRepository.count();
    if (existingCount > 0) {
      return; // Tickets already seeded
    }

    const tickets = [];
    
    // VIP tickets - $100
    for (let i = 0; i < 50; i++) {
      tickets.push({
        tier: 'VIP',
        price: 100,
        is_booked: false,
      });
    }
    
    // Front Row tickets - $50
    for (let i = 0; i < 100; i++) {
      tickets.push({
        tier: 'FrontRow',
        price: 50,
        is_booked: false,
      });
    }
    
    // General Admission tickets - $10
    for (let i = 0; i < 500; i++) {
      tickets.push({
        tier: 'GA',
        price: 10,
        is_booked: false,
      });
    }

    await ticketRepository.save(tickets);
  }

  async getHealth() {
    try {
      await this.ticketsRepository.query('SELECT 1');
      return {
        database: 'connected',
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        database: 'disconnected',
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
