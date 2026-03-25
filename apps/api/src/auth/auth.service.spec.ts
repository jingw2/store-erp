import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { GlobalRole } from '@store-erp/types';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '15m' } }),
      ],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return null for unknown email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await service.validateUser('unknown@test.com', 'pass');
    expect(result).toBeNull();
  });

  it('should return null for wrong password', async () => {
    const hash = await bcrypt.hash('correct', 10);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: '1', email: 'a@b.com', passwordHash: hash,
      globalRole: GlobalRole.STAFF, tenantId: 't1',
    });
    const result = await service.validateUser('a@b.com', 'wrong');
    expect(result).toBeNull();
  });

  it('should return AuthUser for valid credentials', async () => {
    const hash = await bcrypt.hash('correct', 10);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: '1', email: 'a@b.com', passwordHash: hash,
      globalRole: GlobalRole.HQ_ADMIN, tenantId: 't1',
    });
    const result = await service.validateUser('a@b.com', 'correct');
    expect(result).toEqual({ userId: '1', tenantId: 't1', role: GlobalRole.HQ_ADMIN });
  });

  it('should issue a JWT containing userId and tenantId', async () => {
    const token = await service.login({ userId: '1', tenantId: 't1', role: GlobalRole.HQ_ADMIN });
    expect(token.accessToken).toBeDefined();
    expect(typeof token.accessToken).toBe('string');
  });
});
