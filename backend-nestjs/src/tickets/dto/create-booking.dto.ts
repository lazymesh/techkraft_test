import { IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  user_id: string;

  @IsEnum(['VIP', 'FrontRow', 'GA'])
  tier: string;

  @IsNumber()
  @Min(1)
  @Max(10)
  quantity: number;
}
