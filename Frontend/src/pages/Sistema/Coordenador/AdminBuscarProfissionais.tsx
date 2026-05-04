import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CidadaoSearchBar } from "@/components/cidadao/CidadaoSearchBar";
import { useToast } from "@/hooks/use-toast";
import { toast as Toast } from "@/lib/sonner";
import {
  useAtivarProfissional,
  useAtualizarProfissional,
  useCargosProfissionais,
  useDesativarProfissional,
  useProfissionaisPaginados,
} from "@/hooks/sistema/useProfissionais";
import { useCreateEscala, useAtualizarEscala, useRemoverEscala, useEscalas } from "@/hooks/sistema/useEscalas";
import { useTipoServico } from "@/hooks/sistema/useTipoServico";
import { useAuth } from "@/contexts/AuthContext";
import type { Professional } from "@/types/professional";
import type { EscalaApi } from "@/types/escalas";
import { mapEscalaToAPI } from "@/utils/escalaUtils";
import { DIA_BADGE_STYLE_MAP, DIA_LABEL_MAP, DIAS_SEMANA } from "@/constants/diasSemana";
import { getApiErrorMessage } from "@/lib/notifications";
import {
  Eye,
  Pencil,
  Plus,
  User,
  IdCard,
  Briefcase,
  Phone,
  Mail,
  CalendarDays,
  Building,
  CheckCircle2,
  XCircle,
  Settings2,
  Clock,
  Trash2,
} from "lucide-react";

type EscalaForm = {
  id?: string;
  dias: string[];
  turno1: { inicio: string; fim: string };
  turno2: { inicio: string; fim: string };
};

type EditFormErrorField = "nome" | "telefone" | "email" | "servicoIds";
type EditFormErrors = Partial<Record<EditFormErrorField, string>>;

const NOME_MAX_LENGTH = 150;
const TELEFONE_MAX_LENGTH = 15;
const TELEFONE_MASK_MAX_LENGTH = 20;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EDIT_API_FIELD_TO_FORM_FIELD: Record<string, EditFormErrorField> = {
  nome_completo: "nome",
  telefone: "telefone",
  email: "email",
  tipo_ofertados: "servicoIds",
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const normalizeNome = (value: string) => value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, "").slice(0, NOME_MAX_LENGTH);

const normalizeEmail = (value: string) =>
  value
    .replace(/[^\u0020-\u007E]/g, "")
    .replace(/\s+/g, "")
    .slice(0, EMAIL_MAX_LENGTH);

const formatTelefone = (value: string) => {
  const digits = onlyDigits(value).slice(0, TELEFONE_MAX_LENGTH);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const restante = digits.slice(2);

  if (restante.length <= 4) return `(${ddd}) ${restante}`;
  if (restante.length <= 8) return `(${ddd}) ${restante.slice(0, 4)}-${restante.slice(4)}`;
  if (restante.length <= 9) return `(${ddd}) ${restante.slice(0, 5)}-${restante.slice(5)}`;

  return `(${ddd}) ${restante.slice(0, 5)}-${restante.slice(5, 9)} ${restante.slice(9)}`;
};

const normalizeErrorMessage = (value: unknown) => {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const firstText = value.find((item) => typeof item === "string" && item.trim());
    if (typeof firstText === "string") return firstText;
  }
  return null;
};

const extractEditApiValidation = (err: unknown): EditFormErrors => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  const body = data as Record<string, unknown>;
  const nestedErrors =
    (body.errors && typeof body.errors === "object" && !Array.isArray(body.errors) ? (body.errors as Record<string, unknown>) : null) ||
    (body.result && typeof body.result === "object" && !Array.isArray(body.result) ? (body.result as Record<string, unknown>) : null);
  const source = nestedErrors ?? body;
  const fieldErrors: EditFormErrors = {};

  Object.entries(source).forEach(([apiField, rawMessage]) => {
    const message = normalizeErrorMessage(rawMessage);
    if (!message) return;

    const formField = EDIT_API_FIELD_TO_FORM_FIELD[apiField];
    if (!formField || fieldErrors[formField]) return;
    fieldErrors[formField] = message;
  });

  return fieldErrors;
};

