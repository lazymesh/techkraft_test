import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TicketsService } from './tickets/tickets.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Seed tickets on startup
  const ticketsService = app.get(TicketsService);
  await ticketsService.seedTickets();

  const port = process.env.PORT || 8080;
  await app.listen(port);
  
  console.log(`NestJS backend is running on port ${port}`);
}
bootstrap();
