import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { BadRequestException } from '@nestjs/common';

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  userRegion: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  tenantRegion: {
    findFirst: jest.fn(),
  },
};

const mockAuth = {
  hashPassword: jest.fn().mockResolvedValue('hashed'),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthService, useValue: mockAuth },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('findAll returns users without passwordHash', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'a@b.com', passwordHash: 'secret', name: 'Alice' },
    ]);
    const result = await service.findAll();
    expect(result).toEqual([{ id: 'u1', email: 'a@b.com', name: 'Alice' }]);
  });

  it('create hashes password and inserts user', async () => {
    const dto = { email: 'a@b.com', password: 'Password1!', name: 'Alice', globalRole: 'HQ_ADMIN' as any, tenantId: 'tenant1' };
    mockPrisma.user.create.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Alice', globalRole: 'HQ_ADMIN', passwordHash: 'hashed' });
    const result = await service.create(dto);
    expect(mockAuth.hashPassword).toHaveBeenCalledWith('Password1!');
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: { email: 'a@b.com', passwordHash: 'hashed', name: 'Alice', globalRole: 'HQ_ADMIN', tenantId: 'tenant1' },
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('assignRegion throws BadRequestException when region does not exist', async () => {
    mockPrisma.tenantRegion.findFirst.mockResolvedValue(null);
    await expect(service.assignRegion('tenant1', 'u1', { region: 'Unknown' })).rejects.toThrow(BadRequestException);
  });

  it('assignRegion creates UserRegion record', async () => {
    mockPrisma.tenantRegion.findFirst.mockResolvedValue({ id: 'r1' });
    mockPrisma.userRegion.create.mockResolvedValue({ id: 'ur1' });
    await service.assignRegion('tenant1', 'u1', { region: 'KL' });
    expect(mockPrisma.userRegion.create).toHaveBeenCalledWith({
      data: { userId: 'u1', tenantId: 'tenant1', region: 'KL' },
    });
  });

  it('removeRegion deletes UserRegion record', async () => {
    mockPrisma.userRegion.deleteMany.mockResolvedValue({ count: 1 });
    await service.removeRegion('u1', 'KL');
    expect(mockPrisma.userRegion.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', region: 'KL' },
    });
  });
});