const AdminBuscarProfissionais = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isCoordinator = user?.grupos?.includes("coordenador");
  const unidadeId = user?.unidade_ativa?.id ? String(user.unidade_ativa.id) : null;
  const [queryParams, setQueryParams] = useState<{ unidade?: string; nome_completo?: string; cpf?: string } | null>(null);
  const pageSize = 10;
  const [paginaAtual, setPaginaAtual] = useState(1);
  const queryParamsPaginados = useMemo(
    () =>
      queryParams
        ? {
            ...queryParams,
            limit: String(pageSize),
            offset: String((paginaAtual - 1) * pageSize),
          }
        : undefined,
    [pageSize, paginaAtual, queryParams],
  );
  const { data: usuariosPaginados, isLoading } = useProfissionaisPaginados(queryParamsPaginados, Boolean(queryParamsPaginados));
  const usuarios = usuariosPaginados?.items ?? [];
  const atualizarProfissional = useAtualizarProfissional();
  const ativarProfissional = useAtivarProfissional();
  const desativarProfissional = useDesativarProfissional();
  const { mutateAsync: criarEscala } = useCreateEscala();
  const { mutateAsync: atualizarEscala } = useAtualizarEscala();
  const { mutateAsync: removerEscalaApi } = useRemoverEscala();
  const { data: tiposServico = [] } = useTipoServico();
  const { data: cargos = [] } = useCargosProfissionais();

  const [busca, setBusca] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [escalaDialogOpen, setEscalaDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Professional | null>(null);
  const [editFormErrors, setEditFormErrors] = useState<EditFormErrors>({});
  const [editStatusOriginal, setEditStatusOriginal] = useState<Professional["status"] | null>(null);
  const [editCargoId, setEditCargoId] = useState<string>("");
  const [escalaProfessional, setEscalaProfessional] = useState<Professional | null>(null);
  const [editEscalas, setEditEscalas] = useState<EscalaForm[]>([]);
  const [escalaOriginalIds, setEscalaOriginalIds] = useState<string[]>([]);
  const [escalaInicializada, setEscalaInicializada] = useState(false);

  const { data: escalasData = [], isLoading: escalasLoading } = useEscalas(
    escalaProfessional?.id ? { profissional: escalaProfessional.id, unidade: unidadeId ?? undefined } : undefined,
    Boolean(escalaProfessional?.id),
  );

  const servicosAtendente = useMemo(() => tiposServico.map((tipo) => ({ id: String(tipo.id), nome: tipo.nome })), [tiposServico]);
  const cargosDisponiveis = useMemo(() => {
    const bloqueados = new Set(["atendente 156", "administrador", "gestor"]);
    return cargos.filter((cargo) => {
      const nome = cargo?.name?.trim().toLowerCase();
      return nome && !bloqueados.has(nome);
    });
  }, [cargos]);
  const cargoSelecionadoEdit = useMemo(
    () => cargosDisponiveis.find((cargo) => String(cargo.id) === String(editCargoId)),
    [cargosDisponiveis, editCargoId],
  );

  const normalizeUnidades = (unidades: any) => {
    const nomes: string[] = [];
    const ids: string[] = [];

    if (!Array.isArray(unidades)) return { nomes, ids };

    unidades.forEach((unidade) => {
      if (typeof unidade === "string") {
        nomes.push(unidade);
        return;
      }

      if (unidade && typeof unidade === "object") {
        if (typeof unidade.nome === "string") nomes.push(unidade.nome);
        if (unidade.id !== undefined && unidade.id !== null) ids.push(String(unidade.id));
      }
    });

    return { nomes, ids };
  };

  const mapEscalaApiToForm = (escala: EscalaApi): EscalaForm => ({
    id: escala.id,
    dias: escala.dias_semana.map((dia) => DIA_LABEL_MAP[dia] ?? dia),
    turno1: {
      inicio: escala.turno1_inicio ?? "",
      fim: escala.turno1_fim ?? "",
    },
    turno2: {
      inicio: escala.turno2_inicio ?? "",
      fim: escala.turno2_fim ?? "",
    },
  });

  const mapUsuarioToProfessional = (u: any): Professional => {
    const { nomes, ids } = normalizeUnidades(u.unidades);
    return {
      id: u.id,
      nome: u.nome_completo,
      cpf: u.cpf,
      cargo: u.groups[0]?.name ?? "Sem cargo",
      unidades: nomes,
      unidadeIds: ids,
      telefone: u.telefone,
      email: u.email,
      status: u.is_active ? "Ativo" : "Inativo",
      dataAdmissao: u.created_at,
      servico: u.tipos_servico?.map((s: any) => s.nome) ?? [],
      servicoIds: u.tipos_servico?.map((s: any) => String(s.id)) ?? [],
      escalaTrabalho: u.escalaTrabalho ?? u.escalas_trabalho ?? u.escalas ?? [],
    };
  };

  const professionals = useMemo(() => usuarios.map(mapUsuarioToProfessional), [usuarios]);
  const resultados = professionals;
  const totalItens = usuariosPaginados?.count ?? resultados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const paginaInicio = totalItens ? (paginaAtual - 1) * pageSize + 1 : 0;
  const paginaFim = Math.min(paginaAtual * pageSize, totalItens);

  const buildSearchParams = (termo: string) => {
    const limpo = termo.trim();
    if (!/[A-Za-z]/.test(limpo)) {
      return { cpf: limpo };
    }
    return { nome_completo: limpo };
  };

  useEffect(() => {
    if (!isCoordinator || !unidadeId) return;
    if (busca.trim()) return;
    setPaginaAtual(1);
    setQueryParams({ unidade: unidadeId });
    setMostrarLista(true);
  }, [busca, isCoordinator, unidadeId]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) setPaginaAtual(totalPaginas);
  }, [paginaAtual, totalPaginas]);

  useEffect(() => {
    if (!escalaDialogOpen) {
      setEscalaInicializada(false);
      return;
    }
    if (!escalaProfessional?.id || escalaInicializada || escalasLoading) return;

    if (!escalasData.length) {
      setEditEscalas([
        {
          dias: [],
          turno1: { inicio: "", fim: "" },
          turno2: { inicio: "", fim: "" },
        },
      ]);
      setEscalaOriginalIds([]);
      setEscalaInicializada(true);
      return;
    }

    setEditEscalas(escalasData.map(mapEscalaApiToForm));
    setEscalaOriginalIds(escalasData.map((escala) => escala.id));
    setEscalaInicializada(true);
  }, [escalaDialogOpen, escalaProfessional?.id, escalasData, escalaInicializada, escalasLoading]);

  const handleBuscar = () => {
    const termo = busca.trim();
    if (!termo) {
      toast({
        title: "Erro",
        description: "Informe CPF ou nome para buscar.",
        variant: "destructive",
      });
      return;
    }

    setPaginaAtual(1);
    setQueryParams(buildSearchParams(termo));
    setMostrarLista(true);
  };

  const formatEscala = (escala: any) => {
    const dias = (escala.dias_semana ?? []).map((d: string) => DIA_LABEL_MAP[d] ?? d).join(", ");
    const t1 = `${escala.turno1_inicio ?? "--:--"} - ${escala.turno1_fim ?? "--:--"}`;
    const t2 = `${escala.turno2_inicio ?? "--:--"} - ${escala.turno2_fim ?? "--:--"}`;
    return { dias, t1, t2 };
  };

  const handleView = (professional: Professional) => {
    setSelectedProfessional(professional);
    setAdminDialogOpen(false);

    setViewDialogOpen(true);
  };

  const handleEdit = (id: string) => {
    const professional = professionals.find((p) => p.id === id);
    if (!professional) return;

    setEditFormData(professional);
    setEditFormErrors({});
    setEditStatusOriginal(professional.status);
    const cargoMatch = cargosDisponiveis.find((cargo) => cargo?.name?.trim().toLowerCase() === professional.cargo?.trim().toLowerCase());
    setEditCargoId(cargoMatch ? String(cargoMatch.id) : "");
    setEditDialogOpen(true);
  };

  useEffect(() => {
    if (!editDialogOpen || !editFormData || editCargoId) return;
    const cargoMatch = cargosDisponiveis.find((cargo) => cargo?.name?.trim().toLowerCase() === editFormData.cargo?.trim().toLowerCase());
    if (cargoMatch) setEditCargoId(String(cargoMatch.id));
  }, [cargosDisponiveis, editCargoId, editDialogOpen, editFormData]);

  const handleEditEscala = (id: string) => {
    const professional = professionals.find((p) => p.id === id);
    if (!professional) return;

    setEscalaProfessional(professional);
    setEditEscalas([]);
    setEscalaOriginalIds([]);
    setEscalaInicializada(false);
    setEscalaDialogOpen(true);
  };

  const adicionarEscala = () => {
    setEditEscalas((prev) => [
      ...prev,
      {
        dias: [],
        turno1: { inicio: "", fim: "" },
        turno2: { inicio: "", fim: "" },
      },
    ]);
  };

  const removerEscala = (index: number) => {
    setEditEscalas((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEscala = (index: number, field: keyof EscalaForm, value: EscalaForm[keyof EscalaForm]) => {
    setEditEscalas((prev) => {
      const novasEscalas = [...prev];
      novasEscalas[index] = { ...novasEscalas[index], [field]: value };
      return novasEscalas;
    });
  };

  const toggleDiaSemana = (escalaIndex: number, dia: string) => {
    const escalaAtual = editEscalas[escalaIndex];
    if (!escalaAtual) return;
    const novosDias = escalaAtual.dias.includes(dia) ? escalaAtual.dias.filter((d) => d !== dia) : [...escalaAtual.dias, dia];
    updateEscala(escalaIndex, "dias", novosDias);
  };

  const clearEditFieldError = (...fields: EditFormErrorField[]) => {
    setEditFormErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      fields.forEach((field) => {
        if (!next[field]) return;
        delete next[field];
        changed = true;
      });
      return changed ? next : prev;
    });
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;

    const cargoSelecionado = cargosDisponiveis.find((cargo) => String(cargo.id) === String(editCargoId));
    const cargoNome = cargoSelecionado?.name ?? editFormData.cargo ?? "";
    const isAtendente = cargoNome.trim().toLowerCase() === "atendente";
    const servicosSelecionados = editFormData.servicoIds ?? [];
    const nomeNormalizado = normalizeNome(editFormData.nome || "").trim();
    const telefoneNormalizado = onlyDigits(editFormData.telefone || "").slice(0, TELEFONE_MAX_LENGTH);
    const emailNormalizado = normalizeEmail(editFormData.email || "");
    const formErrors: EditFormErrors = {};

    if (!nomeNormalizado) {
      formErrors.nome = "Informe o nome completo.";
    }
    if ((editFormData.telefone || "").trim() && (telefoneNormalizado.length < 10 || telefoneNormalizado.length > TELEFONE_MAX_LENGTH)) {
      formErrors.telefone = "Telefone deve conter entre 10 e 15 dígitos.";
    }
    if (emailNormalizado && !EMAIL_REGEX.test(emailNormalizado)) {
      formErrors.email = "Informe um e-mail válido.";
    }
    if (isAtendente && !servicosSelecionados.length) {
      formErrors.servicoIds = "Selecione o tipo de serviço do atendente.";
    }

    if (Object.keys(formErrors).length) {
      setEditFormErrors(formErrors);
      toast({
        title: "Erro",
        description: "Confira os campos destacados em vermelho.",
        variant: "destructive",
      });
      return;
    }
    setEditFormErrors({});

    try {
      await atualizarProfissional.mutateAsync({
        id: editFormData.id,
        payload: {
          nome_completo: nomeNormalizado,
          telefone: telefoneNormalizado,
          email: emailNormalizado,
          ...(editCargoId ? { groups: [Number(editCargoId)] } : {}),
          ...(isAtendente ? { tipo_ofertados: servicosSelecionados } : {}),
        },
      });

      if (editStatusOriginal && editFormData.status !== editStatusOriginal) {
        if (editFormData.status === "Ativo") {
          await ativarProfissional.mutateAsync(editFormData.id);
        } else {
          await desativarProfissional.mutateAsync(editFormData.id);
        }
      }

      setEditDialogOpen(false);
      setEditFormErrors({});

      toast({
        title: "Sucesso",
        description: "Profissional atualizado com sucesso!",
      });
    } catch (err) {
      const apiFieldErrors = extractEditApiValidation(err);
      if (Object.keys(apiFieldErrors).length) {
        setEditFormErrors((prev) => ({ ...prev, ...apiFieldErrors }));
        toast({
          title: "Erro de validação",
          description: "Confira os campos destacados em vermelho.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Erro ao atualizar",
        description: getApiErrorMessage(err, "Verifique os dados e tente novamente."),
        variant: "destructive",
      });
    }
  };
  const handleSaveEscala = async () => {
    try {
      if (!escalaProfessional) return;

      const escalasIdsAtuais = editEscalas.filter((escala) => escala.id).map((escala) => escala.id as string);
      const escalasParaRemover = escalaOriginalIds.filter((id) => !escalasIdsAtuais.includes(id));

      for (const escalaId of escalasParaRemover) {
        await removerEscalaApi({ id: escalaId });
      }

      for (const escala of editEscalas) {
        const payload = {
          ...mapEscalaToAPI(escala, escalaProfessional.id),
          ...(unidadeId ? { unidade: unidadeId } : {}),
        };

        if (escala.id) {
          await atualizarEscala({ id: escala.id, payload });
        } else {
          await criarEscala({ payload });
        }
      }

      setEscalaDialogOpen(false);

      toast({
        title: "Sucesso",
        description: "Escala atualizada com sucesso!",
      });
    } catch (error) {
      Toast.error(getApiErrorMessage(error, "Erro ao Salvar Escala"));
    }
  };

  const handleToggleStatus = async (professional: Professional) => {
    if (professional.status === "Ativo") {
      await desativarProfissional.mutateAsync(professional.id);
    } else {
      await ativarProfissional.mutateAsync(professional.id);
    }

    toast({
      title: "Status atualizado",
      description: "Status alterado com sucesso!",
    });
  };

  function InfoItem({ icon: Icon, label, value, fallback = "---" }: { icon: any; label: string; value?: React.ReactNode; fallback?: string }) {
    const isEmpty = value === null || value === undefined || (typeof value === "string" && value.trim() === "");

    return (
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-1.5 bg-muted rounded-md text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="text-sm font-medium text-foreground break-words">{isEmpty ? fallback : value}</div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <RoleBasedSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-3xl font-bold">Cadastro e Gerenciamento de Profissionais</h1>
                <p className="text-muted-foreground">Busque profissionais cadastrados no sistema</p>
              </div>
            </div>

            <Button onClick={() => navigate("/sistema/cadastro/profissional")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Profissional
            </Button>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Buscar Profissional</CardTitle>
              </CardHeader>
              <CardContent>
                <CidadaoSearchBar
                  value={busca}
                  onChange={setBusca}
                  onSearch={handleBuscar}
                  placeholder="Buscar por CPF ou nome do profissional..."
                  helperText="Aceita CPF completo ou nome."
                  buttonText="Pesquisar"
                  loading={isLoading}
                />
              </CardContent>
            </Card>

            {resultados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum profissional encontrado.</p>
            ) : (
              <div className="bg-card rounded-2xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="px-6 py-4 text-left font-bold text-foreground">Nome</th>
                        <th className="px-6 py-4 text-left font-bold text-foreground">Cargo</th>
                        <th className="px-6 py-4 text-left font-bold text-foreground">Status</th>
                        <th className="px-6 py-4 text-left font-bold text-foreground">Unidade(s)</th>
                        <th className="px-6 py-4 text-left font-bold text-foreground">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados
                        .filter((item) => item.cargo !== "coordenador")
                        .map((professional, index) => (
                          <tr key={professional.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <td className="px-6 py-4 text-foreground font-medium">{professional.nome}</td>
                            <td className="px-6 py-4 text-foreground">{professional.cargo}</td>
                            <td className="px-6 py-4">
                              <Badge variant={professional.status === "Ativo" ? "default" : "secondary"}>{professional.status}</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {professional.unidades.map((unidade, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {unidade.split(" - ")[0]}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button className="p-2 hover:bg-muted rounded-full" title="Visualizar" onClick={() => handleView(professional)}>
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button className="p-2 hover:bg-muted rounded-full" title="Editar" onClick={() => handleEdit(professional.id)}>
                                  <Pencil className="h-4 w-4 " />
                                </button>
                                <button className="p-2 hover:bg-muted rounded-full" title="Escala" onClick={() => handleEditEscala(professional.id)}>
                                  <Clock className="h-4 w-4" />
                                </button>

                                {/* <button
                                      className="p-2 hover:bg-muted rounded-full"
                                      title={professional.status === "Ativo" ? "Desativar" : "Ativar"}
                                      onClick={() => handleToggleStatus(professional)}
                                    >
                                      {professional.status === "Ativo" ? (
                                        <XCircle className="w-5 h-5 text-destructive" />
                                      ) : (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                                      )}
                                    </button> */}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {resultados.length > 0 && (
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
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="max-w-3xl border-none overflow-y-auto p-0 bg-white rounded-2xl shadow-lg max-h-[90vh]">
              {/* Barra de destaque superior laranja */}
              <div className="bg-[#f05a28] h-1.5 w-full" />

              <div className="p-8">
                <DialogHeader className="mb-6">
                  <div className="flex justify-between items-center">
                    <DialogTitle className="text-2xl font-bold text-[#1A2B3C]">Detalhes do Profissional</DialogTitle>
                  </div>
                </DialogHeader>

                {selectedProfessional && (
                  <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-8">
                    {/* --- SEÇÃO HERO: Destaque Principal --- */}
                    <div className="flex flex-col md:flex-row items-center gap-6 bg-[#F8FAFC] rounded-2xl p-6 border border-slate-100 shadow-sm">
                      <Avatar className="h-28 w-28 border-4 border-white shadow-md">
                        <AvatarFallback className="text-3xl font-bold bg-[#FFF5F2] text-[#f05a28]">
                          {selectedProfessional.nome
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="text-center md:text-left space-y-3 flex-1">
                        <h2 className="text-3xl font-extrabold text-[#1A2B3C] tracking-tight">{selectedProfessional.nome}</h2>

                        <div className="flex items-center justify-center md:justify-start gap-2 text-slate-600">
                          <Briefcase className="h-5 w-5 text-slate-400" />
                          <span className="font-semibold text-lg">{selectedProfessional.cargo}</span>
                        </div>

                        <div className="pt-1">
                          <Badge className="bg-[#f05a28] hover:bg-[#d84a1d] text-white px-4 py-1.5 rounded-full text-sm font-bold gap-2 border-none">
                            <CheckCircle2 className="h-4 w-4" />
                            Ativo
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* --- GRID DE INFORMAÇÕES --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 px-2">
                      {/* Bloco: Dados Pessoais */}
                      <div className="space-y-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <User className="h-4 w-4" /> Dados Pessoais
                        </h3>
                        <div className="space-y-6">
                          <InfoItem icon={IdCard} label="CPF" value={selectedProfessional.cpf} />

                          {selectedProfessional.cargo === "Atendente" && (
                            <InfoItem
                              icon={Settings2}
                              label="Serviços Vinculados"
                              value={selectedProfessional.servico?.length ? selectedProfessional.servico.join(", ") : null}
                              fallback="Nenhum serviço vinculado"
                            />
                          )}
                        </div>
                      </div>

                      {/* Bloco: Contato */}
                      <div className="space-y-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Phone className="h-4 w-4" /> Contato
                        </h3>
                        <div className="space-y-6">
                          <InfoItem icon={Phone} label="Telefone" value={selectedProfessional.telefone} fallback="Não informado" />
                          <InfoItem icon={Mail} label="E-mail" value={selectedProfessional.email} fallback="Não informado" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botão de Fechar no rodapé para manter consistência */}
                <div className="mt-8 flex justify-end">
                  <Button
                    onClick={() => setViewDialogOpen(false)}
                    className="bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold px-10 rounded-xl h-12 transition-all shadow-md"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-2xl border-none overflow-y-auto p-0 bg-white rounded-2xl shadow-lg max-h-[90vh]">
              {/* Barra de destaque superior laranja */}
              <div className="bg-[#f05a28] h-1.5 w-full" />

              <div className="p-8">
                <DialogHeader className="mb-6">
                  <div className="text-left">
                    <DialogTitle className="text-2xl font-bold text-slate-800">Editar Profissional</DialogTitle>
                    <DialogDescription className="text-slate-500 text-sm">Atualize as informações do profissional selecionado.</DialogDescription>
                  </div>
                </DialogHeader>

                {editFormData && (
                  <div className="space-y-6">
                    {/* Nome Completo */}
                    <div className="space-y-2 text-left">
                      <Label className="text-sm font-semibold text-slate-700 ml-1">
                        Nome Completo <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={editFormData.nome}
                        maxLength={NOME_MAX_LENGTH}
                        onChange={(e) => {
                          setEditFormData({ ...editFormData, nome: normalizeNome(e.target.value) });
                          clearEditFieldError("nome");
                        }}
                        placeholder="Nome completo do profissional"
                        className={`rounded-xl h-11 ${editFormErrors.nome ? "border-destructive focus-visible:ring-destructive" : "border-slate-200 focus-visible:ring-[#f05a28]"}`}
                      />
                      {!!editFormErrors.nome && <p className="text-xs text-destructive">{editFormErrors.nome}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* CPF */}
                      <div className="space-y-2 text-left">
                        <Label className="text-sm font-semibold text-slate-700 ml-1">
                          CPF <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={editFormData.cpf}
                          onChange={(e) => setEditFormData({ ...editFormData, cpf: e.target.value })}
                          placeholder="000.000.000-00"
                          disabled
                          className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] h-11 bg-slate-50"
                        />
                      </div>

                      {/* Cargo */}
                      <div className="space-y-2 text-left">
                        <Label className="text-sm font-semibold text-slate-700 ml-1">
                          Cargo <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={editCargoId}
                          onValueChange={(value) => {
                            const cargoId = String(value);
                            const cargoSelecionado = cargosDisponiveis.find((cargo) => String(cargo.id) === cargoId);
                            const isAtendente = cargoSelecionado?.name?.trim().toLowerCase() === "atendente";
                            setEditCargoId(cargoId);
                            setEditFormData({
                              ...editFormData,
                              cargo: cargoSelecionado?.name ?? editFormData.cargo,
                              servicoIds: isAtendente ? (editFormData.servicoIds ?? []) : [],
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cargo" />
                          </SelectTrigger>

                          <SelectContent>
                            {cargosDisponiveis.map((cargo) => (
                              <SelectItem key={cargo.id} value={String(cargo.id)}>
                                {cargo.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Card de Status Ativo */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/80 transition-all hover:bg-slate-50">
                      <div className="space-y-0.5 text-left">
                        <Label htmlFor="status-profissional" className="text-sm font-bold text-slate-700 cursor-pointer">
                          Profissional ativo
                        </Label>
                        <p className="text-xs text-slate-500">Desative para impedir o acesso ao sistema.</p>
                      </div>
                      <Switch
                        id="status-profissional"
                        className="data-[state=checked]:bg-[#f05a28]"
                        checked={editFormData.status === "Ativo"}
                        onCheckedChange={(checked) => setEditFormData({ ...editFormData, status: checked ? "Ativo" : "Inativo" })}
                      />
                    </div>

                    {/* Tipo de Serviço (Condicional) */}
                    {cargoSelecionadoEdit?.name?.trim().toLowerCase() === "atendente" && (
                      <div className="space-y-2 text-left">
                        <Label className="text-sm font-semibold text-slate-700 ml-1">
                          Tipo de Serviço <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={editFormData.servicoIds?.[0] ?? ""}
                          onValueChange={(value) => {
                            clearEditFieldError("servicoIds");
                            setEditFormData({
                              ...editFormData,
                              servicoIds: value ? [value] : [],
                            });
                          }}
                        >
                          <SelectTrigger
                            className={`rounded-xl h-11 ${editFormErrors.servicoIds ? "border-destructive focus:ring-destructive" : "border-slate-200 focus:ring-[#f05a28]"}`}
                          >
                            <SelectValue placeholder="Selecione o tipo de serviço" />
                          </SelectTrigger>
                          <SelectContent>
                            {servicosAtendente.map((servico) => (
                              <SelectItem key={servico.id} value={servico.id}>
                                {servico.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!!editFormErrors.servicoIds && <p className="text-xs text-destructive">{editFormErrors.servicoIds}</p>}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {/* Telefone */}
                      <div className="space-y-2 text-left">
                        <Label className="text-sm font-semibold text-slate-700 ml-1">Telefone</Label>
                        <Input
                          value={formatTelefone(editFormData.telefone || "")}
                          inputMode="numeric"
                          maxLength={TELEFONE_MASK_MAX_LENGTH}
                          onChange={(e) => {
                            setEditFormData({ ...editFormData, telefone: onlyDigits(e.target.value).slice(0, TELEFONE_MAX_LENGTH) });
                            clearEditFieldError("telefone");
                          }}
                          placeholder="(00) 00000-0000"
                          className={`rounded-xl h-11 ${editFormErrors.telefone ? "border-destructive focus-visible:ring-destructive" : "border-slate-200 focus-visible:ring-[#f05a28]"}`}
                        />
                        {!!editFormErrors.telefone && <p className="text-xs text-destructive">{editFormErrors.telefone}</p>}
                      </div>

                      {/* E-mail */}
                      <div className="space-y-2 text-left">
                        <Label className="text-sm font-semibold text-slate-700 ml-1">E-mail</Label>
                        <Input
                          value={editFormData.email}
                          maxLength={EMAIL_MAX_LENGTH}
                          onChange={(e) => {
                            setEditFormData({ ...editFormData, email: normalizeEmail(e.target.value) });
                            clearEditFieldError("email");
                          }}
                          placeholder="email@exemplo.com"
                          className={`rounded-xl h-11 ${editFormErrors.email ? "border-destructive focus-visible:ring-destructive" : "border-slate-200 focus-visible:ring-[#f05a28]"}`}
                        />
                        {!!editFormErrors.email && <p className="text-xs text-destructive">{editFormErrors.email}</p>}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <DialogFooter className="mt-8 flex flex-row gap-3 sm:justify-end">
                      <Button
                        variant="ghost"
                        className="flex-1 sm:flex-none text-slate-500 font-medium hover:bg-slate-100 rounded-xl px-6 h-11"
                        onClick={() => setEditDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        className="flex-1 sm:flex-none bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold px-8 rounded-xl h-11 transition-all shadow-md shadow-orange-100"
                        onClick={handleSaveEdit}
                      >
                        Salvar Alterações
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={escalaDialogOpen} onOpenChange={setEscalaDialogOpen}>
            <DialogContent className="max-w-3xl border-none overflow-y-auto p-0 bg-white rounded-2xl shadow-lg max-h-[90vh]">
              {/* Barra de destaque superior laranja */}
              <div className="bg-[#f05a28] h-1.5 w-full" />

              <div className="p-8">
                <DialogHeader className="mb-6">
                  <div className="flex items-center gap-4">
                    {/* Ícone com fundo laranja suave */}
                    <div className="bg-orange-100 p-3 rounded-full">
                      <Clock className="w-6 h-6 text-[#f05a28]" />
                    </div>
                    <div className="text-left">
                      <DialogTitle className="text-2xl font-bold text-slate-800">Editar Escala</DialogTitle>
                      <DialogDescription className="text-slate-500 text-sm">
                        Ajuste a escala de {escalaProfessional?.nome ?? "profissional"}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Subtítulo e Botão de Adicionar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      Registre a escala <span className="text-destructive font-normal">*</span>
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={adicionarEscala}
                      className="rounded-xl border-orange-200 text-[#f05a28] hover:bg-orange-50 hover:text-[#f05a28] gap-2 font-semibold"
                    >
                      <Plus className="h-4 w-4" /> Adicionar Escala
                    </Button>
                  </div>

                  {/* Lista de Escalas em Cards */}
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {editEscalas.map((escala, index) => (
                      <Card
                        key={escala.id ?? index}
                        className="relative bg-[#F8FAFC] border border-slate-100 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md"
                      >
                        {/* Indicador lateral sutil em vez de borda grossa, para um look mais clean */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-200" />

                        {editEscalas.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 right-3 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
                            onClick={() => removerEscala(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        <CardContent className="p-6">
                          <div className="grid md:grid-cols-3 gap-8">
                            {/* Coluna: Dias da Semana */}
                            <div className="space-y-4">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Dias da Semana</Label>
                              <div className="grid gap-3">
                                {DIAS_SEMANA.map((dia) => (
                                  <div key={dia} className="flex items-center space-x-3 group">
                                    <Checkbox
                                      id={`dia-escala-${index}-${dia}`}
                                      checked={escala.dias.includes(dia)}
                                      onCheckedChange={() => toggleDiaSemana(index, dia)}
                                      className="w-5 h-5 rounded-full border-slate-300 data-[state=checked]:bg-[#f05a28] data-[state=checked]:border-[#f05a28]"
                                    />
                                    <label
                                      htmlFor={`dia-escala-${index}-${dia}`}
                                      className="text-sm font-semibold text-slate-700 cursor-pointer group-hover:text-[#f05a28] transition-colors"
                                    >
                                      {dia}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Colunas: Turnos */}
                            <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="font-bold text-xs text-slate-600 ml-1">Turno 1 - Início</Label>
                                  <Input
                                    type="time"
                                    step="1"
                                    className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] h-11 bg-white"
                                    value={escala.turno1.inicio}
                                    onChange={(e) => updateEscala(index, "turno1", { ...escala.turno1, inicio: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="font-bold text-xs text-slate-600 ml-1">Turno 1 - Fim</Label>
                                  <Input
                                    type="time"
                                    step="1"
                                    className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] h-11 bg-white"
                                    value={escala.turno1.fim}
                                    onChange={(e) => updateEscala(index, "turno1", { ...escala.turno1, fim: e.target.value })}
                                  />
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="font-bold text-xs text-slate-600 ml-1">Turno 2 - Início</Label>
                                  <Input
                                    type="time"
                                    step="1"
                                    className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] h-11 bg-white"
                                    value={escala.turno2.inicio}
                                    onChange={(e) => updateEscala(index, "turno2", { ...escala.turno2, inicio: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="font-bold text-xs text-slate-600 ml-1">Turno 2 - Fim</Label>
                                  <Input
                                    type="time"
                                    step="1"
                                    className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] h-11 bg-white"
                                    value={escala.turno2.fim}
                                    onChange={(e) => updateEscala(index, "turno2", { ...escala.turno2, fim: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Footer com Botões Padronizados */}
                <DialogFooter className="mt-8 flex flex-row gap-3 sm:justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => setEscalaDialogOpen(false)}
                    className="flex-1 sm:flex-none text-slate-500 font-medium hover:bg-slate-100 rounded-xl px-6 h-11"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveEscala}
                    className="flex-1 sm:flex-none bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold px-8 rounded-xl h-11 transition-all shadow-md shadow-orange-100"
                  >
                    Salvar Alterações
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminBuscarProfissionais;
