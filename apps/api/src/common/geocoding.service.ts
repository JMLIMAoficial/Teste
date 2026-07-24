import { Injectable, Logger } from '@nestjs/common';
import { formatCep, normalizeCep } from './geo.util';

export type GeocodedAddress = {
  cep: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
};

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  async geocodeCep(cep: string): Promise<GeocodedAddress | null> {
    const digits = normalizeCep(cep);
    if (digits.length !== 8) return null;

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;

      const data = (await res.json()) as {
        city?: string;
        state?: string;
        location?: { coordinates?: { latitude?: number; longitude?: number } };
      };

      const latitude = data.location?.coordinates?.latitude;
      const longitude = data.location?.coordinates?.longitude;
      if (latitude == null || longitude == null || !data.city || !data.state) {
        return null;
      }

      return {
        cep: formatCep(digits),
        city: data.city,
        state: data.state,
        latitude,
        longitude,
      };
    } catch (err) {
      this.logger.warn(`CEP geocode failed for ${digits}: ${err}`);
      return null;
    }
  }
}
