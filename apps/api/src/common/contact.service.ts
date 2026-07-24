import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  decryptValue,
  encryptValue,
  normalizeWhatsApp,
  whatsappToUrl,
} from './crypto.util';

@Injectable()
export class ContactService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.get('WHATSAPP_ENCRYPTION_KEY') ?? config.get('JWT_SECRET', 'dev-secret');
  }

  encryptPhone(phone: string): string | null {
    const normalized = normalizeWhatsApp(phone);
    if (!normalized) return null;
    return encryptValue(normalized, this.secret);
  }

  decryptPhone(encrypted: string | null | undefined): string | null {
    if (!encrypted) return null;
    try {
      return decryptValue(encrypted, this.secret);
    } catch {
      return null;
    }
  }

  maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '****';
    const last4 = digits.slice(-4);
    const ddd = digits.length >= 12 ? digits.slice(2, 4) : digits.slice(0, 2);
    return `(${ddd}) *****-${last4}`;
  }

  buildPublicContact(encrypted: string | null | undefined, displayName: string) {
    const phone = this.decryptPhone(encrypted);
    if (!phone) {
      return { hasWhatsApp: false as const };
    }
    const message = `Olá ${displayName}! Vi seu perfil no Acompanhante e gostaria de mais informações.`;
    return {
      hasWhatsApp: true as const,
      whatsappUrl: whatsappToUrl(phone, message),
    };
  }
}
