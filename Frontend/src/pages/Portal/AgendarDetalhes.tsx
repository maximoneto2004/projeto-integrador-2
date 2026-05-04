import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { toast } from "@/lib/sonner";

import { Header } from "@/components/portal/Header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FaleConosco } from "@/components/portal/FaleConosco";
import { useAgendamentoPortal } from "@/hooks/portal/useAgendamentoPortal";
import { Textarea } from "@/components/ui/textarea";
import { agendamentoService } from "@/services/sistema/agendamentoService";
import type { AgendaVaga, AgendaVagaListItem } from "@/types/api";
import {
  createFortalezaDigitalAgendamento,
  fetchFortalezaDigitalCidadaoMe,
  getAccessTokenFromCookie,
  refreshAccessTokenFromCookie,
  startLoginFortalezaDigital,
} from "@/services/portal/fortalezaDigital";

const MOTIVO_TERRITORIO_MAX = 600;

const AgendarDetalhes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as {
    fromPath?: string;
    unidadeId?: string;
    unidadeNome?: string;
    classeId?: string;
    classeNome?: string;
    tipoId?: string;
    tipoNome?: string;
    servicoId?: string;
    servicoNome?: string;
  };

  const [user, setUser] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
  });
  const [data, setData] = useState<Date>();
  const [vagaId, setVagaId] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unidadeOrigemId, setUnidadeOrigemId] = useState<string | null>(null);
  const [unidadeOrigemNome, setUnidadeOrigemNome] = useState<string | null>(null);
  const [motivoTerritorio, setMotivoTerritorio] = useState("");
  const [datasComVagas, setDatasComVagas] = useState<Date[]>([]);
  const [carregandoDatas, setCarregandoDatas] = useState(false);

  // const { carregarIdentidade } = useFortalezaDigital();

  const faltaDadosBasicos = !state.unidadeId || !state.servicoId || !state.tipoId;

  const handleCancelar = () => {
    if (state.fromPath === "/agendar" || state.fromPath === "/perfil") {
      navigate(state.fromPath);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/agendar");
  };

  useEffect(() => {
    if (faltaDadosBasicos) {
      navigate("/agendar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state.tipoId || !state.unidadeId) {
      setDatasComVagas([]);
      return;
    }

    const carregarDatas = async () => {
      setCarregandoDatas(true);
      try {
        const { data: resposta } = await agendamentoService.listarVagas({
          tipo_servico: state.tipoId,
          unidade: state.unidadeId,
        });
        if (!resposta?.success) {
          throw new Error((resposta as unknown as { result?: string }).result || "Falha ao carregar vagas.");
        }

        const lista = Array.isArray(resposta.result) ? resposta.result : [];
        const datasDisponiveis = lista
          .map((vaga: AgendaVaga | AgendaVagaListItem) => {
            const dataVaga = (vaga as AgendaVaga).data;
            if (!dataVaga) return null;
            const vagasDisponiveis =
              typeof (vaga as AgendaVagaListItem).vagas_disponiveis === "number"
                ? (vaga as AgendaVagaListItem).vagas_disponiveis
                : typeof (vaga as AgendaVaga).vagas === "number" && typeof (vaga as AgendaVaga).vagas_ocupadas === "number"
                  ? (vaga as AgendaVaga).vagas - (vaga as AgendaVaga).vagas_ocupadas
                  : 0;
            const ativo = typeof (vaga as AgendaVaga).is_active === "boolean" ? (vaga as AgendaVaga).is_active : true;
            if (!ativo || vagasDisponiveis <= 0) return null;
            const parsed = new Date(`${dataVaga}T00:00:00`);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
          })
          .filter((item): item is Date => !!item);
        setDatasComVagas(datasDisponiveis);
      } catch (err) {
        console.error(err);
        setDatasComVagas([]);
      } finally {
        setCarregandoDatas(false);
      }
    };

    carregarDatas();
  }, [state.tipoId, state.unidadeId]);

  useEffect(() => {
    if (!data || !datasComVagas.length) return;
    const existe = datasComVagas.some((item) => isSameDay(item, data));
    if (!existe) {
      setData(undefined);
      setVagaId("");
    }
  }, [data, datasComVagas]);

  useEffect(() => {
    let isMounted = true;
    const carregar = async () => {
      let token = getAccessTokenFromCookie();
      if (!token) {
        token = await refreshAccessTokenFromCookie();
      }
      if (!token) {
        startLoginFortalezaDigital();
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const cidadao = await fetchFortalezaDigitalCidadaoMe(token);
      if (!cidadao || typeof cidadao !== "object") return;

      const data = cidadao as Record<string, any>;
      const nome = data.nome || data.name || data.nome_completo || "";
      const cpf = data.cpf || data.preferred_username || "";
      const email = data.email || data.email_preferencial || data.preferred_email || data.email_preferencial || "";
      const telefone = data.telefone || data.phone_number || data.celular || data.telefone_celular || "";

      const unidadeOrigemRaw = data.unidade_origem ?? data.unidadeOrigem ?? data.unidade_origem_id ?? data.unidade;
      let origemId: string | null = null;
      let origemNome: string | null = null;
      if (typeof unidadeOrigemRaw === "string") {
        origemId = unidadeOrigemRaw;
      } else if (unidadeOrigemRaw && typeof unidadeOrigemRaw === "object") {
        origemId = unidadeOrigemRaw.id ?? unidadeOrigemRaw.uuid ?? unidadeOrigemRaw.unidade_id ?? null;
        origemNome = unidadeOrigemRaw.nome ?? unidadeOrigemRaw.name ?? null;
      }

      if (!isMounted) return;
      setUser({
        nome,
        cpf,
        email,
        telefone,
      });
      console.log(origemId, origemNome);
      setUnidadeOrigemId(origemId);
      setUnidadeOrigemNome(origemNome);
    };

    void carregar();
    return () => {
      isMounted = false;
    };
  }, []);

  const dataISO = useMemo(() => (data ? format(data, "yyyy-MM-dd") : ""), [data]);
  const { vagas, loading: loadingVagas } = useAgendamentoPortal({
    data: dataISO || undefined,
    tipoServico: state.tipoId,
    unidade: state.unidadeId,
  });

  const hora = useMemo(() => {
    const vaga = vagas.find((v) => v.id === vagaId);
    return vaga?.horario || "";
  }, [vagaId, vagas]);

  const formatHora = (hora?: string | null) => {
    if (!hora) return "-";
    const trimmed = String(hora).trim();
    if (!trimmed) return "-";
    if (!trimmed.includes(":")) return trimmed;
    return trimmed.split(":").slice(0, 2).join(":");
  };

  const precisaMotivo = useMemo(() => {
    if (!unidadeOrigemId || !state.unidadeId) return false;
    return unidadeOrigemId !== state.unidadeId;
  }, [state.unidadeId, unidadeOrigemId]);

  const handleProximo = () => {
    if (!data || !vagaId) return;
    setShowConfirmModal(true);
  };

  const handleConfirmar = async () => {
    if (!vagaId || !state.servicoId || !state.unidadeId) return;
    if (precisaMotivo && !motivoTerritorio.trim()) {
      toast.error("Informe o motivo da unidade diferente.");
      return;
    }
    try {
      let token = getAccessTokenFromCookie();
      if (!token) {
        token = await refreshAccessTokenFromCookie();
      }
      if (!token) {
        startLoginFortalezaDigital();
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const payload = {
        servico: state.servicoId,
        unidade: state.unidadeId,
        vaga: vagaId,
        ...(precisaMotivo ? { motivo_territorio: motivoTerritorio.trim() } : {}),
      };

      const data = await createFortalezaDigitalAgendamento(token, payload);
      if (!data || typeof data !== "object") {
        throw new Error("Falha ao criar agendamento.");
      }

      const response = data as Record<string, any>;
      const erroMsg =
        response?.result ||
        response?.error ||
        response?.detail ||
        response?.mensagem ||
        response?.message ||
        "Não foi possível agendar. Verifique os dados.";

      if (response?.success === false) {
        toast.error(erroMsg);
        return;
      }

      if (response?.error || response?.detail) {
        toast.error(erroMsg);
        return;
      }

      if (response?.redirect && response?.success !== false) {
        navigate(response.redirect);
        return;
      }

      toast.success(response?.mensagem || "Agendamento confirmado!");
      navigate("/perfil");
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Não foi possível agendar. Verifique os dados.";
      toast.error(msg);
    } finally {
      setShowConfirmModal(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      {" "}
      {/* Cor de fundo suave e limpa */}
      <Header />
      <div className="container mx-auto px-4 py-8 md:py-16 max-w-5xl">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-light text-slate-900 dark:text-portal-text-strong tracking-tight">
            Agendamento <span className="font-semibold">/ {state.servicoNome || "Serviço"}</span>
          </h1>
          <div className="h-1 w-20 bg-primary mt-4 mx-auto md:mx-0" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-slate-200 dark:border-portal-neutral bg-white dark:bg-portal-secondary mb-10 shadow-sm">
          {/* Coluna: Dados Pessoais */}
          <div className="p-8 border-b md:border-b-0 md:border-r border-slate-200 dark:border-portal-neutral">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-portal-text-muted mb-8">Identificação</h2>

            <div className="space-y-6">
              <div className="group">
                <p className="text-[10px] uppercase font-bold text-primary mb-1">Solicitante</p>
                <p className="text-lg text-slate-800 dark:text-portal-text-strong">{user.nome || "Não informado"}</p>
                <p className="text-xs text-slate-500 dark:text-portal-text-muted font-mono mt-1">CPF: {user.cpf || "-"}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-primary mb-1">Celular</p>
                  <p className="text-sm text-slate-700 dark:text-portal-text-strong">{user.telefone || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-primary mb-1">E-mail</p>
                  <p className="text-sm text-slate-700 dark:text-portal-text-strong break-all">{user.email || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna: Unidade */}
          <div className="p-8 bg-slate-50/50 dark:bg-portal-neutral">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-portal-text-muted mb-8">Localização</h2>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-primary mb-1">Unidade Escolhida</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-portal-text-strong leading-tight">{state.unidadeNome || "Unidade"}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-primary mb-1">Categoria</p>
                <p className="text-sm text-slate-700 dark:text-portal-text-strong">{state.classeNome || state.tipoNome || "-"}</p>
              </div>

              {(unidadeOrigemNome || unidadeOrigemId) && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-primary mb-1">Unidade de Origem</p>
                  <p className="text-sm text-slate-700 dark:text-portal-text-strong">{unidadeOrigemNome || unidadeOrigemId}</p>
                </div>
              )}

              <div className="inline-flex items-center gap-2 border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/30 px-3 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-none h-2 w-2 bg-success"></span>
                </span>
                <span className="text-[10px] font-bold text-success uppercase">Unidade Ativa</span>
              </div>
            </div>
          </div>
        </div>

        {/* SeÃ§Ã£o de Agendamento */}
        <div className="bg-white dark:bg-portal-secondary border border-portal-secondary dark:border-portal-neutral p-8 md:p-12">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-10">
              <div className="bg-portal-secondary text-white w-8 h-8 flex items-center justify-center text-sm font-bold">01</div>
              <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900 dark:text-portal-text-strong">
                Escolha o horário disponível
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-portal-text-muted">Data do Atendimento</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-14 justify-between text-left font-medium rounded-none transition-all px-4 dark:bg-portal-neutral dark:text-portal-text-strong dark:border-portal-neutral"
                    >
                      {data ? format(data, "PPP", { locale: ptBR }) : "Selecione a data"}
                      <CalendarIcon className="h-5 w-5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-none dark:bg-portal-secondary dark:text-portal-text-strong" align="start">
                    <Calendar
                      mode="single"
                      selected={data}
                      onSelect={(d) => {
                        setData(d);
                        setVagaId("");
                      }}
                      locale={ptBR}
                      disabled={(date) => {
                        if (date < startOfDay(new Date())) return true;
                        if (!datasComVagas.length) return true;
                        return !datasComVagas.some((item) => isSameDay(item, date));
                      }}
                      className="rounded-none"
                    />
                    {carregandoDatas && (
                      <p className="px-4 py-2 text-xs text-slate-500 dark:text-portal-text-muted">Carregando dias disponíveis...</p>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-portal-text-muted">
                  Horários para {data ? format(data, "dd/MM") : "..."}
                </label>
                <Select value={vagaId} onValueChange={setVagaId} disabled={!data || loadingVagas}>
                  <SelectTrigger className="h-14 rounded-none focus:ring-0 bg-white dark:bg-portal-neutral dark:text-portal-text-strong font-medium">
                    <SelectValue placeholder={loadingVagas ? "Consultando..." : "Selecione o horário"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-none dark:bg-portal-secondary dark:text-portal-text-strong">
                    {vagas.length > 0 ? (
                      vagas
                        .filter((v) => v.vagas - v.vagas_ocupadas > 0)
                        .map((vaga) => (
                          <SelectItem key={vaga.id} value={vaga.id} className="rounded-none py-3">
                            {formatHora(vaga.horario)} — {vaga.vagas - vaga.vagas_ocupadas} vagas livres
                          </SelectItem>
                        ))
                    ) : (
                      <p className="p-4 text-xs text-center text-slate-500 dark:text-portal-text-muted uppercase">Nenhum horário disponível</p>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {precisaMotivo && (
              <div className="space-y-2 mb-10">
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-portal-text-muted">Motivo da unidade diferente</label>
                <Textarea
                  value={motivoTerritorio}
                  onChange={(event) => setMotivoTerritorio(event.target.value.slice(0, MOTIVO_TERRITORIO_MAX))}
                  placeholder="Informe o motivo da escolha por outra unidade"
                  maxLength={MOTIVO_TERRITORIO_MAX}
                  className="rounded-none min-h-[120px] dark:bg-portal-neutral dark:text-portal-text-strong dark:border-portal-neutral"
                />
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[10px] uppercase text-slate-400 dark:text-portal-text-muted">
                    Obrigatório quando a unidade de origem for diferente da escolhida.
                  </p>
                  <span className="text-xs text-slate-400 dark:text-portal-text-muted whitespace-nowrap">
                    {motivoTerritorio.length}/{MOTIVO_TERRITORIO_MAX}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-100 dark:border-portal-neutral">
              <p className="text-xs text-slate-400 dark:text-portal-text-muted max-w-xs text-center md:text-left uppercase leading-relaxed">
                * Campos obrigatórios. Certifique-se de levar seus documentos originais no dia.
              </p>
              <div className="flex w-full md:w-auto gap-4">
                <Button
                  variant="ghost"
                  onClick={handleCancelar}
                  className="flex-1 md:flex-none h-14 rounded-none uppercase font-bold text-xs tracking-widest text-slate-500 dark:text-portal-text-muted hover:bg-slate-100 dark:hover:bg-portal-neutral"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleProximo}
                  disabled={!data || !vagaId}
                  className="
    flex-1 md:flex-none
    h-14 md:h-14
    px-4 md:
    text-[10px] md:text-xs
    rounded-none
    bg-primary hover:bg-primary/90
    text-white font-bold uppercase
    tracking-widest
    transition-all shadow-md
  "
                >
                  Próximo Passo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Dialog Ajustado */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="rounded-none border-none shadow-2xl p-0 overflow-hidden max-w-[95vw] sm:max-w-md dark:bg-portal-secondary">
          <div className="bg-portal-secondary p-6 text-white text-center">
            <h3 className="text-sm font-bold uppercase tracking-[0.3em]  mb-2">Confirmação</h3>
            <p className="text-xl font-light">Detalhes da sua reserva</p>
          </div>

          <div className="p-8 space-y-6 bg-white dark:bg-portal-secondary text-slate-800 dark:text-portal-text-strong">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-portal-text-muted uppercase mb-1">Unidade</p>
                <p className="text-sm font-bold">{state.unidadeNome}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-portal-text-muted uppercase mb-1">Data/Hora</p>
                <p className="text-sm font-bold">
                  {data && format(data, "dd/MM/yy")} às {hora}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-portal-neutral pt-6">
              <p className="text-sm text-center text-slate-600 dark:text-portal-text-muted mb-8 italic">
                Deseja confirmar este agendamento para o local acima?
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleConfirmar}
                  className="h-12 rounded-none bg-primary hover:bg-primary/90 font-bold uppercase text-xs tracking-widest"
                >
                  Sim, Confirmar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowConfirmModal(false)}
                  className="h-12 rounded-none font-bold uppercase text-xs text-slate-400 dark:text-portal-text-muted"
                >
                  Voltar e alterar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <FaleConosco />
    </div>
  );
};
export default AgendarDetalhes;
