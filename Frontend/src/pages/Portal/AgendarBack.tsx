import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/portal/Header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FaleConosco } from "@/components/portal/FaleConosco";
import { agendarService } from "@/services/agendarService";
import { toast } from "@/lib/sonner";

type UnidadeOption = { id: string; nome: string };
type TipoServicoOption = { id: string; nome: string };
type ServicoOption = { id: string; nome: string };

const normalizeServiceName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
const isPortalSchedulingServiceAllowed = (serviceName: string) => normalizeServiceName(serviceName) !== "encaminhar";

const Agendar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [tipos, setTipos] = useState<TipoServicoOption[]>([]);
  const [servicos, setServicos] = useState<ServicoOption[]>([]);

  const [unidadeId, setUnidadeId] = useState("");
  const [unidadeNome, setUnidadeNome] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [tipoNome, setTipoNome] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [servicoNome, setServicoNome] = useState("");

  useEffect(() => {
    agendarService
      .listarUnidades()
      .then((resp) => setUnidades(resp.data || []))
      .catch(() => toast.error("Não foi possível carregar unidades."));
  }, []);

  const carregarTipos = (id: string, nome: string) => {
    setUnidadeId(id);
    setUnidadeNome(nome);
    setTipoId("");
    setTipoNome("");
    setServicos([]);
    setServicoId("");
    setServicoNome("");

    agendarService
      .listarTipos(id)
      .then((resp) => setTipos(resp.data.tipos || []))
      .catch(() => toast.error("Não foi possível carregar tipos de serviço."));
  };

  const carregarServicos = (id: string, nome: string) => {
    if (!unidadeId) {
      toast.error("Selecione uma unidade.");
      return;
    }
    setTipoId(id);
    setTipoNome(nome);
    setServicoId("");
    setServicoNome("");

    agendarService
      .listarServicos(unidadeId, id)
      .then((resp) =>
        setServicos((resp.data.servicos || []).filter((servico) => isPortalSchedulingServiceAllowed(servico.nome || ""))),
      )
      .catch(() => toast.error("Não foi possível carregar serviços."));
  };

  const handleAgendar = () => {
    if (!unidadeId || !tipoId || !servicoId) return;

    navigate("/agendar/detalhes", {
      state: {
        fromPath: location.pathname,
        unidadeId,
        unidadeNome,
        tipoId,
        tipoNome,
        servicoId,
        servicoNome,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-16 text-foreground">
          Solicitar agendamento
        </h1>

        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-2xl shadow-lg p-12">
            <p className="text-center text-lg mb-8 text-foreground">
              Selecione abaixo as opções desejadas da
              <br />
              unidade, categoria de serviço e o serviço
            </p>

            <div className="space-y-6">
              <div>
                <Select
                  value={unidadeId}
                  onValueChange={(val) => {
                    const unidade = unidades.find((u) => u.id === val);
                    carregarTipos(val, unidade?.nome || "");
                  }}
                >
                  <SelectTrigger className="w-full h-14 bg-muted border-0 text-lg">
                    <SelectValue placeholder="Unidade do CRAS" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select
                  value={tipoId}
                  onValueChange={(val) => {
                    const tipo = tipos.find((t) => t.id === val);
                    carregarServicos(val, tipo?.nome || "");
                  }}
                  disabled={!unidadeId}
                >
                  <SelectTrigger className="w-full h-14 bg-muted border-0 text-lg">
                    <SelectValue placeholder="Categoria (Tipo de serviço)" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {tipos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select
                  value={servicoId}
                  onValueChange={(val) => {
                    const serv = servicos.find((s) => s.id === val);
                    setServicoId(val);
                    setServicoNome(serv?.nome || "");
                  }}
                  disabled={!tipoId}
                >
                  <SelectTrigger className="w-full h-14 bg-muted border-0 text-lg">
                    <SelectValue placeholder="Serviço" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {servicos.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleAgendar}
                disabled={!unidadeId || !tipoId || !servicoId}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg rounded-full mt-8"
              >
                Agendar atendimento
              </Button>
            </div>
          </div>
        </div>
      </div>

      <FaleConosco />
    </div>
  );
};

export default Agendar;
