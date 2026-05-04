import type { MockUser, UserRole } from "@/types/auth";

export type { MockUser, UserRole } from "@/types/auth";

// Mock authentication store for development/testing

// Mocked users for testing
const mockUsers: MockUser[] = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    nome: 'Administrador Sistema'
  },
  {
    id: '2',
    username: 'recepcionista',
    password: 'recep123',
    role: 'recepcionista',
    nome: 'Ana Paula Recepção'
  },
  {
    id: '3',
    username: 'atendente',
    password: 'atend123',
    role: 'atendente',
    nome: 'Roberta Nascimento',
    
  },
  {
    id: '4',
    username: 'supervisor',
    password: 'super123',
    role: 'supervisor',
    nome: 'Carlos Supervisor'
  },
  {
    id: '5',
    username: 'gestor',
    password: 'gestor123',
    role: 'gestor',
    nome: 'Maria Gestora'
  },
  {
    id: '6',
    username: 'atendente 156',
    password: '156',
    role: 'atendente 156',
    nome: 'Maria  156'
  }
];

class AuthStore {
  private currentUser: MockUser | null = null;
  private storageKey = 'cras_mock_user';

  constructor() {
    // Load user from localStorage on init
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch (e) {
        localStorage.removeItem(this.storageKey);
      }
    }
  }

  login(username: string, password: string): MockUser | null {
    const user = mockUsers.find(
      u => u.username === username && u.password === password
    );

    if (user) {
      this.currentUser = user;
      // Don't save mesa yet for atendentes, will be set after guiche selection
      const userToStore = user.role === 'atendente' ? { ...user, mesa: undefined } : user;
      localStorage.setItem(this.storageKey, JSON.stringify(userToStore));
      return user;
    }

    return null;
  }

  setMesa(mesa: string) {
    if (this.currentUser) {
      this.currentUser.mesa = mesa;
      localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser));
    }
  }

  getMesa(): string | undefined {
    return this.currentUser?.mesa;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.storageKey);
  }

  getCurrentUser(): MockUser | null {
    return this.currentUser;
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser?.role === role;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    return this.currentUser ? roles.includes(this.currentUser.role) : false;
  }
}

export const authStore = new AuthStore();
export { mockUsers };
