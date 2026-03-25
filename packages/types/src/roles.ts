export enum GlobalRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HQ_ADMIN = 'HQ_ADMIN',
  REGIONAL_MANAGER = 'REGIONAL_MANAGER',
  STORE_MANAGER = 'STORE_MANAGER',
  STAFF = 'STAFF',
}

export enum StoreRole {
  STORE_MANAGER = 'STORE_MANAGER',
  STAFF = 'STAFF',
}

export function isSuperAdmin(role: GlobalRole): boolean {
  return role === GlobalRole.SUPER_ADMIN;
}

export function canConfigureMasterData(role: GlobalRole): boolean {
  return role === GlobalRole.SUPER_ADMIN || role === GlobalRole.HQ_ADMIN;
}
