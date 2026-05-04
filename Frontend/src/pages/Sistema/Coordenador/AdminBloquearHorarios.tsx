import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/sonner";
import { Save, CalendarIcon, Pencil, Plus } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

import { useAuth } from "@/contexts/AuthContext";
import { useBloqueiosHorario, useCreateBloqueioHorario, useUpdateBloqueioHorario } from "@/hooks/sistema/useBloqueiohorario";
import { useProfissionais } from "@/hooks/sistema/useProfissionais";
import { Value } from "@radix-ui/react-select";

const MOTIVO_MAX_LENGTH = 600;

export default function AdminBloquearHorarios() {
  const { user } = useAuth();
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 5;
  const offset = (paginaAtual - 1) * itensPorPagina;

  const { data: bloqueiosPaginados, isLoading } = useBloqueiosHorario({
    unidade: user?.unidade_ativa?.id,
    limit: itensPorPagina,
    offset,
  });
  const { data: profissionais = [] } = useProfissionais();
  const { mutateAsync: criarBloqueio } = useCreateBloqueioHorario();
  const { mutateAsync: atualizarBloqueio } = useUpdateBloqueioHorario();

  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataFim, setDataFim] = useState<Date>();
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("17:00");
  const [motivo, setMotivo] = useState("");
  const [justificativaCancelamento, setJustificativaCancelamento] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [bloqueioEditando, setBloqueioEditando] = useState<any | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const bloqueios = bloqueiosPaginados?.items ?? [];
  const totalItens = bloqueiosPaginados?.count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));
  const paginaInicio = totalItens ? (paginaAtual - 1) * itensPorPagina + 1 : 0;
  const paginaFim = Math.min(paginaAtual * itensPorPagina, totalItens);
  const mapaUsuarios = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const profissional of profissionais) {
      const nome = profissional.nome_completo?.trim();
      if (nome) {
        mapa.set(String(profissional.id), nome);
      }
    }
    return mapa;
  }, [profissionais]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  const resetarFormulario = () => {
    setDataInicio(undefined);
    setDataFim(undefined);
    setHoraInicio("08:00");
    setHoraFim("17:00");
    setMotivo("");
    setJustificativaCancelamento("");
    setAtivo(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dataInicio || !motivo.trim()) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (bloqueioEditando && !ativo && !justificativaCancelamento.trim()) {
      toast.error("Informe a justificativa para o cancelamento");
      return;
    }

    const payload = {
      unidade: [user.unidade_ativa.id],
      data: format(dataInicio, "yyyy-MM-dd"),
      data_final: dataFim ? format(dataFim, "yyyy-MM-dd") : null,
      hora_inicio: `${horaInicio}:00`,
      hora_fim: `${horaFim}:00`,
      motivo,
    };

    try {
      if (bloqueioEditando) {
        await atualizarBloqueio({
          id: bloqueioEditando.id,
          payload: {
            ...payload,
            is_active: ativo,
            justificativa_alteracao: ativo ? null : justificativaCancelamento,
            alterado_por: user.id,
          },
        });
        toast.success("Bloqueio atualizado com sucesso!");
        setBloqueioEditando(null);
      } else {
        await criarBloqueio({
          ...payload,
          criado_por: user.id,
        });
        toast.success("Bloqueio cadastrado com sucesso!");
      }

      resetarFormulario();
      setBloqueioEditando(null);
      setModalAberto(false);
    } catch {
      toast.error("Erro ao salvar bloqueio");
    }
  };

  const abrirNovoBloqueio = () => {
    setBloqueioEditando(null);
    resetarFormulario();
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setBloqueioEditando(null);
    resetarFormulario();
  };

  const handleEditar = (bloqueio: any) => {
    setBloqueioEditando(bloqueio);

    setDataInicio(parseDataLocal(bloqueio.data));
    setDataFim(bloqueio.data_final ? parseDataLocal(bloqueio.data_final) : undefined);
    setHoraInicio(bloqueio.hora_inicio.slice(0, 5));
    setHoraFim(bloqueio.hora_fim.slice(0, 5));
    setMotivo(bloqueio.motivo);
    setAtivo(Boolean(bloqueio.is_active));
    setJustificativaCancelamento(bloqueio.justificativa_alteracao || "");
    setModalAberto(true);
  };

  const formatarData = (valor?: string | null) => {
    if (!valor) return "-";
    const data = /^\d{4}-\d{2}-\d{2}$/.test(valor)
      ? parseISO(`${valor}T00:00:00`)
      : parseISO(valor);
    if (!isValid(data)) return "-";
    return format(data, "dd/MM/yyyy");
  };
  const parseDataLocal = (valor?: string | null) => {
    if (!valor) return undefined;
    const data = /^\d{4}-\d{2}-\d{2}$/.test(valor)
      ? parseISO(`${valor}T00:00:00`)
      : parseISO(valor);
    return isValid(data) ? data : undefined;
  };
  const getNomeCriador = (id: string) => {
    if (id === user?.id) return "Você";
    return mapaUsuarios.get(String(id)) ?? id;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-3xl font-bold">Bloqueio de horários</h1>
                  <p className="text-muted-foreground">Gerencie a permissão de horários na sua unidade</p>
                </div>
              </div>
              <Button type="button" className="gap-2" onClick={abrirNovoBloqueio}>
                <Plus className="h-4 w-4" />
                Novo Bloqueio
              </Button>
            </div>

            <div className="flex flex-col gap-6">
              <Dialog
                open={modalAberto}
                onOpenChange={(open) => {
                  if (!open) {
                    fecharModal();
                    return;
                  }
                  setModalAberto(true);
                }}
              >
                <DialogContent className="max-w-2xl border-none overflow-y-auto p-0 bg-white rounded-2xl shadow-lg max-h-[90vh]">
                  {/* Barra de destaque superior laranja */}
                  <div className="bg-[#f05a28] h-1.5 w-full" />

                  <div className="p-8">
                    <DialogHeader className="mb-6">
                      <div className="text-left">
                        <DialogTitle className="text-2xl font-bold text-slate-800">
                          {bloqueioEditando ? "Editar Bloqueio" : "Novo Bloqueio"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 text-sm">Defina o período e o motivo do bloqueio.</DialogDescription>
                      </div>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Seção de Datas */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2 text-left">
                          <Label className="text-sm font-semibold text-slate-700 ml-1">
                            Data de Início <span className="text-destructive">*</span>
                          </Label>
                          {bloqueioEditando ? (
                            <Input
                              type="date"
                              className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] h-11"
                              value={dataInicio ? format(dataInicio, "yyyy-MM-dd") : ""}
                              onChange={(e) => setDataInicio(parseDataLocal(e.target.value))}
                            />
                          ) : (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start rounded-xl border-slate-200 h-11 px-3 font-normal",
                                    !dataInicio && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                  {dataInicio ? format(dataInicio, "PPP", { locale: ptBR }) : "Selecione"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 rounded-xl overflow-hidden shadow-xl border-none">
                                <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus locale={ptBR} />
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>

                        <div className="space-y-2 text-left">
                          <Label className="text-sm font-semibold text-slate-700 ml-1">Data de Fim</Label>
                          {bloqueioEditando ? (
                            <Input
                              type="date"
                              className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] h-11"
                              value={dataFim ? format(dataFim, "yyyy-MM-dd") : ""}
                              onChange={(e) => setDataFim(parseDataLocal(e.target.value))}
                              min={dataInicio ? format(dataInicio, "yyyy-MM-dd") : undefined}
                            />
                          ) : (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start rounded-xl border-slate-200 h-11 px-3 font-normal",
                                    !dataFim && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                  {dataFim ? format(dataFim, "PPP", { locale: ptBR }) : "Selecione"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 rounded-xl overflow-hidden shadow-xl border-none">
                                <Calendar
                                  mode="single"
                                  selected={dataFim}
                                  onSelect={setDataFim}
                                  disabled={(date) => (dataInicio ? date < dataInicio : false)}
                                  initialFocus
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </div>

                      {/* Seção de Horários */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2 text-left">
                          <Label className="text-sm font-semibold text-slate-700 ml-1">
                            Hora de Início <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="time"
                            className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] h-11"
                            value={horaInicio}
                            onChange={(e) => setHoraInicio(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 text-left">
                          <Label className="text-sm font-semibold text-slate-700 ml-1">
                            Hora de Fim <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="time"
                            className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] h-11"
                            value={horaFim}
                            onChange={(e) => setHoraFim(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Motivo/Justificativa */}
                      {bloqueioEditando ? (
                        <div className="space-y-4 text-left">
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700 ml-1">Motivo:</Label>
                            <Textarea
                              className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] min-h-[100px] resize-none bg-slate-50"
                              value={motivo}
                              disabled
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700 ml-1">Justificativa para a alteração:</Label>
                            <Textarea
                              className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] min-h-[100px] resize-none"
                              value={justificativaCancelamento}
                              maxLength={MOTIVO_MAX_LENGTH}
                              onChange={(e) => setJustificativaCancelamento(e.target.value.slice(0, MOTIVO_MAX_LENGTH))}
                              placeholder="Descreva o motivo da alteração..."
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-left">
                          <Label className="text-sm font-semibold text-slate-700 ml-1">Motivo *</Label>
                          <Textarea
                            className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] min-h-[100px] resize-none"
                            value={motivo}
                            maxLength={MOTIVO_MAX_LENGTH}
                            onChange={(e) => setMotivo(e.target.value.slice(0, MOTIVO_MAX_LENGTH))}
                            placeholder="Ex: Feriado, Manutenção, Reunião..."
                          />
                          <p className="text-xs text-slate-400 text-right">
                            {motivo.length}/{MOTIVO_MAX_LENGTH}
                          </p>
                        </div>
                      )}

                      {/* Card de Status do Bloqueio (apenas em edição) */}
                      {bloqueioEditando && (
                        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/80">
                          <div className="space-y-0.5 text-left">
                            <Label className="text-sm font-bold text-slate-700">Status do bloqueio</Label>
                            <p className="text-xs text-slate-500">Ative ou cancele este bloqueio.</p>
                          </div>
                          <Switch checked={ativo} onCheckedChange={setAtivo} className="data-[state=checked]:bg-[#f05a28]" />
                        </div>
                      )}

                      {/* Rodapé com botões padronizados */}
                      <DialogFooter className="mt-8 flex flex-row gap-3 sm:justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={fecharModal}
                          className="flex-1 sm:flex-none text-slate-500 font-medium hover:bg-slate-100 rounded-xl px-6 h-11"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 sm:flex-none bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold px-8 rounded-xl h-11 transition-all shadow-md shadow-orange-100 gap-2"
                        >
                          <Save className="h-4 w-4" />
                          {bloqueioEditando ? "Salvar Alterações" : "Cadastrar"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>

              {/* LISTA */}

              {isLoading ? (
                <p className="text-center text-muted-foreground">Carregando...</p>
              ) : bloqueios.length === 0 ? (
                <p className="text-center text-muted-foreground">Nenhum bloqueio cadastrado</p>
              ) : (
                <div className="bg-card rounded-2xl shadow-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="px-6 py-4 text-left font-bold text-foreground">Motivo</th>
                          <th className="px-6 py-4 text-left font-bold text-foreground">Quem fez</th>
                          <th className="px-6 py-4 text-left font-bold text-foreground">Data início</th>
                          <th className="px-6 py-4 text-left font-bold text-foreground">Data término</th>
                          <th className="px-6 py-4 text-left font-bold text-foreground">Status</th>
                          <th className="px-6 py-4 text-left font-bold text-foreground">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bloqueios.map((b, index) => (
                          <tr key={b.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <td className="px-6 py-4 text-foreground font-medium">{b.motivo}</td>
                            <td className="px-6 py-4 text-sm text-foreground">{getNomeCriador(b.criado_por)}</td>
                            <td className="px-6 py-4 text-sm text-foreground">{formatarData(b.data)}</td>
                            <td className="px-6 py-4 text-sm text-foreground">{formatarData(b.data_final)}</td>
                            <td className="px-6 py-4">
                              <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Ativo" : "Cancelado"}</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEditar(b)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {bloqueios.length > 0 && (
                <div className="flex items-center justify-between  pb-4">
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
        </main>
      </div>
    </SidebarProvider>
  );
}
