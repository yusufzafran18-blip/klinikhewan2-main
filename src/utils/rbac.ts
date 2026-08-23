import { UserRole, RBACConfig } from '../types';

export interface ModulePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export function getModulePermissions(
  tabId: string,
  userRole: UserRole,
  rbacConfig?: RBACConfig
): ModulePermissions {
  if (userRole === 'super_admin') {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
    };
  }

  let modId = tabId;
  if (modId === 'penjualan_direct') modId = 'penjualan';
  if (modId === 'master_data') modId = 'master';

  const mod = rbacConfig?.modules?.find((m) => m.id === modId);
  if (!mod) {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
    };
  }

  const isAllowedRole = mod.allowedRoles ? mod.allowedRoles.includes(userRole) : true;
  const actionPerm = mod.roleActions?.[userRole];

  const canView = isAllowedRole && (actionPerm ? actionPerm.canView : true);

  return {
    canView,
    canCreate: canView && (actionPerm ? actionPerm.canCreate : true),
    canEdit: canView && (actionPerm ? actionPerm.canEdit : true),
    canDelete: canView && (actionPerm ? actionPerm.canDelete : false),
    canExport: canView && (actionPerm ? actionPerm.canExport : true),
  };
}
