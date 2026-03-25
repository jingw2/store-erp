import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Auth E2E', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(() => app.close());

  it('POST /api/v1/auth/login — valid credentials returns accessToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'hq@taro-tea.com', password: 'HqAdmin123!' });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
  });

  it('POST /api/v1/auth/login — invalid password returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'hq@taro-tea.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/login — unknown email returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@nowhere.com', password: 'pass' });

    expect(res.status).toBe(401);
  });
});
