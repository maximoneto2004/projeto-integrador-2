export type UserRole =
  | "admin"
  | "recepcionista"
  | "atendente"
  | "supervisor"
  | "gestor"
  | "atendente 156"
  | "coordenador";

export interface MockUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  nome: string;
  mesa?: string;
}
