import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../app.module';
import * as supertest from 'supertest';

describe('Master Data API (e2e)', () => {
  let app: NestFastifyApplication;
  let hqToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const hqRes = await supertest(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'hq@taro-tea.com', password: 'HqAdmin123!' });
    hqToken = hqRes.body.accessToken;

    const saRes = await supertest(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@store-erp.io', password: 'SuperAdmin123!' });
    superAdminToken = saRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Tenants', () => {
    it('GET /tenants — 403 for HQ admin', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${hqToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /tenants — 200 for SUPER_ADMIN', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('TenantRegions', () => {
    it('GET /tenant-regions — 200 for HQ admin', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/api/v1/tenant-regions')
        .set('Authorization', `Bearer ${hqToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /tenant-regions — 201 for HQ admin with valid body', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/api/v1/tenant-regions')
        .set('Authorization', `Bearer ${hqToken}`)
        .send({ name: `E2E-Region-${Date.now()}` });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });

    it('POST /tenant-regions — 400 when name missing', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/api/v1/tenant-regions')
        .set('Authorization', `Bearer ${hqToken}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('Products', () => {
    it('GET /products — 200 for HQ admin', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${hqToken}`);
      expect(res.status).toBe(200);
    });

    it('POST /products — 201 for HQ admin', async () => {
      const sku = `SKU-E2E-${Date.now()}`;
      const res = await supertest(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${hqToken}`)
        .send({ name: 'E2E Product', nameEn: 'E2E Product', sku, category: 'test' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.sku).toBe(sku);
    });

    it('POST /products — 401 without token', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/api/v1/products')
        .send({ name: 'No Auth', nameEn: 'No Auth', sku: 'NO-AUTH-001' });
      expect(res.status).toBe(401);
    });
  });

  describe('Materials', () => {
    it('GET /materials — 200 for HQ admin', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/api/v1/materials')
        .set('Authorization', `Bearer ${hqToken}`);
      expect(res.status).toBe(200);
    });

    it('POST /materials — 201 for HQ admin', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/api/v1/materials')
        .set('Authorization', `Bearer ${hqToken}`)
        .send({ name: 'E2E Milk', nameEn: 'E2E Milk', type: 'INGREDIENT', unit: 'L', spec: '' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });

    it('GET /materials?type=INGREDIENT — 200', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/api/v1/materials?type=INGREDIENT')
        .set('Authorization', `Bearer ${hqToken}`);
      expect(res.status).toBe(200);
    });
  });
});
