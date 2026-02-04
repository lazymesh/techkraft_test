import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'ticketuser',
      password: process.env.DB_PASSWORD || 'ticketpass',
      database: process.env.DB_DATABASE || 'ticketdb',
      entities: [Ticket],
      synchronize: true,
      ssl: false,
    }),
  ],
})
export class DatabaseModule {}
