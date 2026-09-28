import { PROFISSIONAIS_SAUDE, ROLES } from "./acess";

type UserRole = (typeof ROLES)[keyof typeof ROLES];

const TABLE_PERMISSIONS: Record<string, ReadonlyArray<UserRole>> = {
  call: [...PROFISSIONAIS_SAUDE],
  edit: [ROLES.SUPERVISOR, ROLES.RECEPCIONISTA],
  cancel: [ROLES.SUPERVISOR, ROLES.RECEPCIONISTA],
  confirmArrival: [ROLES.RECEPCIONISTA],
  register: [...PROFISSIONAIS_SAUDE, ROLES.SUPERVISOR],
  assume: [ROLES.SUPERVISOR],
};

export type TablePermissionAction = keyof typeof TABLE_PERMISSIONS;

export function getTablePermissions(userRole?: UserRole) {
  const can = (action: TablePermissionAction) => !!userRole && TABLE_PERMISSIONS[action].includes(userRole);
  return {
    canCall: can("call"),
    canEdit: can("edit"),
    canCancel: can("cancel"),
    canConfirmArrival: can("confirmArrival"),
    canRegister: can("register"),
    canAssume: can("assume"),
  };
}
