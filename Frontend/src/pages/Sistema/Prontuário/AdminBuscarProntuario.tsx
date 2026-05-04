import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Eye } from "lucide-react";
import { toast } from "@/lib/sonner";
import { useBuscarProntuario } from "@/hooks/prontuario/useProntuario";
import { pessoaReferenciaService } from "@/services/prontuario/pessoaReferenciaService";
import { unidadeCrasService } from "@/services/sistema/unidadeCrasService";
import { formatCpf } from "@/utils/cpfFormater";

const PAGE_SIZE = 10;

type BuscarProntuarioItem = {
  id?: string | number;
  prontuario_id?: string | number;
  prontuario?: string | number | { id?: string | number; numero?: string };
  numero?: string;
  numero_prontuario?: string;
  pessoa_referencia?: string | number | { id?: string | number; nome?: string; cpf?: string };
  pessoa_referencia_nome?: string;
  pessoa_referencia_cpf?: string;
  nome?: string;
  cpf?: string;
  unidade?: string | { nome?: string; unidade?: string };
  unidade_nome?: string;
  unidade_inicial?: string | number | { id?: string | number; nome?: string };
  [key: string]: unknown;
};

type BuscarResultadoItem = {
  id: string;
  numero: string;
  nomeReferencia: string;
  cpfReferencia: string;
  unidade: string;
};

type ListEnvelope<T> = {
  success?: boolean;
  result?: T | { count?: number; results?: T };
  count?: number;
  results?: T;
};

