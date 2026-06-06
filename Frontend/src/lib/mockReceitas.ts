export type ReceitaMedicamento = {
  nome: string;
  dosagem: string;
  frequencia: string;
  duracao: string;
  instrucoes?: string;
};

export type ReceitaRegistro = {
  id: string;
  agendamentoId: string;
  cidadaoNome: string;
  cidadaoCpf: string;
  profissional?: string;
  dataEmissao: string;
  diagnostico?: string;
  observacoes?: string;
  medicamentos: ReceitaMedicamento[];
};

const STORAGE_KEY = "mockReceitas";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function listMockReceitas(): ReceitaRegistro[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMockReceita(receita: ReceitaRegistro): void {
  const atual = listMockReceitas();
  atual.unshift(receita);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(atual));
}

export function filterMockReceitas(termo: string): ReceitaRegistro[] {
  const t = normalize(termo);
  if (!t) return listMockReceitas();
  return listMockReceitas().filter((r) => {
    const medicamentos = r.medicamentos.map((m) => `${m.nome} ${m.dosagem} ${m.frequencia}`).join(" ");
    return normalize(`${r.cidadaoNome} ${r.cidadaoCpf} ${r.diagnostico || ""} ${medicamentos}`).includes(t);
  });
}
