// Store para gerenciamento da fila de espera
import { appointmentStore, unidades } from "@/lib/appointmentStore";

export interface PessoaFila {
  id: string;
  cpf: string;
  nome: string;
  categoria?: string;
  servico?: string;
  prioridade: "Normal" | "Preferencial" | "Urgente";
  horaChegada: string;
  dataChegada: string;
  status: "Aguardando" | "Chamado" | "Em Atendimento" | "Atendido" | "Ausente";
  horaChamada?: string;
  atendente?: string;
}

class FilaEsperaStore {
  private fila: PessoaFila[] = [
    {
      id: "1",
      cpf: "123.456.789-00",
      nome: "Maria Santos",
      servico: "Atendimento ao Publico",
      prioridade: "Normal",
      horaChegada: "08:15",
      dataChegada: new Date().toISOString().split("T")[0],
      status: "Aguardando",
    },
    {
      id: "2",
      cpf: "987.654.321-00",
      nome: "João Silva",
      servico: "Atendimento ao Publico",
      prioridade: "Preferencial",
      horaChegada: "08:30",
      dataChegada: new Date().toISOString().split("T")[0],
      status: "Aguardando",
    },
  ];

  getFila() {
    return [...this.fila].sort((a, b) => {
      // Ordenar por prioridade primeiro
      const prioridadeOrder = { Urgente: 0, Preferencial: 1, Normal: 2 };
      const prioDiff = prioridadeOrder[a.prioridade] - prioridadeOrder[b.prioridade];
      if (prioDiff !== 0) return prioDiff;

      // Depois por hora de chegada
      return a.horaChegada.localeCompare(b.horaChegada);
    });
  }

  adicionarPessoa(pessoa: Omit<PessoaFila, "id" | "status" | "horaChegada" | "dataChegada">) {
    const now = new Date();
    const novaPessoa: PessoaFila = {
      ...pessoa,
      servico: pessoa.servico || "Serviço não informado",
      id: Date.now().toString(),
      status: "Aguardando",
      horaChegada: now.toTimeString().split(" ")[0].substring(0, 5),
      dataChegada: now.toISOString().split("T")[0],
    };
    this.fila.unshift(novaPessoa);
    return novaPessoa;
  }

  removerPessoa(id: string) {
    this.fila = this.fila.filter((p) => p.id !== id);
  }

  chamarProximo(atendente: string) {
    const filaOrdenada = this.getFila();
    const proximo = filaOrdenada.find((p) => p.status === "Aguardando");

    if (!proximo) return null;

    // Remove da fila original
    const idx = this.fila.findIndex((p) => p.id === proximo.id);
    if (idx === -1) return null;
    const pessoa = this.fila[idx];
    this.fila.splice(idx, 1);

    // Cria um agendamento imediato para a pessoa chamada
    const now = new Date();
    const dataISO = now.toISOString().split("T")[0];
    const hora = now.toTimeString().split(" ")[0].substring(0, 5);

    appointmentStore.setCurrentAppointment({
      unidade: unidades[0],
      categoria: pessoa.categoria || "Demanda Espontânea",
      servico: pessoa.servico || "Atendimento ao Público",
      data: dataISO,
      hora,
      nomeCidadao: pessoa.nome,
      cpfCidadao: pessoa.cpf,
    });
    const novo = appointmentStore.createAppointment();
    appointmentStore.chamarAgendamento(novo.id, atendente);

    return pessoa;
  }

  getPessoaById(id: string) {
    return this.fila.find((p) => p.id === id);
  }

  atualizarStatus(id: string, status: PessoaFila["status"]) {
    const index = this.fila.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.fila[index] = { ...this.fila[index], status };
    }
  }
}

export const filaEsperaStore = new FilaEsperaStore();
