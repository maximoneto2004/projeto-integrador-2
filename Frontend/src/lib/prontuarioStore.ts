import type {
  AcolhimentoInstitucional,
  AvaliacaoAcompanhamento,
  BeneficioEventual,
  CondicaoEducacional,
  CondicaoHabitacional,
  CondicaoSaude,
  CondicaoTrabalho,
  Encaminhamento,
  EvolucaoAcompanhamento,
  MembroFamiliar,
  ParticipacaoServico,
  Pessoa,
  Prontuario,
  ServicoAtendimento,
  SituacaoViolencia,
  MedidaSocioeducativa,
} from "@/types/prontuario";

export type {
  AcolhimentoInstitucional,
  AvaliacaoAcompanhamento,
  BeneficioEventual,
  CondicaoEducacional,
  CondicaoHabitacional,
  CondicaoSaude,
  CondicaoTrabalho,
  Encaminhamento,
  EvolucaoAcompanhamento,
  MembroFamiliar,
  ParticipacaoServico,
  Pessoa,
  Prontuario,
  ServicoAtendimento,
  SituacaoViolencia,
  MedidaSocioeducativa,
} from "@/types/prontuario";

// Store para gerenciar dados do prontuário familiar (SUAS)

class ProntuarioStore {
  excluirMembro(cpfRef: string, registro: { id: string; membroId: string; dataExclusao: string; observacao: string; }) {
    throw new Error("Method not implemented.");
  }
  atualizarMembro(cpfRef: string, novoRegistro: {
    parentesco: string; ordem: number; id: string; cpf: string; nome: string; apelido: string; email?: string; telefone?: string; sexo?: string; dataNascimento?: string; nomeMae?: string; nis?: string; rg?: string; rgOrgao?: string; rgUf?: string; rgDataEmissao?: string;
    // Endereço completo
    enderecoRua?: string; enderecoNumero?: string; enderecoComplemento?: string; enderecoBairro?: string; enderecoMunicipio?: string; enderecoUf?: string; enderecoCep?: string; enderecoPontoReferencia?: string; enderecoLocalizacao?: "Urbano" | "Rural"; enderecoAbrigo?: boolean;
  }) {
    throw new Error("Method not implemented.");
  }
  atualizarCondicaoSaude(numero: any, novo: CondicaoSaude) {
    throw new Error("Method not implemented.");
  }
  adicionarEncaminhamento(cpf: string, encaminhamento: Encaminhamento) {
    throw new Error("Method not implemented.");
  }
  atualizarAcolhimentoExtra(cpf: string, arg1: { textoPerdaDomicilio: string; textoGuardaExterna: string; situacaoPrisional: boolean; situacaoSocioeducativa: boolean; }) {
    throw new Error("Method not implemented.");
  }
  salvarSituacoesViolencia(
    cpfRef: string,
    arg1: {
      respostas: Record<string, string>;
      quadro2: { dataInicio: string; dataFim: string; creas: string };
      outrasObservacoesDiagnostico: string;
    }
  ) {
    throw new Error("Method not implemented.");
  }
  salvarConvivenciaFamiliar(cpfRef: string, form: {
    anosEstado: string;
    sempreEstado: boolean;
    anosMunicipio: string;
    sempreMunicipio: boolean;
    anosBairro: string;
    sempreBairro: boolean;
    discriminacao: string;
    discriminacaoObs: string;
    apoioRede: string;
    apoioRedeObs: string;
    vizinhos: string;
    vizinhosObs: string;
    religiao: string;
    religiaoObs: string;
    movimentos: string;
    movimentosObs: string;
    criancasSemAcesso: string;
    criancasSemAcessoObs: string;
    idososSemAcesso: string;
    idososSemAcessoObs: string;
    sozinhosCasa: string;
    sozinhosCasaObs: string;
    relConjugais: string;
    relPaisFilhos: string;
    relIrmaos: string;
    relOutros: string;
    outrasObservacoesDiagnostico: string;
  }) {
    throw new Error("Method not implemented.");
  }
  salvarEvolucaoAcompanhamento(cpf: string, arg1: { registros: any[]; planejamento: any[]; }) {
    throw new Error("Method not implemented.");
  }
  private pessoas: Map<string, Pessoa> = new Map();
  private prontuarios: Map<string, Prontuario> = new Map();
  private prontuarioAtual: string | null = null;

