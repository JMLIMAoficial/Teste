import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects login payload without email', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ password: 'secret' })
      .expect(400);
  });

  it('rejects register payload with invalid email', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: 'not-an-email',
        password: 'Password123!',
        displayName: 'Test User',
        birthDate: '1995-01-01',
        bio: 'Biografia de teste com mais de vinte caracteres.',
        city: 'São Paulo',
        state: 'SP',
      })
      .expect(400);
  });
});
