import type { Appointment,  ServicoRegistrado, User } from "@/types/agenda";

// Global state management for appointments

export type { Appointment,  ServicoRegistrado, User } from "@/types/agenda";

class AppointmentStore {
  private appointments: Appointment[] = [
    {
      id: "1",
      unidade: "Messejana - Fortaleza",
      categoria: "Auxílio",
      servico: "Auxílio bolsa família",
      data: new Date().toISOString().split('T')[0],
      hora: "15:00",
      status: "Marcado",
      nomeCidadao: "Maria da Silva",
      cpfCidadao: "123.456.789-00",
      telefoneCidadao: "(85) 98765-4321",
    },
    {
      id: "2",
      unidade: "Messejana - Fortaleza",
      categoria: "Auxílio",
      servico: "Auxílio bolsa família",
      data: new Date().toISOString().split('T')[0],
      hora: "09:30",
      status: "Aguardando",
      nomeCidadao: "João Santos",
      cpfCidadao: "987.654.321-00",
      telefoneCidadao: "(85) 99876-5432",
    },
    {
      id: "3",
      unidade: "Messejana - Fortaleza",
      categoria: "Documentação",
      servico: "Emissão de documentos",
      data: "2025-09-03",
      hora: "09:30",
      status: "Finalizado",
      atendente: "Roberta Nascimento",
      nomeCidadao: "Carlos Souza",
      cpfCidadao: "456.789.123-00",
      telefoneCidadao: "(85) 98888-7777",
    },
    {
      id: "3",
      unidade: "Messejana - Fortaleza",
      categoria: "Documentação",
      servico: "Emissão de documentos",
      data: "2025-09-03",
      hora: "09:30",
      status: "Finalizado",
      atendente: "Roberta Nascimento",
      nomeCidadao: "Carlos Souza",
      cpfCidadao: "456.789.123-00",
      telefoneCidadao: "(85) 98888-7777",
    },
      {
      id: "3",
      unidade: "Messejana - Fortaleza",
      categoria: "Documentação",
      servico: "Emissão de documentos",
      data: "2025-09-03",
      hora: "09:30",
      status: "Finalizado",
      atendente: "Roberta Nascimento",
      nomeCidadao: "Carlos Souza",
      cpfCidadao: "456.789.123-00",
      telefoneCidadao: "(85) 98888-7777",
    },
      {
      id: "3",
      unidade: "Messejana - Fortaleza",
      categoria: "Documentação",
      servico: "Emissão de documentos",
      data: "2025-09-03",
      hora: "09:30",
      status: "Finalizado",
      atendente: "Roberta Nascimento",
      nomeCidadao: "Carlos Souza",
      cpfCidadao: "456.789.123-00",
      telefoneCidadao: "(85) 98888-7777",
    },
      {
      id: "3",
      unidade: "Messejana - Fortaleza",
      categoria: "Documentação",
      servico: "Emissão de documentos",
      data: "2025-09-03",
      hora: "09:30",
      status: "Finalizado",
      atendente: "Roberta Nascimento",
      nomeCidadao: "Carlos Souza",
      cpfCidadao: "456.789.123-00",
      telefoneCidadao: "(85) 98888-7777",
    },
      {
      id: "3",
      unidade: "Messejana - Fortaleza",
      categoria: "Documentação",
      servico: "Emissão de documentos",
      data: "2025-09-03",
      hora: "09:30",
      status: "Finalizado",
      atendente: "Roberta Nascimento",
      nomeCidadao: "Carlos Souza",
      cpfCidadao: "456.789.123-00",
      telefoneCidadao: "(85) 98888-7777",
    },
  ];


  private user: User = {
    nome: "Larissa Sousa",
    cpf: "070.607.043-70",
    telefone: "(85) 98803-3484",
    email: "larissasousa@gmail.com",
  };

  private currentAppointment: Partial<Appointment> = {};

  getUser() {
    return this.user;
  }

  getAppointments() {
    return [...this.appointments];
  }

  setUser(data: Partial<User>) {
    this.user = { ...this.user, ...data };
  }

  getCurrentAppointment() {
    return { ...this.currentAppointment };
  }

  setCurrentAppointment(data: Partial<Appointment>) {
    this.currentAppointment = { ...this.currentAppointment, ...data };
  }

  clearCurrentAppointment() {
    this.currentAppointment = {};
  }

