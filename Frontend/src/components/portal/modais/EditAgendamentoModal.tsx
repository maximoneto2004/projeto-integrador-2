import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Edit3 } from "lucide-react";
import type { Appointment } from "@/types/agenda";
import { format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { servicoAdminService } from "@/services/sistema/servicoAdminService";
import { agendamentoService } from "@/services/sistema/agendamentoService";
import type { ClasseServicoResumo, ServicoDetalhado } from "@/types/api";
import { useAgendamentoPortal } from "@/hooks/portal/useAgendamentoPortal";

type EditAgendamentoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAppointment: Appointment | null;
  onConfirm: (payload: { servicoId?: string; vagaId?: string }) => void;
};

const parseAppointmentDate = (value: string) => new Date(value.includes("T") ? value : `${value}T00:00:00`);
const normalizeServiceName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
const isPortalSchedulingServiceAllowed = (serviceName: string) => normalizeServiceName(serviceName) !== "encaminhar";

const EditAgendamentoModal = ({ open, onOpenChange, selectedAppointment, onConfirm }: EditAgendamentoModalProps) => {
  const [classes, setClasses] = useState<Array<{ id: string; nome: string }>>([]);
  const [servicos, setServicos] = useState<ServicoDetalhado[]>([]);
  const [classeId, setClasseId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [data, setData] = useState<Date>();
  const [vagaId, setVagaId] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingServicos, setLoadingServicos] = useState(false);
  const [datasComVagas, setDatasComVagas] = useState<Date[]>([]);
  const [carregandoDatas, setCarregandoDatas] = useState(false);

  const unidadeId = selectedAppointment?.unidadeId || "";
  const dataISO = useMemo(() => (data ? format(data, "yyyy-MM-dd") : ""), [data]);

  const { vagas, loading: loadingVagas } = useAgendamentoPortal({
    data: dataISO || undefined,
    tipoServico: tipoId || undefined,
    unidade: unidadeId || undefined,
  });

  useEffect(() => {
    if (!selectedAppointment) return;
    setData(selectedAppointment.data ? parseAppointmentDate(selectedAppointment.data) : undefined);
    setClasseId(selectedAppointment.categoriaId || "");
    setServicoId(selectedAppointment.servicoId || "");
    setTipoId(selectedAppointment.tipoId || "");
    setVagaId("");
  }, [selectedAppointment, open]);

  useEffect(() => {
    if (!unidadeId) {
      setClasses([]);
      return;
    }

    const carregarClasses = async () => {
      setLoadingClasses(true);
      try {
        const lista = await servicoAdminService.listar({ unidade: unidadeId });
        const classesMap = new Map<string, string>();
        (lista || []).forEach((servico: ServicoDetalhado) => {
          if (servico.is_active === false) return;
          if (!isPortalSchedulingServiceAllowed(servico.nome || "")) return;
          const classe = servico.classe as ClasseServicoResumo | string;
          if (!classe) return;
          if (typeof classe === "string") {
            classesMap.set(classe, classe);
            return;
          }
          if (classe.is_active === false) return;
          classesMap.set(String(classe.id), classe.nome);
        });
        const classesUnidade = Array.from(classesMap.entries()).map(([id, nome]) => ({ id, nome }));
        setClasses(classesUnidade);

        if (!classeId && selectedAppointment?.categoria) {
          const matchByName = classesUnidade.find((item) => item.nome === selectedAppointment.categoria);
          if (matchByName) {
            setClasseId(matchByName.id);
          }
        }
      } catch (err) {
        console.error(err);
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };

    void carregarClasses();
  }, [unidadeId]);

  useEffect(() => {
    if (!unidadeId || !classeId) {
      setServicos([]);
      return;
    }

    const carregarServicos = async () => {
      setLoadingServicos(true);
      try {
        const lista = await servicoAdminService.listar({ classe_id: classeId, unidade: unidadeId });
        const ativos = (lista || []).filter(
          (servico: ServicoDetalhado) => servico.is_active !== false && isPortalSchedulingServiceAllowed(servico.nome || ""),
        );
        setServicos(ativos);

        if (!servicoId && selectedAppointment?.servico) {
          const matchByName = ativos.find((item) => item.nome === selectedAppointment.servico);
          if (matchByName) {
            setServicoId(String(matchByName.id));
            const tipo = matchByName.tipo_servico as any;
            const resolvedTipoId = typeof tipo === "string" ? tipo : tipo?.id;
            setTipoId(resolvedTipoId ? String(resolvedTipoId) : "");
          }
        }
      } catch (err) {
        console.error(err);
        setServicos([]);
      } finally {
        setLoadingServicos(false);
      }
    };

    void carregarServicos();
  }, [unidadeId, classeId]);

  useEffect(() => {
    if (!vagas.length || vagaId || !selectedAppointment?.hora) return;
    const horaAtual = selectedAppointment.hora.slice(0, 5);
    const vagaAtual = (vagas as Array<any>).find((vaga) => String(vaga.horario || "").slice(0, 5) === horaAtual);
    if (vagaAtual?.id) {
      setVagaId(String(vagaAtual.id));
    }
  }, [vagas, vagaId, selectedAppointment]);

  useEffect(() => {
    if (!tipoId || !unidadeId) {
      setDatasComVagas([]);
      return;
    }

    const carregarDatas = async () => {
      setCarregandoDatas(true);
      try {
        const { data: resposta } = await agendamentoService.listarVagas({
          tipo_servico: tipoId,
          unidade: unidadeId,
        });
        if (!resposta?.success) {
          throw new Error((resposta as unknown as { result?: string }).result || "Falha ao carregar vagas.");
        }

        const lista = Array.isArray(resposta.result) ? resposta.result : [];
        const datasDisponiveis = lista
          .map((vaga: any) => {
            const dataVaga = vaga?.data;
            if (!dataVaga) return null;
            const vagasDisponiveis =
              typeof vaga?.vagas_disponiveis === "number"
                ? vaga.vagas_disponiveis
                : typeof vaga?.vagas === "number" && typeof vaga?.vagas_ocupadas === "number"
                  ? vaga.vagas - vaga.vagas_ocupadas
                  : 0;
            const ativo = typeof vaga?.is_active === "boolean" ? vaga.is_active : true;
            if (!ativo || vagasDisponiveis <= 0) return null;
            const parsed = new Date(`${dataVaga}T00:00:00`);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
          })
          .filter((item: Date | null): item is Date => !!item);

        setDatasComVagas(datasDisponiveis);
      } catch (err) {
        console.error(err);
        setDatasComVagas([]);
      } finally {
        setCarregandoDatas(false);
      }
    };

    void carregarDatas();
  }, [tipoId, unidadeId]);

  useEffect(() => {
    if (!data || !datasComVagas.length) return;
    const existe = datasComVagas.some((item) => isSameDay(item, data));
    if (!existe) {
      setData(undefined);
      setVagaId("");
    }
  }, [data, datasComVagas]);

  const handleChangeClasse = (val: string) => {
    setClasseId(val);
    setServicoId("");
    setTipoId("");
    setVagaId("");
  };

  const handleChangeServico = (val: string) => {
    setServicoId(val);
    setVagaId("");
    const servico = servicos.find((s) => String(s.id) === val);
    const tipo = servico?.tipo_servico as any;
    const resolvedTipoId = typeof tipo === "string" ? tipo : tipo?.id;
    setTipoId(resolvedTipoId ? String(resolvedTipoId) : "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md bg-white rounded-none p-4 sm:p-6 border-none max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 space-y-0 text-left mb-4 sm:mb-6">
          <div className="bg-orange-50 p-3 rounded-none w-fit">
            <Edit3 className="w-6 h-6 text-[#f26532]" />
          </div>
          <DialogTitle className="text-lg sm:text-xl font-bold text-[#1e293b] uppercase tracking-tight leading-tight">Editar agendamento</DialogTitle>
        </DialogHeader>

        {selectedAppointment && (
          <div className="space-y-3 sm:space-y-4">
            {/* UNIDADE */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unidade de Atendimento *</label>
              <Select disabled>
                <SelectTrigger className="min-h-[44px] bg-[#f8fafc] border-slate-100 text-slate-500 rounded-none focus:ring-0">
                  <SelectValue placeholder={selectedAppointment.unidade || "—"} />
                </SelectTrigger>
              </Select>
            </div>

            {/* CATEGORIA DE SERVIÇO */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria de Serviço *</label>
              <Select value={classeId} onValueChange={handleChangeClasse} disabled={loadingClasses || !unidadeId}>
                <SelectTrigger className="min-h-[44px] bg-[#f8fafc] border-slate-100 rounded-none focus:ring-[#f26532]">
                  <SelectValue placeholder={loadingClasses ? "Carregando..." : "Selecione a categoria"} />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SERVIÇO */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Serviço *</label>
              <Select value={servicoId} onValueChange={handleChangeServico} disabled={!classeId || loadingServicos}>
                <SelectTrigger className="min-h-[44px] bg-[#f8fafc] border-slate-100 rounded-none focus:ring-[#f26532]">
                  <SelectValue placeholder={loadingServicos ? "Carregando..." : "Selecione o serviço"} />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {servicos.map((item) => (
                    <SelectItem key={String(item.id)} value={String(item.id)}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* VAGA (DATA/HORA) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full min-h-[44px] justify-start text-left font-normal bg-[#f8fafc] border-slate-100 rounded-none"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                    {data ? format(data, "dd/MM/yyyy") : <span>Selecione</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto bg-white">
                  <Calendar
                    mode="single"
                    selected={data}
                    onSelect={(d) => {
                      setData(d);
                      setVagaId("");
                    }}
                    disabled={(date) => {
                      if (date < startOfDay(new Date())) return true;
                      if (!datasComVagas.length) return false;
                      return !datasComVagas.some((item) => isSameDay(item, date));
                    }}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                  {carregandoDatas && (
                    <p className="px-4 py-2 text-xs text-slate-500">Carregando dias disponíveis...</p>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Horário *</label>
              <Select value={vagaId} onValueChange={setVagaId} disabled={!data || loadingVagas || !tipoId}>
                <SelectTrigger className="min-h-[44px] bg-[#f8fafc] border-slate-100 rounded-none focus:ring-[#f26532]">
                  <SelectValue placeholder={loadingVagas ? "Consultando..." : "Selecione um horário"} />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {vagas.length > 0 ? (
                    (vagas as Array<any>)
                      .filter((m) => m.vagas - m.vagas_ocupadas > 0)
                      .map((vaga) => {
                        const vagasDisponiveis =
                          typeof vaga.vagas_disponiveis === "number"
                            ? vaga.vagas_disponiveis
                            : typeof vaga.vagas === "number" && typeof vaga.vagas_ocupadas === "number"
                              ? vaga.vagas - vaga.vagas_ocupadas
                              : undefined;
                        return (
                          <SelectItem key={String(vaga.id)} value={String(vaga.id)}>
                            {vaga.horario}
                            {typeof vagasDisponiveis === "number" ? ` — ${vagasDisponiveis} vagas livres` : ""}
                          </SelectItem>
                        );
                      })
                  ) : (
                    <p className="p-4 text-xs text-center text-slate-500 uppercase">Nenhum horário disponível</p>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-3 sm:pt-4 flex flex-col gap-2">
              <Button
                onClick={() => onConfirm({ servicoId, vagaId })}
                disabled={!servicoId || !vagaId || !data}
                className="w-full h-12 sm:h-14 bg-[#f26532] hover:bg-[#d95428] text-white rounded-none text-base font-bold uppercase tracking-wide"
              >
                Confirmar Alteração
              </Button>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full h-10 text-slate-500 rounded-none text-xs font-bold uppercase hover:bg-slate-50 hover:text-slate-700 focus-visible:text-slate-700"
              >
                Voltar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditAgendamentoModal;