  constructor() {
    this.inicializarMocks();
  }

  private inicializarMocks() {
    // Mock de pessoas
    const pessoa1: Pessoa = {
      id: "1",
      cpf: "62682284372",
      nome: "Francisca Eridan Barbosa Rodrigues",
      email: "francisca@example.com",
      telefone: "(85) 90000-0000",
      sexo: "Feminino",
      dataNascimento: "1989-03-12",
      nomeMae: "Maria Barbosa Rodrigues",
      nis: "12345678901",
      rg: "123456789",
      rgOrgao: "SSP",
      rgUf: "CE",
      rgDataEmissao: "2005-01-15",
      enderecoRua: "Rua Bom Jardim",
      enderecoNumero: "120",
      enderecoComplemento: "Casa",
      enderecoBairro: "Bom Jardim",
      enderecoMunicipio: "Fortaleza",
      enderecoUf: "CE",
      enderecoCep: "60540-270",
      enderecoPontoReferencia: "Próximo ao Mercado Municipal",
      enderecoLocalizacao: "Urbano",
      enderecoAbrigo: false,
      apelido: ""
    };

    const pessoa2: Pessoa = {
      id: "2",
      cpf: "1452555",
      nome: "Digenes Mendonça",
      email: "digenes@example.com",
      telefone: "(85) 98888-1111",
      sexo: "Masculino",
      dataNascimento: "1985-10-28",
      enderecoRua: "Rua Bom Jardim",
      enderecoNumero: "120",
      enderecoBairro: "Bom Jardim",
      enderecoMunicipio: "Fortaleza",
      enderecoUf: "CE",
      apelido: ""
    };

    const pessoa3: Pessoa = {
      id: "3",
      cpf: "00477822190",
      nome: "Carlos Souza",
      email: "carlos@example.com",
      telefone: "(85) 97777-2222",
      sexo: "Masculino",
      dataNascimento: "2014-06-14",
      enderecoRua: "Rua Bom Jardim",
      enderecoNumero: "120",
      enderecoBairro: "Bom Jardim",
      enderecoMunicipio: "Fortaleza",
      enderecoUf: "CE",
      apelido: ""
    };

    this.pessoas.set(pessoa1.cpf, pessoa1);
    this.pessoas.set(pessoa2.cpf, pessoa2);
    this.pessoas.set(pessoa3.cpf, pessoa3);

    // Mock de prontuário
    const prontuario1: Prontuario = {
      numero: "PR-000001",
      unidade: "CRAS Bom Jardim",
      pessoaReferenciaId: "1",
      dataAbertura: "2025-01-15",
      versao: "1.0",
      membros: [
        {
          ...pessoa1,
          parentesco: "Pessoa de Referência",
          ordem: 1
        },
        {
          ...pessoa2,
          parentesco: "Cônjuge/Companheiro(a)",
          ordem: 2
        },
        {
          ...pessoa3,
          parentesco: "Filho(a)",
          ordem: 3
        }
      ],
      condicoesHabitacionais: [
        {
          id: "h1",
          tipoMoradia: "Casa própria",
          numeroComodos: 5,
          condicoesEstruturais: "Boas condições",
          abastecimento: "Rede pública",
          saneamento: "Rede de esgoto",
          coleta: "Coleta pública regular",
          energia: "Rede elétrica",
          dataRegistro: "2025-01-15",
          possuiAguaCanalizada: "",
          numeroDormitorios: 0,
          mediaPessoasPorDormitorio: "",
          acessibilidade: "",
          riscoDesabamento: "",
          dificilAcesso: "",
          areaConflito: "",
          materialParedes: "",
          observacoesDiagnostico: ""
        }
      ],
      condicoesEducacionais: [
        {
          id: "e1",
          membroId: "3",
          escolaridade: "Ensino Médio Incompleto",
          alfabetizado: true,
          frequenciaEscolar: "Regular",
          situacaoEscolar: "Cursando",
          observacoes: "Frequenta o 2º ano do ensino médio",
          observacoesDiagnostico: "",
          dataRegistro: "2025-01-15"
        }
      ],
      condicoesTrabalho: [
        {
          id: "t1",
          membroId: "2",
          ocupacao: "Pedreiro",
          vinculo: "Autônomo",
          rendaIndividual: 1500,
          carteiraAssinada: false,
          desempregado: false,
          observacoes: "Trabalho eventual",
          dataRegistro: "2025-01-15"
        }
      ],
      condicoesSaude: [],
      condicoesSaudeObservacoes: "",
      beneficiosEventuais: [],
      participacoesServicos: [
        {
          id: "ps1",
          membroId: "1",
          servico: "PAIF - Programa de Atenção Integral à Família",
          dataInicio: "2025-01-15",
          frequencia: "Mensal",
          observacoes: "Participação regular nos encontros"
        }
      ],
      situacoesViolencia: [],
      medidasSocioeducativas: [],
      acolhimentos: [],
      evolucoes: [
        {
          id: "ev1",
          data: "2025-01-20",
          tecnico: "Larissa Sousa",
          metas: "Acompanhamento familiar mensal",
          necessidades: "Apoio psicossocial",
          evolucao: "Família apresenta boa receptividade ao acompanhamento inicial. Realizada entrevista e preenchimento do prontuário.",
          visitasTecnicas: 1,
          observacoes: "Primeira visita técnica realizada - PAIF"
        },
        {
          id: "ev2",
          data: "2025-02-15",
          tecnico: "Carlos Mendes",
          metas: "Fortalecer vínculos familiares",
          necessidades: "Acompanhamento educacional dos filhos",
          evolucao: "Realizado acompanhamento da família. Criança matriculada na escola. Família participou de oficina sobre educação parental.",
          visitasTecnicas: 2,
          observacoes: "Atendimento em grupo"
        },
        {
          id: "ev3",
          data: "2025-03-10",
          tecnico: "Gustavo Lima",
          metas: "Apoio na geração de renda",
          necessidades: "Encaminhamento para cursos profissionalizantes",
          evolucao: "Família encaminhada para curso de capacitação profissional. Pessoa de referência demonstrou interesse em qualificação.",
          visitasTecnicas: 3,
          observacoes: "Encaminhamento realizado"
        },
        {
          id: "ev4",
          data: "2025-11-14",
          tecnico: "Larissa Sousa",
          metas: "Monitoramento dos vínculos familiares",
          necessidades: "Continuidade do acompanhamento",
          evolucao: "XPTO - Família apresenta evolução positiva. Vínculos fortalecidos. Continuidade do acompanhamento mensal.",
          visitasTecnicas: 4,
          observacoes: "Aguardando atendimento"
        }
      ],
      servicosAtendimento: [
        {
          id: "sa1",
          servico: "PAIF - Acompanhamento Familiar",
          categoria: "Proteção Social Básica",
          status: "Realizado",
          observacoes: "Primeira sessão realizada com sucesso"
        }
      ],
      evolucaoAcompanhamento: undefined,
      encaminhamentos: []
    };

    this.prontuarios.set(pessoa1.cpf, prontuario1);
  }

