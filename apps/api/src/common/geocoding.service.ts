import { Injectable, Logger } from '@nestjs/common';
import { formatCep, normalizeCep } from './geo.util';

export type GeocodedAddress = {
  cep: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
};

type ViaCepResponse = {
  erro?: boolean;
  cep?: string;
  localidade?: string;
  uf?: string;
  bairro?: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
};

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly nominatimUserAgent = 'Acompanhante/1.0';

  async geocodeCep(cep: string): Promise<GeocodedAddress | null> {
    const digits = normalizeCep(cep);
    if (digits.length !== 8) return null;

    const viaCep = await this.fetchViaCep(digits);
    if (!viaCep?.localidade || !viaCep.uf) return null;

    const city = viaCep.localidade;
    const state = viaCep.uf.toUpperCase();
    const neighborhood = viaCep.bairro?.trim() || undefined;

    const brasilApi = await this.fetchBrasilApi(digits);
    let latitude = brasilApi?.latitude;
    let longitude = brasilApi?.longitude;

    if (latitude == null || longitude == null) {
      const fallback = await this.geocodeWithNominatim(city, state, neighborhood);
      if (!fallback) {
        this.logger.warn(`No coordinates for CEP ${digits} (${city}/${state})`);
        return null;
      }
      latitude = fallback.latitude;
      longitude = fallback.longitude;
    }

    return {
      cep: formatCep(digits),
      city,
      state,
      latitude,
      longitude,
    };
  }

  private async fetchViaCep(digits: string): Promise<ViaCepResponse | null> {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as ViaCepResponse;
      if (data.erro) return null;
      return data;
    } catch (err) {
      this.logger.warn(`ViaCEP lookup failed for ${digits}: ${err}`);
      return null;
    }
  }

  private async fetchBrasilApi(digits: string): Promise<{ latitude?: number; longitude?: number } | null> {
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;

      const data = (await res.json()) as {
        location?: { coordinates?: { latitude?: number | string; longitude?: number | string } };
      };

      const latitude = this.toNumber(data.location?.coordinates?.latitude);
      const longitude = this.toNumber(data.location?.coordinates?.longitude);
      if (latitude == null || longitude == null) return null;

      return { latitude, longitude };
    } catch (err) {
      this.logger.warn(`BrasilAPI CEP lookup failed for ${digits}: ${err}`);
      return null;
    }
  }

  private async geocodeWithNominatim(
    city: string,
    state: string,
    neighborhood?: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    const queries = [
      neighborhood ? `${neighborhood}, ${city}, ${state}, Brasil` : null,
      `${city}, ${state}, Brasil`,
    ].filter(Boolean) as string[];

    for (const query of queries) {
      const coords = await this.searchNominatim(query);
      if (coords) return coords;
    }

    return null;
  }

  private async searchNominatim(query: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      url.searchParams.set('countrycodes', 'br');

      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': this.nominatimUserAgent },
      });
      if (!res.ok) return null;

      const results = (await res.json()) as NominatimResult[];
      const hit = results[0];
      const latitude = this.toNumber(hit?.lat);
      const longitude = this.toNumber(hit?.lon);
      if (latitude == null || longitude == null) return null;

      return { latitude, longitude };
    } catch (err) {
      this.logger.warn(`Nominatim lookup failed for "${query}": ${err}`);
      return null;
    }
  }

  private toNumber(value: unknown): number | undefined {
    if (value == null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
