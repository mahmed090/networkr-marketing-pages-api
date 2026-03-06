import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ContactDto {
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(200)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tenantId?: string;
}
