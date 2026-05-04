import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { servicoAdminService } from "@/services/sistema/servicoAdminService";
import { unidadeCrasService } from "@/services/sistema/unidadeCrasService";
import type { ClasseServicoResumo, ServicoDetalhado, UnidadeCras } from "@/types/api";
import { toast } from "@/lib/sonner";
import { ArrowRight, Check, ClipboardCheck, ChevronsUpDown, LayoutGrid, MapPin } from "lucide-react";

type UnidadeOption = { id: string; nome: string };
type ClasseServicoOption = { id: string; nome: string };

const normalizeServiceName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const isPortalSchedulingServiceAllowed = (serviceName: string) => normalizeServiceName(serviceName) !== "encaminhar";

type AgendarSolicitacaoProps = {
  className?: string;
};

export const AgendarSolicitacao = ({ className }: AgendarSolicitacaoProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [classes, setClasses] = useState<ClasseServicoOption[]>([]);
  const [servicos, setServicos] = useState<ServicoDetalhado[]>([]);
  const [unidadeOpen, setUnidadeOpen] = useState(false);

  const [unidadeId, setUnidadeId] = useState("");
  const [unidadeNome, setUnidadeNome] = useState("");
  const [classeId, setClasseId] = useState("");
  const [classeNome, setClasseNome] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [servicoNome, setServicoNome] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [tipoNome, setTipoNome] = useState("");

  useEffect(() => {
    const carregar = async () => {
      try {
        const listaUnidades = await unidadeCrasService.listar();
        const unidadesAtivas = (listaUnidades || [])
          .filter((unidade: UnidadeCras) => unidade.is_active !== false)
          .map((unidade: UnidadeCras) => ({ id: String(unidade.id), nome: unidade.nome }));

        setUnidades(unidadesAtivas);
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar unidades.");
      }
    };

    carregar();
  }, []);

  const carregarClassesUnidade = async (id: string) => {
    try {
      const lista = await servicoAdminService.listar({ unidade: id });
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
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar classes da unidade.");
      setClasses([]);
    }
  };

  const selecionarUnidade = (id: string, nome: string) => {
    setUnidadeId(id);
    setUnidadeNome(nome);
    setClasseId("");
    setClasseNome("");
    setClasses([]);
    setServicos([]);
    setServicoId("");
    setServicoNome("");
    setTipoId("");
    setTipoNome("");
    if (id) {
      void carregarClassesUnidade(id);
    }
  };

  const carregarServicos = async (id: string, nome: string) => {
    if (!unidadeId) {
      toast.error("Selecione uma unidade.");
      return;
    }
    setClasseId(id);
    setClasseNome(nome);
    setServicos([]);
    setServicoId("");
    setServicoNome("");
    setTipoId("");
    setTipoNome("");

    try {
      const lista = await servicoAdminService.listar({ classe_id: id, unidade: unidadeId });
      const ativos = (lista || []).filter(
        (servico: ServicoDetalhado) => servico.is_active !== false && isPortalSchedulingServiceAllowed(servico.nome || ""),
      );
      setServicos(ativos);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar serviços.");
    }
  };

  const handleAgendar = () => {
    if (!unidadeId || !classeId || !servicoId || !tipoId) return;

    navigate("/agendar/detalhes", {
      state: {
        fromPath: location.pathname,
        unidadeId,
        unidadeNome,
        classeId,
        classeNome,
        tipoId,
        tipoNome,
        servicoId,
        servicoNome,
      },
    });
  };

  return (
    <div className={className}>
      <h1 className="text-4xl font-bold text-center mb-16 text-foreground">Solicitar agendamento</h1>

      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-none shadow-lg p-12">
          <p className="text-center text-lg mb-8 text-foreground">
            Selecione abaixo as opções desejadas da
            <br />
            unidade, classe de serviço e o serviço
          </p>
          <div className="space-y-8">
            {/* Campo Unidade */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <MapPin size={16} className="text-teal-600" /> Unidade de Atendimento
              </label>
              <Popover open={unidadeOpen} onOpenChange={setUnidadeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={unidadeOpen}
                    className="w-full h-14 bg-white border-slate-200 hover:border-teal-500 transition-all text-lg text-slate-900 placeholder:text-slate-400 shadow-sm justify-between"
                  >
                    <span className="truncate">{unidadeNome || "Selecione uma unidade"}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Digite o nome da unidade..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                      <CommandGroup>
                        {unidades.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={u.nome}
                            onSelect={() => {
                              selecionarUnidade(u.id, u.nome);
                              setUnidadeOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${u.id === unidadeId ? "opacity-100" : "opacity-0"}`} />
                            {u.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Campo Classe */}
            <div className={`space-y-2 transition-opacity duration-300 ${!unidadeId ? "opacity-50" : "opacity-100"}`}>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <LayoutGrid size={16} className="text-teal-600" /> Classe do Serviço
              </label>
              <Select
                value={classeId}
                onValueChange={(val) => {
                  const classe = classes.find((t) => t.id === val);
                  void carregarServicos(val, classe?.nome || "");
                }}
                disabled={!unidadeId}
              >
                <SelectTrigger className="w-full h-14 bg-white border-slate-200 hover:border-teal-500 transition-all text-lg text-slate-900 placeholder:text-slate-400 shadow-sm">
                  <SelectValue placeholder="Selecione a classe" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="py-3 cursor-pointer">
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campo ServiÃ§o */}
            <div className={`space-y-2 transition-opacity duration-300 ${!classeId ? "opacity-50" : "opacity-100"}`}>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <ClipboardCheck size={16} className="text-teal-600" /> Serviço Específico
              </label>
              <Select
                value={servicoId}
                onValueChange={(val) => {
                  const serv = servicos.find((s) => String(s.id) === val);
                  setServicoId(val);
                  setServicoNome(serv?.nome || "");
                  const tipo = serv?.tipo_servico;
                  const resolvedTipoId = typeof tipo === "string" ? tipo : tipo?.id;
                  const resolvedTipoNome = typeof tipo === "string" ? "" : tipo?.nome;
                  setTipoId(resolvedTipoId ? String(resolvedTipoId) : "");
                  setTipoNome(resolvedTipoNome || "");
                }}
                disabled={!classeId}
              >
                <SelectTrigger className="w-full h-14 bg-white border-slate-200 hover:border-teal-500 transition-all text-lg text-slate-900 placeholder:text-slate-400 shadow-sm">
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  {servicos.map((s) => (
                    <SelectItem key={String(s.id)} value={String(s.id)} className="py-3 cursor-pointer">
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAgendar}
              disabled={!unidadeId || !classeId || !servicoId || !tipoId}
              className="
    w-full
    h-12 md:h-16
    bg-[#f05a28] hover:bg-orange-600
    text-white font-bold
    text-sm md:text-xl
    mt-4
    shadow-md shadow-orange-200
    transition-all active:scale-[0.98]
    flex gap-2 md:gap-3
    items-center justify-center
  "
            >
              Prosseguir para detalhes
              <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
