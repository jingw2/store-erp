import { PrismaClient, GlobalRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // SUPER_ADMIN (platform operator, no tenantId)
  const superAdminHash = await bcrypt.hash('SuperAdmin123!', 10);
  await prisma.user.upsert({
    where: { email: 'superadmin@store-erp.io' },
    update: {},
    create: {
      email: 'superadmin@store-erp.io',
      passwordHash: superAdminHash,
      name: 'Super Admin',
      globalRole: GlobalRole.SUPER_ADMIN,
      tenantId: null,
    },
  });

  // Demo tenant: Taro Tea
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'taro-tea' },
    update: {},
    create: {
      name: 'Taro Tea',
      slug: 'taro-tea',
      defaultLocale: 'zh',
    },
  });

  // HQ Admin for demo tenant
  const hqHash = await bcrypt.hash('HqAdmin123!', 10);
  await prisma.user.upsert({
    where: { email: 'hq@taro-tea.com' },
    update: {},
    create: {
      email: 'hq@taro-tea.com',
      passwordHash: hqHash,
      name: 'HQ Admin',
      globalRole: GlobalRole.HQ_ADMIN,
      tenantId: tenant.id,
    },
  });

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
