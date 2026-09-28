export const ROLES = {
  ADMIN: "admin",
  GESTOR: "gestor",
  SUPERVISOR: "supervisor",
  MEDICO: "medico",
  ENFERMEIRO: "enfermeiro",
  RECEPCIONISTA: "recepcionista",
  COORDENADOR: "coordenador",
} as const;

export const PROFISSIONAIS_SAUDE = [ROLES.MEDICO, ROLES.ENFERMEIRO] as const;

export function isProfissionalSaude(role?: string | null): boolean {
  return !!role && (PROFISSIONAIS_SAUDE as readonly string[]).includes(role);
}

export function isCargoProfissionalSaude(cargoNome?: string | null): boolean {
  const normalizado = String(cargoNome || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return isProfissionalSaude(normalizado);
}

export const ACCESS = {
  adminAgendamentos: [...PROFISSIONAIS_SAUDE, ROLES.SUPERVISOR, ROLES.GESTOR, ROLES.ADMIN, ROLES.RECEPCIONISTA, ROLES.COORDENADOR],
  atendimentoPublico: [ROLES.RECEPCIONISTA, ROLES.ADMIN],
  filaEspera: [ROLES.RECEPCIONISTA, ...PROFISSIONAIS_SAUDE, ROLES.SUPERVISOR, ROLES.ADMIN],
  confirmarChegada: [ROLES.RECEPCIONISTA, ROLES.ADMIN, ...PROFISSIONAIS_SAUDE],
  registrarServicos: [...PROFISSIONAIS_SAUDE, ROLES.SUPERVISOR, ROLES.ADMIN],
  prontuario: [...PROFISSIONAIS_SAUDE, ROLES.SUPERVISOR, ROLES.ADMIN],
  prontuarioClinico: [...PROFISSIONAIS_SAUDE],
  configurarServicos: [ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.COORDENADOR],
  bloquearHorarios: [ROLES.SUPERVISOR, ROLES.GESTOR, ROLES.ADMIN, ROLES.COORDENADOR],
  gerenciarProfissionais: [ROLES.SUPERVISOR, ROLES.GESTOR, ROLES.ADMIN, ROLES.COORDENADOR],
  controleCapacidade: [ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.COORDENADOR],
  gerenciarUnidades: [ROLES.GESTOR, ROLES.ADMIN],
  cadastroServico: [ROLES.GESTOR, ROLES.ADMIN],
  cadastroUnidade: [ROLES.ADMIN],
  cadastroProfissional: [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.COORDENADOR],
  adminUnidades: [ROLES.ADMIN],
  adminServicos: [ROLES.ADMIN],
  adminBairros: [ROLES.ADMIN],
  adminPerguntas: [ROLES.ADMIN],
  supervisorGuiches: [ROLES.SUPERVISOR, ROLES.ADMIN],
  coordenadorGuiches: [ROLES.COORDENADOR, ROLES.ADMIN],
  horario: undefined,
  cadastroCidadao: [ROLES.ADMIN, ROLES.RECEPCIONISTA],
  agendarCidadao: [ROLES.RECEPCIONISTA, ROLES.ADMIN],
  dashboard: [ROLES.SUPERVISOR, ROLES.COORDENADOR],
  dashboardGestor: [ROLES.GESTOR],
  dashboardAtendente: [...PROFISSIONAIS_SAUDE],
  monitorUnidade: [ROLES.GESTOR, ROLES.ADMIN],
};