  createAppointment() {
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      unidade: this.currentAppointment.unidade || "",
      categoria: this.currentAppointment.categoria || "",
      servico: this.currentAppointment.servico || "",
      tipoAtendimento: (this.currentAppointment as any).tipoAtendimento || "Comum",
      data: this.currentAppointment.data || "",
      hora: this.currentAppointment.hora || "",
      status: "Marcado",
      // Preenche dados do cidadão
      nomeCidadao: this.currentAppointment.nomeCidadao || this.user.nome,
      cpfCidadao: this.currentAppointment.cpfCidadao || this.user.cpf,
      telefoneCidadao: this.currentAppointment.telefoneCidadao || this.user.telefone,
    };
    this.appointments.unshift(newAppointment);
    this.clearCurrentAppointment();
    return newAppointment;
  }

  updateAppointment(id: string, data: Partial<Appointment>) {
    const index = this.appointments.findIndex((a) => a.id === id);
    if (index !== -1) {
      this.appointments[index] = { ...this.appointments[index], ...data };
    }
  }

  cancelAppointment(id: string) {
    this.updateAppointment(id, { status: "Cancelado" });
  }

  getAppointmentById(id: string) {
    return this.appointments.find((a) => a.id === id);
  }

  addAvaliacao(id: string, nota: number, comentario: string) {
    this.updateAppointment(id, { avaliacao: { nota, comentario } });
  }

  chamarAgendamento(id: string, atendente: string) {
    const now = new Date();
    const data = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0].substring(0, 5);
    
    this.updateAppointment(id, {
      status: "Ativado - Aguardando Atendimento",
      dataChamada: data,
      horaChamada: hora,
      atendenteQueRealizouChamada: atendente,
      tentativasChamada: (this.getAppointmentById(id)?.tentativasChamada || 0) + 1,
    });
  }

  chamarProximoAgendamento(atendente: string) {
    const hoje = new Date().toISOString().split('T')[0];
    const proximo = this.appointments
      .filter(a => 
        a.data === hoje && 
        (a.status === "Aguardando" || a.status === "Marcado" || a.status === "Ativado - Aguardando Atendimento")
      )
      .sort((a, b) => a.hora.localeCompare(b.hora))[0];

    if (proximo) {
      this.chamarAgendamento(proximo.id, atendente);
      return proximo;
    }
    return null;
  }

  registrarPausa(
    agendamentoId: string,
    atendente: string,
    tipo: "Banheiro" | "Lanche" | "Almoço",
    horaInicio: string,
    horaTermino?: string,
    justificativa?: string
  ) {
    const now = new Date();
    const dataInicio = now.toISOString().split('T')[0];
    
    let duracao: number;
    let termino: string;

    if (horaTermino) {
      // Cálculo manual
      const [hI, mI] = horaInicio.split(':').map(Number);
      const [hT, mT] = horaTermino.split(':').map(Number);
      duracao = (hT * 60 + mT) - (hI * 60 + mI);
      termino = horaTermino;
    } else {
      // Cálculo automático
      duracao = tipo === "Almoço" ? 60 : 15;
      const [h, m] = horaInicio.split(':').map(Number);
      const totalMinutos = h * 60 + m + duracao;
      const hFinal = Math.floor(totalMinutos / 60);
      const mFinal = totalMinutos % 60;
      termino = `${String(hFinal).padStart(2, '0')}:${String(mFinal).padStart(2, '0')}`;
    }

 
  }

}

export const appointmentStore = new AppointmentStore();

export const unidades = [
  "Messejana - Fortaleza",
  "Centro - Fortaleza",
  "Aldeota - Fortaleza",
  "Parangaba - Fortaleza",
];

export const categorias = [
  "Cadastro Único",
  "Documentos e Carteiras",
  "Benefícios Sociais",
  "Atendimento Técnico",
];

export const servicos: Record<string, string[]> = {
  "CADASTRO ÚNICO": [
    "Inclusão de nova família no Cadastro Único (1ª vez)",
    "Atualização Cadastral - Mudança de endereço ou renda",
    "Atualização Cadastral - Inclusão de novo membro na família",
    "Atualização Cadastral - Exclusão de membro da família",
    "Atualização Cadastral - Averiguação ou Desbloqueio",
    "Consulta situação do Benefício (Bolsa Família)",
    "Emissão de Comprovante CadÚnico / Declaração NIS"
  ],
  "DOCUMENTOS E CARTEIRAS": [
    "Solicitação de Carteira do Idoso (Interestadual)",
    "Entrega / Recebimento da Carteira do Idoso",
    "Emissão de Declaração para Passe Livre (PCD / Etufor)",
  ],
  "BENEFÍCIOS SOCIAIS": [
    "Orientação e encaminhamento do BPC / LOAS (Idoso ou Deficiente)",
    "Acompanhamento/Recadastro do BPC/LOAS",
    "Solicitação de Benefícios Eventuais (Cesta Básica, Auxílio Natalidade, Auxílio Funeral)"
  ],
  "ATENDIMENTO TÉCNICO": [
    "Atendimento por profissional técnico (Assistente Social, Psicólogo, Pedagogo, T.O.)",
  ],
};

export const horariosDisponiveis = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];
