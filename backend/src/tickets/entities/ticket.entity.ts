import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum TicketTier {
  VIP = 'VIP',
  FrontRow = 'FrontRow',
  GA = 'GA'
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  tier: TicketTier;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: false })
  is_booked: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  booked_by: string;

  @Column({ type: 'timestamp', nullable: true })
  booked_at: Date;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn()
  created_at: Date;
}
