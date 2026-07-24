import { ProfilePosition, ProfileStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsBrazilianState } from '../common/validators/brazilian-state.validator';

export class AdminListProfilesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(ProfileStatus)
  status?: ProfileStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  premium?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  verified?: boolean;
}

export class AdminUpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ValidateIf((dto: AdminUpdateProfileDto) => dto.bio !== undefined)
  @IsString()
  @MinLength(20)
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

  @ValidateIf((dto: AdminUpdateProfileDto) => dto.state !== undefined)
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
  @Matches(/^\d{5}-?\d{3}$/)
  cep?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\d\s()+-]{10,20}$/)
  whatsapp?: string;

  @IsOptional()
  @IsEnum(ProfileStatus)
  status?: ProfileStatus;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsUUID('4', { each: true })
  tagIds?: string[];
}

export class AdminApproveDto {
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
