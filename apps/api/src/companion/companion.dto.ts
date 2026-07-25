import { ProfilePosition, PricingDisplayMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsBrazilianState } from '../common/validators/brazilian-state.validator';

export class SocialLinksDto {
  @ValidateIf((_dto, value) => value !== undefined && value !== '')
  @IsString()
  @MaxLength(500)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Link do Privacy inválido' })
  privacy?: string;

  @ValidateIf((_dto, value) => value !== undefined && value !== '')
  @IsString()
  @MaxLength(500)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Link do OnlyFans inválido' })
  onlyfans?: string;

  @ValidateIf((_dto, value) => value !== undefined && value !== '')
  @IsString()
  @MaxLength(500)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Link do X inválido' })
  x?: string;

  @ValidateIf((_dto, value) => value !== undefined && value !== '')
  @IsString()
  @MaxLength(500)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Link do Instagram inválido' })
  instagram?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ValidateIf((dto: UpdateProfileDto) => dto.bio !== undefined)
  @IsString()
  @MinLength(20, { message: 'A biografia deve ter pelo menos 20 caracteres' })
  @MaxLength(1000)
  bio?: string;

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

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string;

  @ValidateIf((dto: UpdateProfileDto) => dto.state !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  @IsBrazilianState()
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP inválido (use 00000-000)' })
  cep?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\d\s()+-]{10,20}$/, { message: 'WhatsApp inválido' })
  whatsapp?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  tagNames?: string[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}

export class UpdatePricingDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999999)
  thirtyMin?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999999)
  oneHour?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999999)
  twoHours?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999999)
  overnight?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  customItems?: Array<{ label: string; price: number }>;

  @IsOptional()
  @IsEnum(PricingDisplayMode)
  pricingDisplayMode?: PricingDisplayMode;
}

export class AvailabilityDayDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsOptional()
  isAvailable?: boolean;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Horário inválido (HH:mm)' })
  startTime?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Horário inválido (HH:mm)' })
  endTime?: string | null;
}

export class UpdateAvailabilityDto {
  @IsArray()
  @ArrayMaxSize(7)
  days!: AvailabilityDayDto[];
}

export class CreateVerificationRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
