import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../app.module';
import * as supertest from 'supertest';

describe('Inventory API (e2e)', () => {
  let app: NestFastifyApplication;
  let hqToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const res = await supertest(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'hq@taro-tea.com', password: 'HqAdmin123!' });
    hqToken = res.body.accessToken;
  });

  afterAll(() => app.close());

  it('GET /stores/:storeId/inventory — 401 without token', async () => {
    const res = await supertest(app.getHttpServer()).get('/api/v1/stores/fake-id/inventory');
    expect(res.status).toBe(401);
  });

  it('GET /stores/:storeId/inventory — 200 with valid token', async () => {
    const storesRes = await supertest(app.getHttpServer())
      .get('/api/v1/stores')
      .set('Authorization', `Bearer ${hqToken}`);
    expect(storesRes.status).toBe(200);

    if (storesRes.body.length > 0) {
      const storeId = storesRes.body[0].id;
      const res = await supertest(app.getHttpServer())
        .get(`/api/v1/stores/${storeId}/inventory`)
        .set('Authorization', `Bearer ${hqToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  it('POST /stores/:storeId/inventory/csv-import — 400 when csvContent missing', async () => {
    const res = await supertest(app.getHttpServer())
      .post('/api/v1/stores/fake-id/inventory/csv-import')
      .set('Authorization', `Bearer ${hqToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('GET /stores/:storeId/transactions — 401 without token', async () => {
    const res = await supertest(app.getHttpServer()).get('/api/v1/stores/fake-id/transactions');
    expect(res.status).toBe(401);
  });

  it('POST /stores/:storeId/transactions — 400 when body invalid', async () => {
    const res = await supertest(app.getHttpServer())
      .post('/api/v1/stores/fake-id/transactions')
      .set('Authorization', `Bearer ${hqToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
