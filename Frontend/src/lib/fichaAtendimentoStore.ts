import type { ComposicaoFamiliarItem, FichaAtendimento, OrigemAtendimento } from "@/types/fichaAtendimento";

const STORAGE_KEY = "cras_fichas_atendimento";

const normalizeCpf = (cpf: string) => (cpf || "").replace(/\D/g, "");

const criarLinha = (ordem: number): ComposicaoFamiliarItem => ({
  id: `m-${ordem}-${Date.now()}`,
  ordem,
  nome: "",
  parentesco: "",
  beneficio: "",
  dataNascimento: "",
  escolaridade: "",
  ocupacao: "",
  renda: "",
});

class FichaAtendimentoStore {
  private fichas: FichaAtendimento[] = [];

  constructor() {
    this.carregar();
  }

  private carregar() {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.fichas = JSON.parse(raw) as FichaAtendimento[];
          return;
        }
      }
    } catch (err) {
      console.warn("Falha ao carregar fichas salvas", err);
    }

    const agora = new Date().toISOString();
    this.fichas = [
      {
        id: "ficha-001",
        appointmentId: "1",
        cras: "CRAS Bom Jardim",
        numeroInscricao: "000123",
        tecnicoResponsavel: "Larissa Sousa",
        funcao: "Assistente Social",
        dataInclusao: new Date().toISOString().split("T")[0],
        origemAtendimento: "Demanda Espontanea",
        origemDetalhe: "",
        participacoes: ["PAIF"],
        numeroProntuarioSuas: "PR-000001",
        participacaoOutros: "",
        cpfResponsavel: "62682284372",
        responsavelNome: "Francisca Eridan Barbosa Rodrigues",
        responsavelNis: "12345678901",
        naturalidade: "Fortaleza",
        estadoCivil: "Casada",
        rg: "123456",
        rgOrgao: "SSP/CE",
        rgData: "2005-01-15",
        cpf: "626.822.843-72",
        endereco: "Rua Bom Jardim, 120",
        bairro: "Bom Jardim",
        comunidade: "Bom Jardim",
        pontoReferencia: "Mercado Municipal",
        telefone: "(85) 90000-0000",
        telefoneTipo: "Proprio",
        sexo: "Feminino",
        composicaoFamiliar: [
          { ...criarLinha(1), nome: "Francisca Eridan Barbosa Rodrigues", parentesco: "Pessoa de Referencia", beneficio: "BPC", dataNascimento: "1989-03-12", escolaridade: "Ensino Medio", ocupacao: "Autonoma", renda: "1500" },
          criarLinha(2),
          criarLinha(3),
          criarLinha(4),
        ],
        demandaApresentada: "Solicitou acompanhamento para atualizacao do CadUnico.",
        encaminhamentos: "Encaminhada para atualização no Cadastro Unico.",
        observacoes: "Familia em acompanhamento inicial.",
        createdAt: agora,
        updatedAt: agora,
      },
    ];
  }

  private persistir() {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.fichas));
      }
    } catch {
      // Ambiente sem acesso a localStorage; ignora persistencia
    }
  }

  listarHistorico(cpf?: string) {
    const alvo = normalizeCpf(cpf || "");
    return [...this.fichas]
      .filter((f) => !alvo || normalizeCpf(f.cpfResponsavel || f.cpf || "") === alvo)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getByAppointmentOrCpf(appointmentId?: string, cpf?: string) {
    const alvo = normalizeCpf(cpf || "");
    return this.fichas.find(
      (f) =>
        (appointmentId && f.appointmentId === appointmentId) ||
        (alvo && normalizeCpf(f.cpfResponsavel || f.cpf || "") === alvo),
    );
  }

  criarModeloVazio(cpf?: string, nome?: string, unidade?: string): FichaAtendimento {
    const hoje = new Date().toISOString().split("T")[0];
    const agora = new Date().toISOString();

    return {
      id: `ficha-${Date.now()}`,
      appointmentId: undefined,
      cras: unidade || "",
      numeroInscricao: "",
      tecnicoResponsavel: "",
      funcao: "",
      dataInclusao: hoje,
      origemAtendimento: "Demanda Espontanea",
      origemDetalhe: "",
      participacoes: [],
      numeroProntuarioSuas: "",
      participacaoOutros: "",
      cpfResponsavel: cpf || "",
      responsavelNome: nome || "",
      responsavelNis: "",
      naturalidade: "",
      estadoCivil: "",
      rg: "",
      rgOrgao: "",
      rgData: "",
      cpf: cpf || "",
      endereco: "",
      bairro: "",
      comunidade: "",
      pontoReferencia: "",
      telefone: "",
      telefoneTipo: "Proprio",
      sexo: "Feminino",
      composicaoFamiliar: Array.from({ length: 5 }).map((_, idx) => criarLinha(idx + 1)),
      demandaApresentada: "",
      encaminhamentos: "",
      observacoes: "",
      createdAt: agora,
      updatedAt: agora,
    };
  }

  salvarFicha(ficha: FichaAtendimento) {
    const alvoCpf = normalizeCpf(ficha.cpfResponsavel || ficha.cpf || "");
    const idx = this.fichas.findIndex(
      (f) =>
        f.id === ficha.id ||
        (ficha.appointmentId && f.appointmentId === ficha.appointmentId) ||
        (!!alvoCpf && normalizeCpf(f.cpfResponsavel || f.cpf || "") === alvoCpf),
    );

    const agora = new Date().toISOString();
    const registro: FichaAtendimento = {
      ...ficha,
      createdAt: idx >= 0 ? this.fichas[idx].createdAt : ficha.createdAt || agora,
      updatedAt: agora,
      participacoes: ficha.participacoes || [],
      composicaoFamiliar: ficha.composicaoFamiliar || [],
      cpfResponsavel: ficha.cpfResponsavel || ficha.cpf || "",
    };

    if (idx >= 0) {
      this.fichas[idx] = { ...this.fichas[idx], ...registro };
    } else {
      this.fichas.unshift(registro);
    }

    this.persistir();
    return registro;
  }
}

export const fichaAtendimentoStore = new FichaAtendimentoStore();

export type { FichaAtendimento, OrigemAtendimento, ComposicaoFamiliarItem } from "@/types/fichaAtendimento";
