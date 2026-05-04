import type { Professional } from "@/types/professional";

export type { Professional } from "@/types/professional";

// Global state management for professionals

class ProfessionalStore {
  private professionals: Professional[] = [
    {
      id: "1",
      nome: "Maria Silva Santos",
      cpf: "123.456.789-00",
      matricula: "CRAS2024001",
      cargo: "Assistente Social",
      unidades: ["Messejana - Fortaleza", "Centro - Fortaleza"],
      telefone: "(85) 98765-4321",
      email: "maria.silva@cras.gov.br",
      dataAdmissao: "2024-01-15",
      status: "Ativo",
      escalaTrabalho: "Segunda a Sexta, 8h às 17h",
    },
    {
      id: "2",
      nome: "João Pedro Oliveira",
      cpf: "987.654.321-00",
      matricula: "CRAS2024002",
      cargo: "Psicólogo",
      unidades: ["Aldeota - Fortaleza"],
      telefone: "(85) 98888-7777",
      email: "joao.pedro@cras.gov.br",
      dataAdmissao: "2024-02-01",
      status: "Ativo",
      escalaTrabalho: "Segunda a Sexta, 8h às 14h",
    },
  ];

  getProfessionals() {
    return [...this.professionals];
  }

  getProfessionalById(id: string) {
    return this.professionals.find((p) => p.id === id);
  }

  createProfessional(data: Omit<Professional, "id">) {
    const newProfessional: Professional = {
      id: Date.now().toString(),
      ...data,
    };
    this.professionals.push(newProfessional);
    return newProfessional;
  }

  updateProfessional(id: string, data: Partial<Professional>) {
    const index = this.professionals.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.professionals[index] = { ...this.professionals[index], ...data };
      return this.professionals[index];
    }
    return null;
  }

  deleteProfessional(id: string) {
    const index = this.professionals.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.professionals.splice(index, 1);
      return true;
    }
    return false;
  }
}

export const professionalStore = new ProfessionalStore();

export const cargos = [
  "Assistente Social",
  "Psicólogo",
  "Pedagogo",
  "Coordenador",
  "Auxiliar Administrativo",
  "Recepcionista",
];