  getPessoaByCpf(cpf: string): Pessoa | undefined {
    return this.pessoas.get(cpf);
  }

  getProntuarioByCpf(cpf: string): Prontuario | undefined {
    return this.prontuarios.get(cpf);
  }

  setProntuarioAtual(cpf: string) {
    this.prontuarioAtual = cpf;
  }

  getProntuarioAtual(): Prontuario | null {
    if (!this.prontuarioAtual) return null;
    return this.prontuarios.get(this.prontuarioAtual) || null;
  }


  buscarProntuarios(termo: string): Prontuario[] {
    const termoLower = termo.toLowerCase();

    const resultados: Prontuario[] = [];

    for (const [cpf, prontuario] of this.prontuarios.entries()) {
      const pessoaReferencia = prontuario.membros.find(
        m => m.id === prontuario.pessoaReferenciaId
      );

      const nomeRef = pessoaReferencia?.nome?.toLowerCase() || "";
      const cpfRef = pessoaReferencia?.cpf || "";
      const numeroProntuario = prontuario.numero.toLowerCase();

      const match =
        nomeRef.includes(termoLower) ||
        cpfRef.includes(termo) ||
        numeroProntuario.includes(termoLower);

      if (match) {
        resultados.push(prontuario);
      }
    }

    return resultados;
  }


