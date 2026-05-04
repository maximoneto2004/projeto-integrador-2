import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { toast } from "@/lib/sonner";

import { Header } from "@/components/portal/Header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FaleConosco } from "@/components/portal/FaleConosco";
import { useFortalezaDigital } from "@/hooks/portal/useFortalezaDigital";
import { agendarService, VagaOption } from "@/services/agendarService";

const AgendarDetalhes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as {
    unidadeId?: string;
    unidadeNome?: string;
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
  const [vagas, setVagas] = useState<VagaOption[]>([]);
  const [loadingVagas, setLoadingVagas] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { carregarIdentidade } = useFortalezaDigital();

  const faltaDadosBasicos =
    !state.unidadeId || !state.servicoId || !state.tipoId;

  useEffect(() => {
    if (faltaDadosBasicos) {
      navigate("/agendar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const carregar = async () => {
      const identidade = await carregarIdentidade();
      if (!identidade || typeof identidade !== "object") return;

      const nome = (identidade as any).nome || (identidade as any).name;
      const cpf =
        (identidade as any).cpf || (identidade as any).preferred_username;
      const email =
        (identidade as any).email ||
        (identidade as any).email_preferencial ||
        (identidade as any).preferred_email;
      const telefone =
        (identidade as any).telefone ||
        (identidade as any).phone_number ||
        (identidade as any).celular;

      setUser({
        nome: nome || "",
        cpf: cpf || "",
        email: email || "",
        telefone: telefone || "",
      });
    };

    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!data || !state.unidadeId || !state.tipoId) return;
    const dataISO = format(data, "yyyy-MM-dd");
    setLoadingVagas(true);
    agendarService
      .listarVagas(state.unidadeId, state.tipoId, dataISO)
      .then((resp) => {
        const payload = resp.data as any;
        const lista = Array.isArray(payload)
          ? payload
          : payload?.result || payload?.vagas || [];
        setVagas(lista);
      })
      .catch(() =>
        toast.error("Não foi possível carregar vagas para a data selecionada."),
      )
      .finally(() => setLoadingVagas(false));
  }, [data, state.unidadeId, state.tipoId]);

  const hora = useMemo(() => {
    const vaga = vagas.find((v) => v.id === vagaId);
    return vaga?.horario || "";
  }, [vagaId, vagas]);

  const handleProximo = () => {
    if (!data || !vagaId) return;
    setShowConfirmModal(true);
  };

  const handleConfirmar = async () => {
    if (!vagaId || !state.servicoId) return;
    try {
      const resp = await agendarService.criarAgendamento({
        vagaId,
        servicoId: state.servicoId,
      });
      if ((resp.data as any)?.redirect) {
        navigate((resp.data as any).redirect);
        return;
      }
      toast.success((resp.data as any)?.mensagem || "Agendamento confirmado!");
      navigate("/meus-agendamentos");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        "Não foi possível agendar. Verifique os dados.";
      toast.error(msg);
    } finally {
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-12 text-foreground">
          Agendamento - {state.servicoNome || "Serviço"}
        </h1>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-card rounded-2xl shadow-md p-8">
            <h2 className="text-xl font-bold mb-6 text-foreground">
              Dados Pessoais
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Solicitante
                </h3>
                <p className="text-foreground">{user.nome || "-"}</p>
                <p className="text-muted-foreground">CPF {user.cpf || "-"}</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1">Celular</h3>
                <p className="text-foreground">{user.telefone || "-"}</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1">E-mail</h3>
                <p className="text-foreground">{user.email || "-"}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-md p-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-20 bg-gradient-card" />
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-6 text-foreground">
                {state.unidadeNome || "Unidade"}
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Categoria
                  </h3>
                  <p className="text-foreground">{state.tipoNome || "-"}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-foreground font-medium">Ativo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-md p-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-foreground">
            Faça seu agendamento
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Serviço</h3>
              <p className="text-foreground">{state.servicoNome || "-"}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-foreground">Unidade</h3>
              <p className="text-foreground">{state.unidadeNome || "-"}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block mb-2 font-medium text-foreground">
                Data <span className="text-destructive">*</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal bg-muted border-0",
                      !data && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data ? (
                      format(data, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>DD/MM/AAAA</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 pointer-events-auto bg-card"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={data}
                    onSelect={(d) => {
                      setData(d);
                      setVagaId("");
                    }}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="block mb-2 font-medium text-foreground">
                Horário (vagas) <span className="text-destructive">*</span>
              </label>
              <Select
                value={vagaId}
                onValueChange={setVagaId}
                disabled={!data || loadingVagas || vagas.length === 0}
              >
                <SelectTrigger className="h-12 bg-muted border-0">
                  <SelectValue
                    placeholder={loadingVagas ? "Carregando..." : "Selecione"}
                  />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {vagas.map((vaga) => (
                    <SelectItem key={vaga.id} value={vaga.id}>
                      {vaga.horario} ? {vaga.vagas_disponiveis} vagas
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/agendar")}
              className="px-8 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleProximo}
              disabled={!data || !vagaId}
              className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
            >
              Pr?ximo
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md bg-card">
          <button
            onClick={() => setShowConfirmModal(false)}
            className="absolute right-4 top-4 text-destructive text-2xl font-bold hover:opacity-70"
          >
            ?
          </button>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-6">
              Confirme o hor?rio
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-foreground">
            <div>
              <span className="font-semibold">Local: </span>
              <span>{state.unidadeNome}</span>
            </div>

            <div>
              <span className="font-semibold">Hor?rio: </span>
              <span>
                {data && format(data, "dd/MM/yyyy", { locale: ptBR })}, ?s{" "}
                {hora}
              </span>
            </div>

            <p className="font-semibold text-center mt-6">
              Deseja realmente selecionar este hor?rio?
            </p>
          </div>

          <div className="flex gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FaleConosco />
    </div>
  );
};

export default AgendarDetalhes;
