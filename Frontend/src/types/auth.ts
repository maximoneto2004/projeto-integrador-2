export type UserRole =
  | "admin"
  | "recepcionista"
  | "medico"
  | "enfermeiro"
  | "supervisor"
  | "gestor"
  | "coordenador";

export interface MockUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  nome: string;
  mesa?: string;
}