function normalizeCpf(value: string) {
  return value.replace(/\D/g, "");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function unwrapEnvelopeResult(data: unknown): unknown {
  const envelope = asRecord(data);
  if (!envelope) return data;
  if ("result" in envelope) return envelope.result;
  if ("data" in envelope) return envelope.data;
  return data;
}

function firstArrayItem(data: unknown): Record<string, unknown> | null {
  const result = unwrapEnvelopeResult(data);
  if (!Array.isArray(result) || result.length === 0) return null;
  return asRecord(result[0]);
}

function getUnidadeInicialId(item: BuscarProntuarioItem): string {
  const unidadeInicial = asRecord(item.unidade_inicial);
  return asString(unidadeInicial?.id) || asString(item.unidade_inicial) || "";
}

function unwrapArrayResponse(data: unknown): BuscarProntuarioItem[] {
  if (Array.isArray(data)) return data as BuscarProntuarioItem[];

  const envelope = asRecord(data);
  if (!envelope) return [];

  const rawResult = envelope.result;
  if (Array.isArray(rawResult)) return rawResult as BuscarProntuarioItem[];

  const resultRecord = asRecord(rawResult);
  if (resultRecord && Array.isArray(resultRecord.results)) {
    return resultRecord.results as BuscarProntuarioItem[];
  }

  if (Array.isArray(envelope.results)) return envelope.results as BuscarProntuarioItem[];

  return [];
}

function extractBackendTotal(data: unknown, listLength: number) {
  const envelope = asRecord(data) as ListEnvelope<BuscarProntuarioItem[]> | null;
  if (!envelope) return listLength;

  if (typeof envelope.count === "number") return envelope.count;

  const resultRecord = asRecord(envelope.result);
  if (resultRecord && typeof resultRecord.count === "number") {
    return resultRecord.count as number;
  }

  return listLength;
}

function normalizeResponseItems(data: unknown): BuscarResultadoItem[] {
  return unwrapArrayResponse(data).map((item, index) => {
    const pessoaReferencia = asRecord(item.pessoa_referencia);
    const unidadeObj = asRecord(item.unidade);
    const prontuarioObj = asRecord(item.prontuario);

    const id =
      asString(item.id) ||
      asString(item.prontuario_id) ||
      asString(prontuarioObj?.id) ||
      `${asString(item.numero || item.numero_prontuario)}-${index}`;

    const numero = asString(item.numero) || asString(item.numero_prontuario) || asString(prontuarioObj?.numero);

    const nomeReferencia = asString(item.pessoa_referencia_nome) || asString(pessoaReferencia?.nome) || asString(item.nome);

    const cpfReferencia = asString(item.pessoa_referencia_cpf) || asString(pessoaReferencia?.cpf) || asString(item.cpf);

    const unidade = asString(item.unidade_nome) || asString(unidadeObj?.nome) || asString(unidadeObj?.unidade) || asString(item.unidade);

    return {
      id,
      numero,
      nomeReferencia,
      cpfReferencia,
      unidade,
    };
  });
}

async function enrichResponseItems(data: unknown): Promise<BuscarResultadoItem[]> {
  const baseItems = normalizeResponseItems(data);
  if (baseItems.length === 0) return baseItems;

  const rawItems = unwrapArrayResponse(data);
  const unidadeById = new Map<string, string>();

  const needsUnidadeLookup = baseItems.some((item, index) => {
    const value = item.unidade.trim();
    if (value) return false;
    return Boolean(getUnidadeInicialId(rawItems[index]));
  });

  if (needsUnidadeLookup) {
    try {
      const unidades = await unidadeCrasService.listar();
      unidades.forEach((u) => {
        if (!u?.id) return;
        unidadeById.set(String(u.id), u.nome || "");
      });
    } catch {
      // Mantem fallback sem bloquear resultado.
    }
  }

  const itensEnriquecidos = await Promise.all(
    baseItems.map(async (item, index) => {
      const original = rawItems[index];
      const unidadeInicialId = getUnidadeInicialId(original);

      let nomeReferencia = item.nomeReferencia;
      let cpfReferencia = item.cpfReferencia;

      if ((!nomeReferencia || !cpfReferencia) && original?.id) {
        try {
          const response = await pessoaReferenciaService.listar({ prontuario: asString(original.id) });
          const pessoaRegistro = firstArrayItem(response.data);
          const pessoa = asRecord(pessoaRegistro?.pessoa_referencia);

          if (!nomeReferencia) {
            nomeReferencia = asString(pessoa?.nome) || asString(pessoa?.nome_completo) || asString(pessoaRegistro?.pessoa_referencia_nome);
          }

          if (!cpfReferencia) {
            cpfReferencia = asString(pessoa?.cpf) || asString(pessoaRegistro?.pessoa_referencia_cpf);
          }
        } catch {
          // Mantem fallback sem bloquear resultado.
        }
      }

      const unidade = item.unidade || unidadeById.get(unidadeInicialId) || "";

      return {
        ...item,
        nomeReferencia,
        cpfReferencia,
        unidade,
      };
    }),
  );

  return itensEnriquecidos;
}

export default function AdminBuscarProntuario() {
  const navigate = useNavigate();
  const buscarProntuario = useBuscarProntuario();

  const [termo, setTermo] = useState("");
  const [resultado, setResultado] = useState<BuscarResultadoItem[]>([]);
  const [buscaRealizada, setBuscaRealizada] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [termoBuscaAplicado, setTermoBuscaAplicado] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalItens, setTotalItens] = useState(0);

  const totalPaginas = useMemo(() => Math.max(1, Math.ceil(totalItens / PAGE_SIZE)), [totalItens]);
  const paginaInicio = useMemo(() => (totalItens ? (paginaAtual - 1) * PAGE_SIZE + 1 : 0), [paginaAtual, totalItens]);
  const paginaFim = useMemo(() => Math.min(paginaAtual * PAGE_SIZE, totalItens), [paginaAtual, totalItens]);

  const handleBuscar = async (page = 1, termoBusca?: string) => {
    const termoLimpo = (termoBusca ?? termoBuscaAplicado ?? termo).trim();
    if (!termoLimpo) {
      toast.error("Digite CPF, número do prontuário ou unidade.");
      return;
    }

    try {
      setCarregando(true);
      const offset = (page - 1) * PAGE_SIZE;
      const data = await buscarProntuario.mutateAsync({
        termo: termoLimpo,
        limit: PAGE_SIZE,
        offset,
      });

      const items = await enrichResponseItems(data);
      const total = extractBackendTotal(data, items.length);

      setResultado(items);
      setTotalItens(total);
      setPaginaAtual(page);
      setTermoBuscaAplicado(termoLimpo);
      setBuscaRealizada(true);

      if (page === 1) {
        if (items.length === 0) {
          toast.error("Nenhum prontuário encontrado para esse critério.");
        } else {
          toast.success("Prontuário(s) encontrado(s).");
        }
      }
    } catch {
      setResultado([]);
      setTotalItens(0);
      setBuscaRealizada(true);
      toast.error("Não foi possível buscar os prontuários.");
    } finally {
      setCarregando(false);
    }
  };

  const handleSelecionar = (prontuario: BuscarResultadoItem) => {
    const cpfReferencia = normalizeCpf(prontuario.cpfReferencia);
    if (!cpfReferencia) {
      toast.error("CPF da pessoa de referência não encontrado.");
      return;
    }

    if (prontuario.id) {
      localStorage.setItem(`prontuarioIdByCpf:${cpfReferencia}`, prontuario.id);
    }

    const search = new URLSearchParams();
    search.set("cpf", cpfReferencia);
    if (prontuario.id) {
      search.set("prontuarioId", prontuario.id);
    }
    navigate(`/sistema/prontuario?${search.toString()}`);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <div className="flex-1 flex flex-col">
          <SidebarInset>
            <div className="container mx-auto p-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold">Prontuário</h1>
                <p className="text-muted-foreground">Busque prontuários existentes</p>
              </div>

              <div className="bg-card border rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Buscar Prontuário</h2>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Digite CPF do membro, nome do membro ou número do prontuário"
                      value={termo}
                      onChange={(e) => setTermo(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void handleBuscar(1, termo);
                        }
                      }}
                    />

                    <Button onClick={() => void handleBuscar(1, termo)} className="gap-2" disabled={carregando}>
                      <Search className="h-4 w-4" />
                      {carregando ? "Pesquisando..." : "Pesquisar"}
                    </Button>
                  </div>
                </div>

                {/* {buscaRealizada && !carregando && resultado.length === 0 && (
                  <div className="border-t pt-4 mt-4 text-center text-sm text-muted-foreground">
                    <p>Prontuário não encontrado</p>
                    <p className="mb-3">Verifique nome ou CPF e tente novamente</p>
                  </div>
                )} */}
              </div>

              {buscaRealizada && (
                <div className="bg-card border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Resultado da Pesquisa</h2>

                  <p className="text-sm text-muted-foreground mb-4">Prontuários encontrados. Selecione o correto para continuar.</p>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Prontuário</TableHead>
                        <TableHead>Pessoa de Referência</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {carregando ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                            Carregando prontuarios...
                          </TableCell>
                        </TableRow>
                      ) : resultado.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                            Nenhum prontuario encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        resultado.map((p) => (
                          <TableRow key={p.id || `${p.numero}-${p.cpfReferencia}`}>
                            <TableCell className="font-medium">{p.numero || "—"}</TableCell>
                            <TableCell className="font-semibold">{p.nomeReferencia || "—"}</TableCell>
                            <TableCell>{formatCpf(p.cpfReferencia) || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{p.unidade || "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => handleSelecionar(p)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {totalItens > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Mostrando {paginaInicio} - {paginaFim} de {totalItens}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleBuscar(paginaAtual - 1, termoBuscaAplicado)}
                          disabled={paginaAtual <= 1 || carregando}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Página {paginaAtual} / {totalPaginas}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleBuscar(paginaAtual + 1, termoBuscaAplicado)}
                          disabled={paginaAtual >= totalPaginas || carregando}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
