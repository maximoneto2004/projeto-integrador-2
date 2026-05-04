import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, CalendarIcon, Star, LayoutGrid, List, MapPin, Clock, Plus, CircleX, Pen } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Appointment } from "@/types/agenda";
import { format } from "date-fns";
import ViewAgendamentoModal from "@/components/portal/modais/ViewAgendamentoModal";
import EditAgendamentoModal from "@/components/portal/modais/EditAgendamentoModal";
import CancelAgendamentoModal from "@/components/portal/modais/CancelAgendamentoModal";
import AvaliacaoAgendamentoModal from "@/components/portal/modais/AvaliacaoAgendamentoModal";
import {
  fetchFortalezaDigitalAgendamentos,
  fetchFortalezaDigitalAgendamentoById,
  patchFortalezaDigitalAgendamento,
  updateFortalezaDigitalAvaliacao,
  createFortalezaDigitalAvaliacao,
} from "@/services/portal/fortalezaDigital";
import type { AgendamentoRequest, AgendamentoResponse, Situacao } from "@/types/api";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { APPOINTMENT_STATUS_OPTIONS, DEFAULT_APPOINTMENT_STATUS_COLOR, SITUACAO_PARA_STATUS } from "@/constants/agenda";

const CardsAgendamentos = () => {
  const navigate = useNavigate();
  const itemsPerPage = 3;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [viewModal, setViewModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [avaliacaoModal, setAvaliacaoModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [notaAvaliacao, setNotaAvaliacao] = useState(0);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");
  const { accessToken, initializing } = usePortalAuth();

  const mapSituacaoToStatus = (situacao?: Situacao): Appointment["status"] => (situacao && SITUACAO_PARA_STATUS[situacao]) || "Aguardando";

  const mapAgendamentos = (data: AgendamentoResponse[]): Appointment[] =>
    data.map((item) => ({
      id: item.id,
      unidade: item.unidade?.nome || "—",
      unidadeId: item.unidade?.id ? String(item.unidade.id) : undefined,
      categoria: item.servico?.classe?.nome || "—",
      categoriaId:
        typeof item.servico?.classe === "string" ? item.servico?.classe : item.servico?.classe?.id ? String(item.servico?.classe?.id) : undefined,
      servico: item.servico?.nome || "—",
      servicoId: item.servico?.id ? String(item.servico.id) : undefined,
      tipoId:
        typeof (item.servico as any)?.tipo_servico === "string"
          ? (item.servico as any)?.tipo_servico
          : (item.servico as any)?.tipo_servico?.id
            ? String((item.servico as any)?.tipo_servico?.id)
            : undefined,
      data: `${item.data}T00:00:00`,
      hora: item.horario,
      status: mapSituacaoToStatus(item.situacao),
      nomeCidadao: item.cidadao?.nome,
      cpfCidadao: item.cidadao?.cpf,
      telefoneCidadao: item.cidadao?.telefone,
      atendente: item.atendente?.nome_completo || item.atendente?.nome || undefined,
      guiche: typeof item.atendente?.guiche_atual === "string" ? item.atendente?.guiche_atual : item.atendente?.guiche_atual?.nome,
      motivoOutraUnidade: item.motivo_territorio || undefined,
      avaliacao: item.avaliacao,
    }));

  const mapAgendamento = (item: AgendamentoResponse): Appointment => ({
    id: item.id,
    unidade: item.unidade?.nome || "—",
    unidadeId: item.unidade?.id ? String(item.unidade.id) : undefined,
    categoria: item.servico?.classe?.nome || "—",
    categoriaId:
      typeof item.servico?.classe === "string" ? item.servico?.classe : item.servico?.classe?.id ? String(item.servico?.classe?.id) : undefined,
    servico: item.servico?.nome || "—",
    servicoId: item.servico?.id ? String(item.servico.id) : undefined,
    tipoId:
      typeof (item.servico as any)?.tipo_servico === "string"
        ? (item.servico as any)?.tipo_servico
        : (item.servico as any)?.tipo_servico?.id
          ? String((item.servico as any)?.tipo_servico?.id)
          : undefined,
    data: `${item.data}T00:00:00`,
    hora: item.horario,
    status: mapSituacaoToStatus(item.situacao),
    nomeCidadao: item.cidadao?.nome,
    cpfCidadao: item.cidadao?.cpf,
    telefoneCidadao: item.cidadao?.telefone,
    atendente: item.atendente?.nome_completo || item.atendente?.nome || undefined,
    guiche: typeof item.atendente?.guiche_atual === "string" ? item.atendente?.guiche_atual : item.atendente?.guiche_atual?.nome,
    motivoOutraUnidade: item.motivo_territorio || undefined,
    avaliacao: item.avaliacao,
  });

  const formatHora = (hora?: string | null) => {
    if (!hora) return "-";
    const trimmed = String(hora).trim();
    if (!trimmed) return "-";
    if (!trimmed.includes(":")) return trimmed;
    return trimmed.split(":").slice(0, 2).join(":");
  };

  const parseAppointmentDate = (value: string) => new Date(value.includes("T") ? value : `${value}T00:00:00`);

  useEffect(() => {
    let active = true;
    const carregarAgendamentos = async () => {
      if (initializing) return;
      setLoading(true);
      if (!accessToken) {
        setAppointments([]);
        setPage(1);
        setHasNextPage(false);
        setLoading(false);
        return;
      }
      const data = await fetchFortalezaDigitalAgendamentos(accessToken, { page: 1, pageSize: itemsPerPage });
      if (!active) return;
      setAppointments(mapAgendamentos(data.items));
      setPage(1);
      setHasNextPage(data.hasNext);
      setLoading(false);
    };
    void carregarAgendamentos();
    return () => {
      active = false;
    };
  }, [accessToken, initializing]);

  const handleLoadMore = async () => {
    if (!accessToken || loadingMore || loading || !hasNextPage) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await fetchFortalezaDigitalAgendamentos(accessToken, { page: nextPage, pageSize: itemsPerPage });
      const mapped = mapAgendamentos(data.items);
      setAppointments((current) => {
        const existing = new Set(current.map((item) => item.id));
        const novos = mapped.filter((item) => !existing.has(item.id));
        return [...current, ...novos];
      });
      setPage(nextPage);
      setHasNextPage(data.hasNext);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handlers (mantidos conforme lógica original)
  const handleView = async (appointment: Appointment) => {
    if (actionLoading) return;
    setSelectedAppointment(appointment);
    setViewModal(true);
    setActionLoading(true);
    if (accessToken) {
      const data = await fetchFortalezaDigitalAgendamentoById(accessToken, appointment.id);
      if (data) {
        setSelectedAppointment(mapAgendamento(data));
      }
    }
    setActionLoading(false);
  };
  const handleEdit = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditModal(true);
  };
  const handleCancelClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelModal(true);
  };
  const handleAvaliarClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNotaAvaliacao(appointment.avaliacao?.nota || 0);
    setComentarioAvaliacao(appointment.avaliacao?.comentario || "");
    setAvaliacaoModal(true);
  };

  const handleConfirmEdit = async (params: { servicoId?: string; vagaId?: string }) => {
    if (selectedAppointment && params.vagaId) {
      if (actionLoading) return;
      setActionLoading(true);
      if (accessToken) {
        const editPayload: Partial<AgendamentoRequest> = {
          vaga: params.vagaId,
          servico: params.servicoId || selectedAppointment.servicoId || undefined,
        };
        const updated = await patchFortalezaDigitalAgendamento(accessToken, selectedAppointment.id, editPayload);
        if (updated) {
          const refreshed = await fetchFortalezaDigitalAgendamentoById(accessToken, selectedAppointment.id);
          const mapped = refreshed ? mapAgendamento(refreshed) : mapAgendamento(updated);
          setAppointments((current) => current.map((item) => (item.id === mapped.id ? mapped : item)));
          setSelectedAppointment(mapped);
        }
      }
      setActionLoading(false);
      setEditModal(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (selectedAppointment) {
      if (actionLoading) return;
      setActionLoading(true);
      if (accessToken) {
        const updated = await patchFortalezaDigitalAgendamento(accessToken, selectedAppointment.id, { situacao: "CANCELADO_CIDADAO" });
        if (updated) {
          const mapped = mapAgendamento(updated);
          const merged: Appointment = {
            ...selectedAppointment,
            ...mapped,
            unidade: mapped.unidade !== "—" ? mapped.unidade : selectedAppointment.unidade,
            categoria: mapped.categoria !== "—" ? mapped.categoria : selectedAppointment.categoria,
            servico: mapped.servico !== "—" ? mapped.servico : selectedAppointment.servico,
            data: mapped.data || selectedAppointment.data,
            hora: mapped.hora || selectedAppointment.hora,
          };
          setAppointments((current) => current.map((item) => (item.id === mapped.id ? merged : item)));
          setSelectedAppointment(merged);
        }
      }
      setActionLoading(false);
      setCancelModal(false);
    }
  };

  const handleSalvarAvaliacao = async () => {
    if (!selectedAppointment || notaAvaliacao <= 0) return;
    if (actionLoading) return;

    setActionLoading(true);

    if (accessToken) {
      const payload = {
        agendamento: selectedAppointment.id,
        nota: notaAvaliacao,
        comentario: comentarioAvaliacao || undefined,
      };

      if (selectedAppointment.avaliacao?.id) {
        await updateFortalezaDigitalAvaliacao(accessToken, selectedAppointment.avaliacao.id, payload);
      } else {
        await createFortalezaDigitalAvaliacao(accessToken, payload);
      }

      const data = await fetchFortalezaDigitalAgendamentoById(accessToken, selectedAppointment.id);
      if (data) {
        const mapped = mapAgendamento(data);
        setAppointments((current) => current.map((item) => (item.id === mapped.id ? mapped : item)));
        setSelectedAppointment(mapped);
      }
    }

    setActionLoading(false);
    setAvaliacaoModal(false);
  };

  const getStatusBadge = (status: string) => {
    const option = APPOINTMENT_STATUS_OPTIONS.find((item) => item.value === status);
    const label = option?.label ?? status;
    const colorClass = option?.colorClass ?? DEFAULT_APPOINTMENT_STATUS_COLOR;

    return (
      <span
        className={`inline-flex whitespace-nowrap px-4 py-1.5 rounded-2xl text-xs font-bold border dark:bg-portal-neutral dark:text-portal-text-strong dark:border-portal-neutral ${colorClass}`}
      >
        {label}
      </span>
    );
  };

  // ... (mantenha todos os imports e lógicas de estado originais até o return)

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-background">
      <section className="py-4 sm:py-10 px-3 sm:px-4">
        <div className="container mx-auto">
          {/* Toolbar de Ações - Ajustada para Stack no Mobile */}
          <div className="flex flex-col gap-4 mb-6 sm:mb-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-700 dark:text-portal-text-strong flex items-center gap-2">
                Solicitações
                <span className="text-xs font-normal bg-slate-100 text-slate-500 dark:bg-portal-neutral dark:text-portal-text-muted px-2 py-0.5 rounded-full">
                  {appointments.length}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button onClick={() => navigate("/agendar")} className="flex-1 md:flex-none gap-2 rounded-none h-11">
                <Plus className="w-4 h-4" />
                <span>Agendar</span>
              </Button>

              <div className="bg-slate-100 dark:bg-portal-neutral p-1 flex gap-1 border border-slate-200 dark:border-portal-neutral shadow-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 rounded transition-all ${viewMode === "grid" ? "bg-white dark:bg-portal-secondary shadow-sm text-[#f05a28]" : "text-slate-400 dark:text-portal-text-muted hover:text-slate-600"}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 rounded transition-all ${viewMode === "list" ? "bg-white dark:bg-portal-secondary shadow-sm text-[#f05a28]" : "text-slate-400 dark:text-portal-text-muted hover:text-slate-600"}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 bg-white dark:bg-portal-secondary rounded-xl border border-dashed border-slate-300">
              <div className="animate-spin w-8 h-8 border-4 border-[#f05a28] border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Carregando agendamentos...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-portal-secondary rounded-xl border border-dashed border-slate-300">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhum agendamento encontrado.</p>
            </div>
          ) : (
            <>
              {viewMode === "grid" ? (
                /* GRID RESPONSIVO */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="bg-white dark:bg-portal-secondary shadow-sm border border-slate-100 dark:border-portal-neutral hover:shadow-md transition-all flex flex-col"
                    >
                      <div className="p-5 flex-1">
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <h3 className="font-bold text-base text-slate-800 dark:text-portal-text-strong leading-tight uppercase">
                            {appointment.servico}
                          </h3>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-start gap-2 text-sm text-slate-500 dark:text-portal-text-muted">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#f05a28]" />
                            <span className="line-clamp-2">{appointment.unidade}</span>
                          </div>
                          <div className="inline-flex items-center gap-2 text-sm font-semibold bg-slate-50 dark:bg-portal-neutral px-3 py-1.5 rounded-lg text-slate-700 dark:text-portal-text-strong">
                            <Clock className="w-4 h-4 text-[#f05a28]" />
                            {formatHora(appointment.hora)} • {format(parseAppointmentDate(appointment.data), "dd/MM/yyyy")}
                          </div>
                        </div>
                      </div>

                      <div className="px-5 py-4 bg-slate-50/50 dark:bg-portal-neutral/30 border-t border-slate-50 dark:border-portal-neutral flex items-center justify-between">
                        {getStatusBadge(appointment.status)}

                        <div className="flex items-center gap-1">
                          <button onClick={() => handleView(appointment)} className="p-2 text-slate-400 hover:text-slate-600">
                            <Eye size={20} />
                          </button>
                          {appointment.status === "Marcado" && (
                            <>
                              <button onClick={() => handleEdit(appointment)} className="p-2 text-blue-400 hover:text-blue-600">
                                <Pen size={20} />
                              </button>
                              <button onClick={() => handleCancelClick(appointment)} className="p-2 text-red-400 hover:text-red-600">
                                <CircleX size={20} />
                              </button>
                            </>
                          )}
                          {appointment.status === "Finalizado" && (
                            <button
                              onClick={() => handleAvaliarClick(appointment)}
                              className={`p-2 ${appointment.avaliacao ? "text-yellow-500" : "text-slate-400 hover:text-yellow-500"}`}
                            >
                              <Star size={20} className={appointment.avaliacao ? "fill-current" : ""} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* LISTA RESPONSIVA (Mobile Cards / Desktop Table) */
                <div className="bg-white dark:bg-portal-secondary shadow-sm border border-slate-100 dark:border-portal-neutral overflow-hidden">
                  {/* Visão Mobile da Lista (apenas telas pequenas) */}
                  <div className="block lg:hidden divide-y divide-slate-100 dark:divide-portal-neutral">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-bold text-[#f05a28] uppercase tracking-wider">Serviço</p>
                            <p className="font-bold text-slate-800 dark:text-portal-text-strong">{appointment.servico}</p>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Data/Hora</p>
                            <p className="text-slate-600 dark:text-portal-text-muted">
                              {formatHora(appointment.hora)} • {format(parseAppointmentDate(appointment.data), "dd/MM/yyyy")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Ações</p>
                            <div className="flex justify-end gap-1 mt-1">
                              <button onClick={() => handleView(appointment)} className="p-1.5 bg-slate-100 dark:bg-portal-neutral rounded">
                                <Eye size={16} />
                              </button>
                              {appointment.status === "Marcado" && (
                                <button onClick={() => handleEdit(appointment)} className="p-1.5 bg-blue-50 text-blue-600 rounded">
                                  <Pen size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Visão Desktop da Lista (apenas lg+) */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-portal-neutral border-b border-slate-100 dark:border-portal-neutral text-slate-400">
                        <tr>
                          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Serviço</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Local</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Data e Horário</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Status</th>
                          <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest">Gerenciar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-portal-neutral">
                        {appointments.map((appointment) => (
                          <tr key={appointment.id} className="hover:bg-slate-50/50 dark:hover:bg-portal-neutral transition-colors">
                            <td className="px-8 py-5 font-bold text-slate-700 dark:text-portal-text-strong">{appointment.servico}</td>
                            <td className="px-8 py-5 text-slate-500 dark:text-portal-text-muted text-sm">{appointment.unidade}</td>
                            <td className="px-8 py-5 text-slate-500 dark:text-portal-text-muted text-sm">
                              {formatHora(appointment.hora)} • {format(parseAppointmentDate(appointment.data), "dd/MM/yyyy")}
                            </td>
                            <td className="px-8 py-5 whitespace-nowrap">{getStatusBadge(appointment.status)}</td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleView(appointment)}
                                  className="p-2 hover:bg-slate-200 dark:hover:bg-portal-neutral rounded-lg text-slate-400 transition-colors"
                                >
                                  <Eye size={18} />
                                </button>
                                {appointment.status === "Marcado" && (
                                  <>
                                    <button
                                      onClick={() => handleEdit(appointment)}
                                      className="p-2 hover:bg-blue-100 rounded-lg text-blue-400 transition-colors"
                                    >
                                      <Pen size={18} />
                                    </button>
                                    <button
                                      onClick={() => handleCancelClick(appointment)}
                                      className="p-2 hover:bg-red-100 rounded-lg text-red-400 transition-colors"
                                    >
                                      <CircleX size={18} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Botão Carregar Mais - Full width no mobile */}
              {hasNextPage && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => void handleLoadMore()}
                    disabled={loadingMore}
                    className="w-full sm:w-auto bg-white dark:bg-portal-secondary text-slate-600 dark:text-portal-text-muted border border-slate-200 dark:border-portal-neutral hover:bg-slate-50 h-12 px-10 font-bold shadow-sm transition-all"
                  >
                    {loadingMore ? "Carregando..." : "Carregar mais agendamentos"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Modais mantidos iguais */}
      <ViewAgendamentoModal open={viewModal} onOpenChange={setViewModal} selectedAppointment={selectedAppointment} />
      <EditAgendamentoModal open={editModal} onOpenChange={setEditModal} selectedAppointment={selectedAppointment} onConfirm={handleConfirmEdit} />
      <CancelAgendamentoModal
        open={cancelModal}
        onOpenChange={setCancelModal}
        selectedAppointment={selectedAppointment}
        onConfirm={handleConfirmCancel}
      />
      <AvaliacaoAgendamentoModal
        open={avaliacaoModal}
        onOpenChange={setAvaliacaoModal}
        selectedAppointment={selectedAppointment}
        notaAvaliacao={notaAvaliacao}
        setNotaAvaliacao={setNotaAvaliacao}
        comentarioAvaliacao={comentarioAvaliacao}
        setComentarioAvaliacao={setComentarioAvaliacao}
        onSalvar={handleSalvarAvaliacao}
      />
    </div>
  );
};

export default CardsAgendamentos;
