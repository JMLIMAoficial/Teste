import { BadRequestException } from '@nestjs/common';
import { calculateAge } from './profile.mapper';

export function assertMinimumAge(birthDate: string | Date, minimumAge = 18): void {
  const date = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Data de nascimento inválida');
  }

  const age = calculateAge(date);
  if (age == null || age < minimumAge) {
    throw new BadRequestException(`É necessário ter pelo menos ${minimumAge} anos`);
  }
}
