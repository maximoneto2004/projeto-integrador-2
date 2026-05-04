import { Header } from "@/components/portal/Header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Edit, Trash2, CalendarIcon, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { appointmentStore, horariosDisponiveis } from "@/lib/appointmentStore";
import type { Appointment } from "@/types/agenda";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FaleConosco } from "@/components/portal/FaleConosco";

const parseAppointmentDate = (value: string) => new Date(value.includes("T") ? value : `${value}T00:00:00`);

const MeusAgendamentos = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [viewModal, setViewModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [avaliacaoModal, setAvaliacaoModal] = useState(false);

  const [editData, setEditData] = useState<Date>();
  const [editHora, setEditHora] = useState("");
  const [notaAvaliacao, setNotaAvaliacao] = useState(0);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");

  useEffect(() => {
    setAppointments(appointmentStore.getAppointments());
  }, []);

  const handleView = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setViewModal(true);
  };

  const handleEdit = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditData(parseAppointmentDate(appointment.data));
    setEditHora(appointment.hora);
    setEditModal(true);
  };

  const handleCancelClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelModal(true);
  };

  const handleConfirmEdit = () => {
    if (selectedAppointment && editData && editHora) {
      appointmentStore.updateAppointment(selectedAppointment.id, {
        data: format(editData, "yyyy-MM-dd"),
        hora: editHora,
      });
      setAppointments(appointmentStore.getAppointments());
      setEditModal(false);
    }
  };

  const handleConfirmCancel = () => {
    if (selectedAppointment) {
      appointmentStore.cancelAppointment(selectedAppointment.id);
      setAppointments(appointmentStore.getAppointments());
      setCancelModal(false);
    }
  };

  const handleAvaliarClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNotaAvaliacao(appointment.avaliacao?.nota || 0);
    setComentarioAvaliacao(appointment.avaliacao?.comentario || "");
    setAvaliacaoModal(true);
  };

  const handleSalvarAvaliacao = () => {
    if (selectedAppointment && notaAvaliacao > 0) {
      appointmentStore.addAvaliacao(
        selectedAppointment.id,
        notaAvaliacao,
        comentarioAvaliacao,
      );
      setAppointments(appointmentStore.getAppointments());
      setAvaliacaoModal(false);
      setNotaAvaliacao(0);
      setComentarioAvaliacao("");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Marcado: "bg-warning/20 text-warning border-warning",
      Finalizado: "bg-purple-200 text-purple-700 border-purple-300",
      Cancelado: "bg-destructive/20 text-destructive border-destructive",
      Atendido: "bg-success/20 text-success border-success",
    };

    return (
      <span
        className={`inline-flex whitespace-nowrap px-4 py-1 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles] || ""}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative text-white py-20 px-4 overflow-hidden">
        <img
          src={`${import.meta.env.BASE_URL}hero.png`}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="container mx-auto flex items-center justify-between">
          <div className="max-w-xl">
            <h1 className="text-4xl font-bold mb-4">
              AGENDAMENTO CRAS FORTALEZA
            </h1>
            <p className="text-xl opacity-90">Simples, Rápido e Sem Filas</p>
            <Button
              onClick={() => navigate("/agendar")}
              className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg rounded-full"
            >
              Ir para agendamento
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </div>
          {/* <div className="hidden lg:block">
            <img 
              src="https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=500&fit=crop" 
              alt="Pessoa sorrindo"
              className="rounded-2xl shadow-2xl w-[350px] h-[450px] object-cover"
            />
          </div> */}
        </div>
      </section>

      {/* Appointments Table */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Meus agendamentos
          </h2>

          <div className="bg-card rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-foreground">
                      Serviço
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-foreground">
                      Local
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-foreground">
                      Horário
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-foreground">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left font-bold text-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment, index) => (
                    <tr
                      key={appointment.id}
                      className={
                        index % 2 === 0 ? "bg-background" : "bg-muted/30"
                      }
                    >
                      <td className="px-6 py-4 text-foreground">
                        {appointment.servico}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {appointment.unidade}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {appointment.hora}hrs -{" "}
                        {format(parseAppointmentDate(appointment.data), "dd/MM/yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(appointment.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleView(appointment)}
                            className="p-2 hover:bg-muted rounded-full"
                            title="Visualizar"
                          >
                            <Eye className="w-5 h-5 text-muted-foreground" />
                          </button>
                          {appointment.status === "Marcado" && (
                            <>
                              <button
                                onClick={() => handleEdit(appointment)}
                                className="p-2 hover:bg-muted rounded-full"
                                title="Editar"
                              >
                                <Edit className="w-5 h-5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => handleCancelClick(appointment)}
                                className="p-2 hover:bg-muted rounded-full"
                                title="Cancelar"
                              >
                                <Trash2 className="w-5 h-5 text-destructive" />
                              </button>
                            </>
                          )}
                          {appointment.status === "Finalizado" && (
                            <button
                              onClick={() => handleAvaliarClick(appointment)}
                              className="p-2 hover:bg-muted rounded-full"
                              title={
                                appointment.avaliacao
                                  ? "Ver avaliação"
                                  : "Avaliar atendimento"
                              }
                            >
                              <Star
                                className={`w-5 h-5 ${appointment.avaliacao ? "fill-warning text-warning" : "text-muted-foreground"}`}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* View Modal */}
      <Dialog open={viewModal} onOpenChange={setViewModal}>
        <DialogContent className="sm:max-w-md bg-card">
          <button
            onClick={() => setViewModal(false)}
            className="absolute right-4 top-4 text-foreground text-2xl font-bold hover:opacity-70"
          >
            ×
          </button>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-6">
              Agendamento
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div>
                <label className="font-semibold text-foreground">
                  Unidade *
                </label>
                <Select value={selectedAppointment.unidade} disabled>
                  <SelectTrigger className="mt-2 bg-muted border-0">
                    <SelectValue />
                  </SelectTrigger>
                </Select>
              </div>

              <div>
                <label className="font-semibold text-foreground">Data *</label>
                <Select value={selectedAppointment.data} disabled>
                  <SelectTrigger className="mt-2 bg-muted border-0">
                    <SelectValue />
                  </SelectTrigger>
                </Select>
              </div>

              <div>
                <label className="font-semibold text-foreground">Hora *</label>
                <Select value={selectedAppointment.hora} disabled>
                  <SelectTrigger className="mt-2 bg-muted border-0">
                    <SelectValue />
                  </SelectTrigger>
                </Select>
              </div>

              {selectedAppointment.atendente && (
                <div>
                  <label className="font-semibold text-foreground">
                    Atendente
                  </label>
                  <input
                    type="text"
                    value={selectedAppointment.atendente}
                    disabled
                    className="mt-2 w-full p-3 bg-muted rounded-lg border-0"
                  />
                </div>
              )}

              <Button
                onClick={() => setViewModal(false)}
                variant="outline"
                className="w-full rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Voltar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="sm:max-w-md bg-card">
          <button
            onClick={() => setEditModal(false)}
            className="absolute right-4 top-4 text-foreground text-2xl font-bold hover:opacity-70"
          >
            ×
          </button>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-6">
              Editar agendamento
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div>
                <label className="font-semibold text-foreground">
                  Selecione uma unidade *
                </label>
                <Select value={selectedAppointment.unidade} disabled>
                  <SelectTrigger className="mt-2 bg-muted border-0">
                    <SelectValue />
                  </SelectTrigger>
                </Select>
              </div>

              <div>
                <label className="font-semibold text-foreground">Data *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-2 justify-start text-left font-normal bg-muted border-0",
                        !editData && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editData ? (
                        format(editData, "dd/MM/yyyy")
                      ) : (
                        <span>Selecione</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto bg-card">
                    <Calendar
                      mode="single"
                      selected={editData}
                      onSelect={setEditData}
                      disabled={(date) => date < new Date()}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="font-semibold text-foreground">Hora *</label>
                <Select value={editHora} onValueChange={setEditHora}>
                  <SelectTrigger className="mt-2 bg-muted border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {horariosDisponiveis.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-destructive text-center font-semibold">
                Você não poderá desfazer essa ação
              </p>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setEditModal(false)}
                  className="flex-1 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmEdit}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={cancelModal} onOpenChange={setCancelModal}>
        <DialogContent className="sm:max-w-md bg-card">
          <button
            onClick={() => setCancelModal(false)}
            className="absolute right-4 top-4 text-foreground text-2xl font-bold hover:opacity-70"
          >
            ×
          </button>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-6">
              Tem certeza que deseja cancelar?
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div>
                <span className="font-semibold text-foreground">Local: </span>
                <span className="text-foreground">
                  Messejana - Fortaleza - Av. Jornalista Tomaz Coelho, 408
                </span>
              </div>

              <div>
                <span className="font-semibold text-foreground">Horário: </span>
                <span className="text-foreground">
                  {format(parseAppointmentDate(selectedAppointment.data), "dd/MM/yyyy")}, às{" "}
                  {selectedAppointment.hora}
                </span>
              </div>

              <p className="text-destructive text-center font-semibold mt-6">
                Pode ser que você não consiga mais agendar para essa data
              </p>

              <div className="flex gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setCancelModal(false)}
                  className="flex-1 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Sair
                </Button>
                <Button
                  onClick={handleConfirmCancel}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Avaliação Modal */}
      <Dialog open={avaliacaoModal} onOpenChange={setAvaliacaoModal}>
        <DialogContent className="sm:max-w-md bg-card">
          <button
            onClick={() => setAvaliacaoModal(false)}
            className="absolute right-4 top-4 text-foreground text-2xl font-bold hover:opacity-70"
          >
            ×
          </button>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-4">
              {selectedAppointment?.avaliacao
                ? "Sua Avaliação"
                : "Avaliar Atendimento"}
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6">
              <div>
                <p className="text-center text-muted-foreground mb-4">
                  Como foi seu atendimento?
                </p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((nota) => (
                    <button
                      key={nota}
                      onClick={() => setNotaAvaliacao(nota)}
                      disabled={!!selectedAppointment.avaliacao}
                      className="transition-transform hover:scale-110 disabled:cursor-not-allowed"
                    >
                      <Star
                        className={`w-10 h-10 ${nota <= notaAvaliacao ? "fill-warning text-warning" : "text-muted-foreground"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Comentário (opcional)
                </label>
                <Textarea
                  value={comentarioAvaliacao}
                  onChange={(e) => setComentarioAvaliacao(e.target.value)}
                  disabled={!!selectedAppointment.avaliacao}
                  placeholder="Compartilhe sua experiência..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              {!selectedAppointment.avaliacao ? (
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setAvaliacaoModal(false)}
                    className="flex-1 rounded-full"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSalvarAvaliacao}
                    disabled={notaAvaliacao === 0}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                  >
                    Enviar Avaliação
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setAvaliacaoModal(false)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                >
                  Fechar
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <FaleConosco />
    </div>
  );
};

export default MeusAgendamentos;
