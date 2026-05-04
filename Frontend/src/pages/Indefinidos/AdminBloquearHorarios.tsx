import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { toast } from "@/lib/sonner";
import { Save, CalendarIcon, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBloqueiosHorario, useCreateBloqueioHorario, useUpdateBloqueioHorario } from "@/hooks/sistema/useBloqueiohorario";

export default function AdminBloquearHorarios() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: bloqueiosPaginados, isLoading } = useBloqueiosHorario();
  const { mutateAsync: criarBloqueio } = useCreateBloqueioHorario();
  const { mutateAsync: atualizarBloqueio } = useUpdateBloqueioHorario();
  const bloqueios = bloqueiosPaginados?.items ?? [];

  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataFim, setDataFim] = useState<Date>();
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("17:00");
  const [motivo, setMotivo] = useState("");
  const [bloqueioEditando, setBloqueioEditando] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dataInicio || !motivo.trim()) {
      toast.error("Preencha os campos obrigatórios");
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
          payload,
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

      setDataInicio(undefined);
      setDataFim(undefined);
      setHoraInicio("08:00");
      setHoraFim("17:00");
      setMotivo("");
    } catch {
      toast.error("Erro ao salvar bloqueio");
    }
  };

  const handleEditar = (bloqueio: any) => {
    setBloqueioEditando(bloqueio);

    setDataInicio(new Date(bloqueio.data));
    setDataFim(bloqueio.data_final ? new Date(bloqueio.data_final) : undefined);
    setHoraInicio(bloqueio.hora_inicio.slice(0, 5));
    setHoraFim(bloqueio.hora_fim.slice(0, 5));
    setMotivo(bloqueio.motivo);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
              <SidebarTrigger />
              <h1 className="text-3xl font-bold">Bloqueio de Horários</h1>
            </div>

            <div className="flex flex-col gap-6">
              {/* FORM */}
              <Card className="h-full">
                <CardHeader className="border-b">
                  <CardTitle> {bloqueioEditando ? "Editar Bloqueio" : "Novo Bloqueio"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Datas */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Data de Início *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start", !dataInicio && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dataInicio ? format(dataInicio, "PPP", { locale: ptBR }) : "Selecione"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0">
                            <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label>Data de Fim</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start", !dataFim && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dataFim ? format(dataFim, "PPP", { locale: ptBR }) : "Selecione"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0">
                            <Calendar
                              mode="single"
                              selected={dataFim}
                              onSelect={setDataFim}
                              disabled={(date) => (dataInicio ? date < dataInicio : false)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Horários */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Hora de Início *</Label>
                        <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                      </div>
                      <div>
                        <Label>Hora de Fim *</Label>
                        <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
                      </div>
                    </div>

                    {/* Motivo */}
                    <div>
                      <Label>Motivo *</Label>
                      <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: Feriado, Manutenção, Reunião..." />
                    </div>

                    <div className="flex gap-4">
                      <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="gap-2">
                        <Save className="h-4 w-4" />
                        {bloqueioEditando ? "Salvar Alterações" : "Cadastrar"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* LISTA */}
              <Card>
                <CardHeader>
                  <CardTitle>Bloqueios Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-center text-muted-foreground">Carregando...</p>
                  ) : bloqueios.length === 0 ? (
                    <p className="text-center text-muted-foreground">Nenhum bloqueio cadastrado</p>
                  ) : (
                    <div className="space-y-4">
                      {bloqueios.map((b) => (
                        <div key={b.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{b.motivo}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(b.data), "dd/MM/yyyy")}
                                {b.data_final && ` até ${format(new Date(b.data_final), "dd/MM/yyyy")}`}
                              </p>
                              <p className="text-sm">
                                {b.hora_inicio} às {b.hora_fim}
                              </p>
                            </div>

                            <Button variant="ghost" size="icon" onClick={() => handleEditar(b)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