  adicionarMembro(cpf: string, membro: MembroFamiliar) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      membro.ordem = prontuario.membros.length + 1;
      prontuario.membros.push(membro);
      this.pessoas.set(membro.cpf, membro);
    }
  }

  adicionarCondicaoHabitacional(cpf: string, condicao: CondicaoHabitacional) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      prontuario.condicoesHabitacionais.push(condicao);
    }
  }

  adicionarCondicaoEducacional(cpf: string, condicao: CondicaoEducacional) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      prontuario.condicoesEducacionais.push(condicao);
    }
  }

  adicionarCondicaoTrabalho(cpf: string, condicao: CondicaoTrabalho) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      prontuario.condicoesTrabalho.push(condicao);
    }
  }

  adicionarCondicaoSaude(cpf: string, condicao: CondicaoSaude) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      prontuario.condicoesSaude.push(condicao);
    }
  }

  salvarCondicoesSaudeObservacoes(cpf: string, observacoes: string) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      prontuario.condicoesSaudeObservacoes = observacoes;
    }
  }

  adicionarBeneficioEventual(cpf: string, beneficio: BeneficioEventual) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      prontuario.beneficiosEventuais.push(beneficio);
    }
  }

  adicionarParticipacaoServico(cpf: string, participacao: ParticipacaoServico) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      prontuario.participacoesServicos.push(participacao);
    }
  }

  adicionarSituacaoViolencia(cpf: string, situacao: SituacaoViolencia) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      prontuario.situacoesViolencia.push(situacao);
    }
  }

  adicionarMedidaSocioeducativa(cpf: string, medida: MedidaSocioeducativa) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      const idx = prontuario.medidasSocioeducativas.findIndex((item) => item.membroId === medida.membroId);
      if (idx >= 0) {
        prontuario.medidasSocioeducativas[idx] = medida;
      } else {
        prontuario.medidasSocioeducativas.push(medida);
      }
    }
  }

  adicionarAcolhimento(cpf: string, acolhimento: AcolhimentoInstitucional) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      prontuario.acolhimentos.push(acolhimento);
    }
  }

  adicionarEvolucao(cpf: string, evolucao: EvolucaoAcompanhamento) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      prontuario.evolucoes.push(evolucao);
    }
  }

  adicionarServicoAtendimento(cpf: string, servico: ServicoAtendimento) {
    const prontuario = this.prontuarios.get(cpf);
    if (prontuario) {
      prontuario.servicosAtendimento.push(servico);
    }
  }

 


  criarNovoProntuario(cpf: string, pessoa: Pessoa, unidade: string): Prontuario {
    const novoProntuario: Prontuario = {
      numero: `PR-${String(this.prontuarios.size ).padStart(6, '0')}`,
      unidade: unidade,
      pessoaReferenciaId: pessoa.id,
      dataAbertura: new Date().toISOString().split('T')[0],
      versao: "1.0",
      membros: [{
        ...pessoa,
        parentesco: "Pessoa de Referência",
        ordem: 1
      }],
      condicoesHabitacionais: [],
      condicoesEducacionais: [],
      condicoesTrabalho: [],
      condicoesSaude: [],
      condicoesSaudeObservacoes: "",
      beneficiosEventuais: [],
      participacoesServicos: [],
      situacoesViolencia: [],
      medidasSocioeducativas: [],
      acolhimentos: [],
      evolucoes: [],
      servicosAtendimento: [],
      evolucaoAcompanhamento: undefined,
      encaminhamentos: []
    };

    this.prontuarios.set(cpf, novoProntuario);
    this.pessoas.set(cpf, pessoa);
    return novoProntuario;
  }
}

export const prontuarioStore = new ProntuarioStore();
