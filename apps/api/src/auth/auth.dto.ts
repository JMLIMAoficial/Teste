import { ProfilePosition } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsDateString,
  Max,
  Min,
} from 'class-validator';
import { IsBrazilianState } from '../common/validators/brazilian-state.validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;

  @IsDateString()
  birthDate!: string;

  @IsString()
  @MinLength(20, { message: 'A biografia deve ter pelo menos 20 caracteres' })
  @MaxLength(1000)
  bio!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sexualPreference?: string;

  @IsOptional()
  @IsEnum(ProfilePosition)
  position?: ProfilePosition;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(35)
  penisSizeCm?: number;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2)
  @IsBrazilianState()
  state!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
