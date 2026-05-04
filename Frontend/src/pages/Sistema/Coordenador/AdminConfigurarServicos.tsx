import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { CidadaoSearchBar } from "@/components/cidadao/CidadaoSearchBar";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAtualizarServicoUnidade,
  useCriarServicoUnidade,
  useRemoverServicoUnidade,
  useServicosDisponiveis,
  useServicosUnidadePaginados,
} from "@/hooks/sistema/useServicosConfig";
import { toast } from "@/lib/sonner";
import { Save, Plus, Trash2 } from "lucide-react";
import { ServicoFormModal } from "../../../components/coordenador/ServicoFormModal";
import { ServicosTabela } from "../../../components/coordenador/ServicosTabela";
import { ServicoConfig, ServicoConfigurado } from "../../../types/servicos";

const diasSemanaOptions = [
  { value: "SEG", label: "Segunda-feira" },
  { value: "TER", label: "Terça-feira" },
  { value: "QUA", label: "Quarta-feira" },
  { value: "QUI", label: "Quinta-feira" },
  { value: "SEX", label: "Sexta-feira" },
];

export default function AdminConfigurarServicos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const unidadeAtual = user?.unidade_ativa?.nome || "Unidade não definida";
  const unidadeId = user?.unidade_ativa?.id || "";

  const pageSize = 10;
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [busca, setBusca] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const { data: servicosDisponiveisData = [] } = useServicosDisponiveis();
  const servicosUnidadeParams = useMemo(
    () => ({
      unidade: unidadeId ? String(unidadeId) : undefined,
      nome: filtroBusca.trim() || undefined,
      limit: String(pageSize),
      offset: String((paginaAtual - 1) * pageSize),
    }),
    [filtroBusca, pageSize, paginaAtual, unidadeId],
  );
  const { data: servicosUnidadePaginados } = useServicosUnidadePaginados(servicosUnidadeParams, Boolean(unidadeId));
  const servicosUnidadeData = servicosUnidadePaginados?.items ?? [];
  const criarServicoUnidade = useCriarServicoUnidade();
  const atualizarServicoUnidade = useAtualizarServicoUnidade();
  const removerServicoUnidade = useRemoverServicoUnidade();

  const [servicosConfigurados, setServicosConfigurados] = useState<ServicoConfig[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<ServicoConfig | null>(null);
  const [servicoEditandoId, setServicoEditandoId] = useState<string | null>(null);
  const [servicoParaExcluir, setServicoParaExcluir] = useState<ServicoConfigurado | null>(null);
  const [servicoExcluirId, setServicoExcluirId] = useState<string | null>(null);
  const [novoServico, setNovoServico] = useState<ServicoConfig>({
    servicoId: "",
    diasSemana: [],
    turno1Inicio: "08:00",
    turno1Fim: "12:00",
    turno2Inicio: "14:00",
    turno2Fim: "18:00",
    usarExpedienteCras: true,
    ativo: true,
  });

  const servicosDisponiveis = useMemo(
    () =>
      servicosDisponiveisData
        .map((servico) => ({
          id: String(servico.id),
          nome: servico.nome,
          tipo: servico.tipo_servico?.nome || "",
        })),
    [servicosDisponiveisData],
  );

  const servicosDisponiveisMap = useMemo(
    () => new Map(servicosDisponiveisData.map((servico) => [String(servico.id), servico])),
    [servicosDisponiveisData],
  );

  const servicosUnidadeMap = useMemo(() => new Map(servicosUnidadeData.map((item) => [String(item.id), item])), [servicosUnidadeData]);

  const diasSemanaLabelMap = useMemo(() => new Map(diasSemanaOptions.map((item) => [item.value, item.label])), []);

  const formatDiasSemana = (dias: string[]) =>
    dias.map((dia) => {
      const label = diasSemanaLabelMap.get(dia);
      return label ? label.split("-")[0] : dia;
    });

  const formatHorarios = (item: {
    hora_manha_inicio?: string | null;
    hora_manha_fim?: string | null;
    hora_tarde_inicio?: string | null;
    hora_tarde_fim?: string | null;
  }) => {
    const formatHora = (hora?: string | null) => (hora ? hora.slice(0, 5) : "");
    const turno1 =
      item.hora_manha_inicio && item.hora_manha_fim ? `${formatHora(item.hora_manha_inicio)} - ${formatHora(item.hora_manha_fim)}` : "";
    const turno2 =
      item.hora_tarde_inicio && item.hora_tarde_fim ? `${formatHora(item.hora_tarde_inicio)} - ${formatHora(item.hora_tarde_fim)}` : "";
    if (turno1 && turno2) return `${turno1} | ${turno2}`;
    return turno1 || turno2 || "";
  };

  const servicosJaConfigurados = useMemo<ServicoConfigurado[]>(
    () =>
      servicosUnidadeData.map((item) => {
        const servicoBase = servicosDisponiveisMap.get(String(item.servico));
        return {
          id: String(item.id),
          servicoId: String(item.servico),
          nome: servicoBase?.nome || "Serviço",
          tipo: servicoBase?.tipo_servico?.nome || "",
          diasSemana: formatDiasSemana(item.dias_semana || []),
          horarios: formatHorarios(item),
          ativo: Boolean(item.is_active),
        };
      }),
    [servicosDisponiveisMap, servicosUnidadeData],
  );

  const servicosFiltrados = useMemo(() => servicosJaConfigurados, [servicosJaConfigurados]);

  const totalItens = servicosUnidadePaginados?.count ?? servicosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const paginaInicio = totalItens ? (paginaAtual - 1) * pageSize + 1 : 0;
  const paginaFim = Math.min(paginaAtual * pageSize, totalItens);
  const servicosPaginados = useMemo(() => servicosFiltrados, [servicosFiltrados]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) setPaginaAtual(totalPaginas);
  }, [paginaAtual, totalPaginas]);

  const removerServico = (index: number) => {
    setServicosConfigurados(servicosConfigurados.filter((_, i) => i !== index));
  };

  const atualizarServico = (index: number, campo: keyof ServicoConfig, valor: any) => {
    const novosServicos = [...servicosConfigurados];
    novosServicos[index] = { ...novosServicos[index], [campo]: valor };
    setServicosConfigurados(novosServicos);
  };

  const toggleDiaSemana = (index: number, dia: string) => {
    const servico = servicosConfigurados[index];
    const diasAtualizados = servico.diasSemana.includes(dia) ? servico.diasSemana.filter((d) => d !== dia) : [...servico.diasSemana, dia];
    atualizarServico(index, "diasSemana", diasAtualizados);
  };

  const resetarNovoServico = () => {
    setNovoServico({
      servicoId: "",
      diasSemana: [],
      turno1Inicio: "08:00",
      turno1Fim: "12:00",
      turno2Inicio: "14:00",
      turno2Fim: "18:00",
      usarExpedienteCras: true,
      ativo: true,
    });
  };

  const atualizarNovoServico = (campo: keyof ServicoConfig, valor: any) => {
    setNovoServico((atual) => ({ ...atual, [campo]: valor }));
  };

  const toggleDiaSemanaNovoServico = (dia: string) => {
    setNovoServico((atual) => ({
      ...atual,
      diasSemana: atual.diasSemana.includes(dia) ? atual.diasSemana.filter((d) => d !== dia) : [...atual.diasSemana, dia],
    }));
  };

  const atualizarServicoEditando = (campo: keyof ServicoConfig, valor: any) => {
    setServicoEditando((atual) => (atual ? { ...atual, [campo]: valor } : atual));
  };

  const toggleDiaSemanaServicoEditando = (dia: string) => {
    setServicoEditando((atual) => {
      if (!atual) return atual;
      const diasSemana = atual.diasSemana.includes(dia) ? atual.diasSemana.filter((d) => d !== dia) : [...atual.diasSemana, dia];
      return { ...atual, diasSemana };
    });
  };

  const iniciarEdicaoServico = (servico: ServicoConfigurado, _index: number) => {
    const configuracao = servicosUnidadeMap.get(servico.id);
    if (!configuracao) {
      toast.error("Serviço não encontrado para edicao");
      return;
    }

    setServicoEditando({
      servicoId: String(configuracao.servico),
      diasSemana: configuracao.dias_semana || [],
      turno1Inicio: configuracao.hora_manha_inicio || "08:00",
      turno1Fim: configuracao.hora_manha_fim || "12:00",
      turno2Inicio: configuracao.hora_tarde_inicio || "",
      turno2Fim: configuracao.hora_tarde_fim || "",
      usarExpedienteCras: configuracao.mesmo_expediente,
      ativo: Boolean(configuracao.is_active),
    });
    setServicoEditandoId(String(configuracao.id));
    setModalEditarAberto(true);
  };

  const fecharModalEditar = () => {
    setModalEditarAberto(false);
    setServicoEditando(null);
    setServicoEditandoId(null);
  };

  const abrirModalExcluir = (servico: ServicoConfigurado, _index: number) => {
    setServicoParaExcluir(servico);
    setServicoExcluirId(servico.id);
    setModalExcluirAberto(true);
  };

  const normalizarHorario = (valor: string) => (valor ? valor : null);

  const construirPayloadServico = (servico: ServicoConfig) => ({
    unidade: unidadeId,
    servico: servico.servicoId,
    dias_semana: servico.diasSemana,
    mesmo_expediente: servico.usarExpedienteCras,
    hora_manha_inicio: servico.usarExpedienteCras ? null : normalizarHorario(servico.turno1Inicio),
    hora_manha_fim: servico.usarExpedienteCras ? null : normalizarHorario(servico.turno1Fim),
    hora_tarde_inicio: servico.usarExpedienteCras ? null : normalizarHorario(servico.turno2Inicio),
    hora_tarde_fim: servico.usarExpedienteCras ? null : normalizarHorario(servico.turno2Fim),
    is_active: servico.ativo,
  });

  const salvarEdicaoServico = async () => {
    if (!servicoEditando || !servicoEditandoId) {
      toast.error("Selecione um serviço para editar");
      return;
    }

    if (!unidadeId) {
      toast.error("Unidade não definida");
      return;
    }

    if (!servicoEditando.servicoId) {
      toast.error("Selecione um serviço para a configuração");
      return;
    }

    if (servicoEditando.diasSemana.length === 0) {
      toast.error("Selecione pelo menos um dia da semana");
      return;
    }

    if (!servicosDisponiveisMap.get(servicoEditando.servicoId)) {
      toast.error("Serviço inválido");
      return;
    }

    try {
      await atualizarServicoUnidade.mutateAsync({
        id: servicoEditandoId,
        payload: construirPayloadServico(servicoEditando),
      });
      fecharModalEditar();
      toast.success("Configuração atualizada com sucesso!");
    } catch (error) {
      toast.error("Não foi possível atualizar o serviço");
    }
  };

  const salvarNovoServico = async () => {
    if (!unidadeId) {
      toast.error("Unidade não definida");
      return;
    }

    if (!novoServico.servicoId) {
      toast.error("Selecione um serviço para a configuração");
      return;
    }

    if (novoServico.diasSemana.length === 0) {
      toast.error("Selecione pelo menos um dia da semana");
      return;
    }

    try {
      await criarServicoUnidade.mutateAsync(construirPayloadServico(novoServico));
      setModalAberto(false);
      resetarNovoServico();
      toast.success("Serviço adicionado com sucesso!");
    } catch (error) {
      toast.error("Não foi possível adicionar o serviço");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!unidadeId) {
      toast.error("Unidade não definida");
      return;
    }

    if (servicosConfigurados.length === 0) {
      toast.error("Adicione pelo menos um serviço");
      return;
    }

    for (const servico of servicosConfigurados) {
      if (!servico.servicoId) {
        toast.error("Selecione um serviço para todas as configurações");
        return;
      }
      if (servico.diasSemana.length === 0) {
        toast.error("Selecione pelo menos um dia da semana para cada serviço");
        return;
      }
    }

    try {
      for (const servico of servicosConfigurados) {
        await criarServicoUnidade.mutateAsync(construirPayloadServico(servico));
      }
      setServicosConfigurados([]);
      toast.success("Configuração de serviços salva com sucesso!");
      navigate("/sistema/agendamentos");
    } catch (error) {
      toast.error("Não foi possível salvar os serviços");
    }
  };

  const handleBuscar = () => {
    setFiltroBusca(busca.trim());
    setPaginaAtual(1);
  };

  return (
    <SidebarProvider>
      <RoleBasedSidebar />
      <div className="flex-1 overflow-auto">
        <div className=" p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />

              <div>
                <h1 className="text-3xl font-bold text-foreground">Configurar Serviços</h1>
                <p className="text-muted-foreground mt-1">{unidadeAtual}</p>
              </div>
            </div>

            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                resetarNovoServico();
                setModalAberto(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Adicionar Novo Serviço
            </Button>

            <ServicoFormModal
              open={modalAberto}
              onOpenChange={(aberto) => {
                setModalAberto(aberto);
                if (aberto) {
                  resetarNovoServico();
                }
              }}
              idPrefix="novo-servico"
              titulo="Novo Serviço"
              descricao="Configure o serviço e adicione a lista da unidade."
              servico={novoServico}
              diasSemanaOptions={diasSemanaOptions}
              servicosDisponiveis={servicosDisponiveis}
              onServicoChange={atualizarNovoServico}
              onToggleDia={toggleDiaSemanaNovoServico}
              onCancel={() => setModalAberto(false)}
              onSubmit={salvarNovoServico}
              submitLabel="Adicionar Serviço"
              submitIcon={<Plus className="h-4 w-4" />}
            />

            <ServicoFormModal
              open={modalEditarAberto}
              onOpenChange={(aberto) => {
                if (aberto) {
                  setModalEditarAberto(true);
                } else {
                  fecharModalEditar();
                }
              }}
              idPrefix="editar-servico"
              titulo="Editar Serviço"
              descricao="Atualize as informações do serviço configurado."
              servico={servicoEditando}
              diasSemanaOptions={diasSemanaOptions}
              servicosDisponiveis={servicosDisponiveis}
              onServicoChange={atualizarServicoEditando}
              onToggleDia={toggleDiaSemanaServicoEditando}
              onCancel={fecharModalEditar}
              onSubmit={salvarEdicaoServico}
              submitLabel="Salvar alterações"
              submitIcon={<Save className="h-4 w-4" />}
            />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Buscar Serviço</CardTitle>
              </CardHeader>
              <CardContent>
                <CidadaoSearchBar
                  value={busca}
                  onChange={setBusca}
                  onSearch={handleBuscar}
                  placeholder="Buscar por nome ou tipo do serviço..."
                  helperText="Aceita nome do serviço ou tipo."
                  buttonText="Pesquisar"
                />
              </CardContent>
            </Card>
            {/* Lista de Serviços Configurados */}
            {servicosFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum serviço encontrado.</p>
            ) : (
              <ServicosTabela servicos={servicosPaginados} onEdit={iniciarEdicaoServico} onDelete={abrirModalExcluir} />
            )}

            {servicosFiltrados.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Mostrando {paginaInicio} - {paginaFim} de {totalItens}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-2 rounded border disabled:opacity-50"
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Página {paginaAtual} / {totalPaginas}
                  </span>
                  <button
                    className="px-3 py-2 rounded border disabled:opacity-50"
                    onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual >= totalPaginas}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
