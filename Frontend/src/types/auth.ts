export type UserRole =
  | "admin"
  | "recepcionista"
  | "medico"
  | "enfermeiro"
  | "supervisor"
  | "gestor"
  | "coordenador"
  | "farmaceutico";

export interface MockUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  nome: string;
  mesa?: string;
}
