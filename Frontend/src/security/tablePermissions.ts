import { ROLES } from "./acess";

type UserRole = (typeof ROLES)[keyof typeof ROLES];

const TABLE_PERMISSIONS: Record<string, ReadonlyArray<UserRole>> = {
  call: [ROLES.ATENDENTE],
  edit: [ROLES.SUPERVISOR, , ROLES.RECEPCIONISTA, ROLES.ATENDENTE_156],
  cancel: [ROLES.SUPERVISOR, , ROLES.RECEPCIONISTA, ROLES.ATENDENTE_156],
  confirmArrival: [ROLES.RECEPCIONISTA],
  register: [ROLES.ATENDENTE, ROLES.SUPERVISOR],
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
