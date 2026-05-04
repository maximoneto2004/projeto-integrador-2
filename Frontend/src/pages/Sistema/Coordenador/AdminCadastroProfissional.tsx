import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock } from "lucide-react";
import { useCreateProfissional, useCargosProfissionais } from "@/hooks/sistema/useProfissionais";
import { useCreateEscala } from "@/hooks/sistema/useEscalas";
import { mapEscalaToAPI } from "@/utils/escalaUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useTipoServico } from "@/hooks/sistema/useTipoServico";
import { DIAS_SEMANA } from "@/constants/diasSemana";
import { getApiErrorMessage } from "@/lib/notifications";

type FormErrorField = "nome" | "cpf" | "cargo" | "telefone" | "email" | "servicoAtendenteId" | "escalas";
type FormErrors = Partial<Record<FormErrorField, string>>;
type EscalaForm = {
  dias: string[];
  turno1: { inicio: string; fim: string };
  turno2: { inicio: string; fim: string };
};

const isCargoAtendente = (cargoNome?: string | null) =>
  String(cargoNome || "")
    .trim()
    .toLowerCase() === "atendente";

const API_FIELD_TO_FORM_FIELD: Record<string, FormErrorField> = {
  nome_completo: "nome",
  cpf: "cpf",
  groups: "cargo",
  group: "cargo",
  telefone: "telefone",
  email: "email",
  tipo_ofertados: "servicoAtendenteId",
  dias_semana: "escalas",
  turno1_inicio: "escalas",
  turno1_fim: "escalas",
  turno2_inicio: "escalas",
  turno2_fim: "escalas",
  non_field_errors: "escalas",
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const NOME_MAX_LENGTH = 150;
const CPF_MAX_LENGTH = 11;
const CPF_MASK_MAX_LENGTH = 14;
const TELEFONE_MAX_LENGTH = 15;
const TELEFONE_MASK_MAX_LENGTH = 20;
const EMAIL_MAX_LENGTH = 254;

const formatCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, CPF_MAX_LENGTH);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

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

const extractApiValidation = (err: unknown): FormErrors => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  const body = data as Record<string, unknown>;
  const nestedErrors =
    (body.errors && typeof body.errors === "object" && !Array.isArray(body.errors) ? (body.errors as Record<string, unknown>) : null) ||
    (body.result && typeof body.result === "object" && !Array.isArray(body.result) ? (body.result as Record<string, unknown>) : null);
  const source = nestedErrors ?? body;
  const fieldErrors: FormErrors = {};

  Object.entries(source).forEach(([apiField, rawMessage]) => {
    const message = normalizeErrorMessage(rawMessage);
    if (!message) return;

    const formField = API_FIELD_TO_FORM_FIELD[apiField];
    if (!formField || fieldErrors[formField]) return;
    fieldErrors[formField] = message;
  });

  return fieldErrors;
};

const AdminCadastroProfissional = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutateAsync: criarProfissional } = useCreateProfissional();
  const { mutateAsync: criarEscala } = useCreateEscala();
  const { data: cargos = [], isLoading } = useCargosProfissionais();
  const user = useAuth();

  const { data: servicosDisponiveis = [] } = useTipoServico();
  const tipoDeServicoDisponiveis = useMemo(
    () =>
      servicosDisponiveis
        .map((item) => {
          return { id: String(item.id), nome: item.nome ?? "Serviço" };
        })
        .filter((servico) => servico.nome.trim().toLowerCase() !== "especializado adicional")
        .filter((servico, index, lista) => lista.findIndex((s) => s.id === servico.id) === index),
    [servicosDisponiveis],
  );
  const cargosDisponiveis = useMemo(() => {
    const bloqueados = new Set(["atendente 156", "administrador", "gestor"]);
    return cargos.filter((cargo) => {
      const nome = cargo?.name?.trim().toLowerCase();
      return nome && !bloqueados.has(nome);
    });
  }, [cargos]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    matricula: "",
    cargo: null as number | null,
    telefone: "",
    email: "",
    dataAdmissao: "",
    status: "Ativo" as "Ativo" | "Inativo",
    servicoAtendenteId: "",
    escalas: [
      {
        dias: [] as string[],
        turno1: { inicio: "", fim: "" },
        turno2: { inicio: "", fim: "" },
      },
    ] as EscalaForm[],
  });

  const cargoSelecionado = useMemo(() => cargosDisponiveis.find((cargo) => Number(cargo.id) === formData.cargo), [cargosDisponiveis, formData.cargo]);
  const isAtendenteSelecionado = isCargoAtendente(cargoSelecionado?.name);

  const updateFormValue = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const clearFieldError = (...fields: FormErrorField[]) => {
    setFormErrors((prev) => {
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

  const validateClientFields = (isAtendente: boolean) => {
    const errors: FormErrors = {};

    if (!formData.nome.trim()) errors.nome = "Nome completo é obrigatório.";
    if (!formData.cpf.trim()) errors.cpf = "CPF é obrigatório.";
    if (!formData.cargo) errors.cargo = "Selecione o cargo.";
    if (!formData.telefone.trim()) {
      errors.telefone = "Telefone é obrigatório.";
    } else {
      const telefoneNumerico = onlyDigits(formData.telefone);
      if (telefoneNumerico.length < 10 || telefoneNumerico.length > 15) {
        errors.telefone = "Telefone deve conter entre 10 e 15 dígitos.";
      }
    }
    if (!formData.email.trim()) errors.email = "E-mail é obrigatório.";
    if (isAtendente && !formData.servicoAtendenteId) errors.servicoAtendenteId = "Selecione o tipo de serviço.";
    if (!formData.escalas.length || formData.escalas.some((escala) => escala.dias.length === 0)) {
      errors.escalas = "Selecione ao menos um dia da semana para cada escala.";
      return errors;
    }

    for (let index = 0; index < formData.escalas.length; index += 1) {
      const escala = formData.escalas[index];
      const turno1Inicio = escala.turno1.inicio.trim();
      const turno1Fim = escala.turno1.fim.trim();
      const turno2Inicio = escala.turno2.inicio.trim();
      const turno2Fim = escala.turno2.fim.trim();

      if ((turno1Inicio && !turno1Fim) || (!turno1Inicio && turno1Fim)) {
        errors.escalas = `Preencha início e fim do turno 1 na escala ${index + 1}.`;
        return errors;
      }

      if ((turno2Inicio && !turno2Fim) || (!turno2Inicio && turno2Fim)) {
        errors.escalas = `Preencha início e fim do turno 2 na escala ${index + 1}.`;
        return errors;
      }
    }

    return errors;
  };

  const adicionarEscala = () => {
    clearFieldError("escalas");
    setFormData((prev) => ({
      ...prev,
      escalas: [
        ...prev.escalas,
        {
          dias: [],
          turno1: { inicio: "", fim: "" },
          turno2: { inicio: "", fim: "" },
        },
      ],
    }));
  };

  const removerEscala = (index: number) => {
    clearFieldError("escalas");
    setFormData((prev) => ({
      ...prev,
      escalas: prev.escalas.filter((_, i) => i !== index),
    }));
  };

  const updateEscala = <T extends keyof EscalaForm>(index: number, field: T, value: EscalaForm[T]) => {
    clearFieldError("escalas");
    setFormData((prev) => {
      const novasEscalas = [...prev.escalas];
      novasEscalas[index] = { ...novasEscalas[index], [field]: value };
      return { ...prev, escalas: novasEscalas };
    });
  };

  const toggleDiaSemana = (escalaIndex: number, dia: string) => {
    clearFieldError("escalas");
    const escalaAtual = formData.escalas[escalaIndex];
    const novosDias = escalaAtual.dias.includes(dia) ? escalaAtual.dias.filter((d) => d !== dia) : [...escalaAtual.dias, dia];

    updateEscala(escalaIndex, "dias", novosDias);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const clientErrors = validateClientFields(isAtendenteSelecionado);
    if (Object.keys(clientErrors).length) {
      setFormErrors(clientErrors);
      toast({
        title: "Campos obrigatórios pendentes",
        description: "Revise os campos destacados em vermelho.",
        variant: "destructive",
      });
      return;
    }
    setFormErrors({});

    try {
      const usuario = await criarProfissional({
        payload: {
          nome_completo: formData.nome.trim(),
          cpf: formData.cpf,
          email: formData.email.trim(),
          telefone: onlyDigits(formData.telefone),
          groups: formData.cargo ? [formData.cargo] : [],
          unidades_lotacao: [user.user.unidade_ativa.id],
          tipo_ofertados: formData.servicoAtendenteId ? [formData.servicoAtendenteId] : [],
        },
      });

      const profissionalId = usuario.id;

      for (const escala of formData.escalas) {
        const payload = { ...mapEscalaToAPI(escala, profissionalId), unidade: user.user.unidade_ativa.id };
        await criarEscala({ payload });
      }

      toast({
        title: "Sucesso",
        description: "Profissional cadastrado com sucesso!",
      });

      navigate("/sistema/cadastro-profissionais");
    } catch (err) {
      const fieldErrors = extractApiValidation(err);
      if (Object.keys(fieldErrors).length) {
        setFormErrors((prev) => ({ ...prev, ...fieldErrors }));
        toast({
          title: "Erro de validação",
          description: "Confira os campos destacados em vermelho.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Erro ao cadastrar",
        description: getApiErrorMessage(err, "Verifique os dados e tente novamente."),
        variant: "destructive",
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full ">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="mb-6 flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-3xl font-bold">Cadastrar Profissional</h1>
                <p className="text-muted-foreground">Adicione um novo profissional e configure suas escalas</p>
              </div>
            </div>

            <Card shadow-sm>
              <CardHeader>
                <CardTitle>Dados do Profissional</CardTitle>
                <CardDescription>Preencha os dados do profissional que será cadastrado</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Dados Pessoais */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Dados Pessoais</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="nome">
                          Nome Completo <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="nome"
                          value={formData.nome}
                          maxLength={NOME_MAX_LENGTH}
                          onChange={(e) => {
                            updateFormValue("nome", e.target.value.slice(0, NOME_MAX_LENGTH));
                            clearFieldError("nome");
                          }}
                          placeholder="Nome completo"
                          className={formErrors.nome ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                        {!!formErrors.nome && <p className="text-xs text-destructive">{formErrors.nome}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cpf">
                          CPF <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cpf"
                          value={formatCpf(formData.cpf)}
                          inputMode="numeric"
                          maxLength={CPF_MASK_MAX_LENGTH}
                          onChange={(e) => {
                            const sanitizedCpf = onlyDigits(e.target.value).slice(0, CPF_MAX_LENGTH);
                            updateFormValue("cpf", sanitizedCpf);
                            clearFieldError("cpf");
                          }}
                          placeholder="000.000.000-00"
                          className={formErrors.cpf ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                        {!!formErrors.cpf && <p className="text-xs text-destructive">{formErrors.cpf}</p>}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="cargo">
                          Cargo <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.cargo !== null ? String(formData.cargo) : ""}
                          onValueChange={(value) => {
                            const cargoId = Number(value);
                            const cargoDaSelecao = cargosDisponiveis.find((cargo) => Number(cargo.id) === cargoId);
                            const isAtendente = isCargoAtendente(cargoDaSelecao?.name);
                            setFormData((prev) => ({
                              ...prev,
                              cargo: cargoId,
                              servicoAtendenteId: isAtendente ? prev.servicoAtendenteId : "",
                            }));
                            clearFieldError("cargo", "servicoAtendenteId");
                          }}
                        >
                          <SelectTrigger className={formErrors.cargo ? "border-destructive focus:ring-destructive" : ""}>
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
                        {!!formErrors.cargo && <p className="text-xs text-destructive">{formErrors.cargo}</p>}
                      </div>
                      {isAtendenteSelecionado && (
                        <div className="space-y-2">
                          <Label htmlFor="servico-atendente">
                            Tipo de Serviço <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={formData.servicoAtendenteId}
                            onValueChange={(value) => {
                              updateFormValue("servicoAtendenteId", value);
                              clearFieldError("servicoAtendenteId");
                            }}
                          >
                            <SelectTrigger className={formErrors.servicoAtendenteId ? "border-destructive focus:ring-destructive" : ""}>
                              <SelectValue placeholder="Selecione o tipo de serviço" />
                            </SelectTrigger>
                            <SelectContent>
                              {tipoDeServicoDisponiveis.map((servico) => (
                                <SelectItem key={servico.id} value={servico.id}>
                                  {servico.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!!formErrors.servicoAtendenteId && <p className="text-xs text-destructive">{formErrors.servicoAtendenteId}</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Contato</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="telefone">
                          Telefone <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="telefone"
                          value={formatTelefone(formData.telefone)}
                          inputMode="numeric"
                          maxLength={TELEFONE_MASK_MAX_LENGTH}
                          onChange={(e) => {
                            const sanitizedTelefone = onlyDigits(e.target.value).slice(0, TELEFONE_MAX_LENGTH);
                            updateFormValue("telefone", sanitizedTelefone);
                            clearFieldError("telefone");
                          }}
                          placeholder="(85) 98888-7777"
                          className={formErrors.telefone ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                        {!!formErrors.telefone && <p className="text-xs text-destructive">{formErrors.telefone}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          E-mail <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          maxLength={EMAIL_MAX_LENGTH}
                          onChange={(e) => {
                            const sanitizedEmail = e.target.value.trim().slice(0, EMAIL_MAX_LENGTH);
                            updateFormValue("email", sanitizedEmail);
                            clearFieldError("email");
                          }}
                          placeholder="email@cras.gov.br"
                          className={formErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                        {!!formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO DE ESCALAS (AJUSTADA) */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Registre a escala <span className="text-destructive text-sm font-normal">*</span>
                      </h3>
                      <Button type="button" variant="outline" size="sm" onClick={adicionarEscala} className="gap-2">
                        <Plus className="h-4 w-4" /> Adicionar Escala
                      </Button>
                    </div>
                    {!!formErrors.escalas && <p className="text-xs text-destructive">{formErrors.escalas}</p>}

                    {formData.escalas.map((escala, index) => (
                      <Card key={index} className="relative bg-slate-50/50 border-l-4 border-l-primary">
                        {formData.escalas.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                            onClick={() => removerEscala(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <CardContent className="p-6">
                          <div className="grid md:grid-cols-3 gap-8">
                            {/* Coluna 1: Dias */}
                            <div className="space-y-3">
                              <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Dias da Semana:</Label>
                              <div className="grid gap-2">
                                {DIAS_SEMANA.map((dia) => (
                                  <div key={dia} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`dia-${index}-${dia}`}
                                      checked={escala.dias.includes(dia)}
                                      onCheckedChange={() => toggleDiaSemana(index, dia)}
                                    />
                                    <label htmlFor={`dia-${index}-${dia}`} className="text-sm font-medium cursor-pointer">
                                      {dia}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Colunas 2 e 3: Horários */}
                            <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="font-semibold text-xs">Turno 1 início:</Label>
                                  <Input
                                    type="time"
                                    step="1"
                                    value={escala.turno1.inicio}
                                    onChange={(e) => updateEscala(index, "turno1", { ...escala.turno1, inicio: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="font-semibold text-xs">Turno 1 fim:</Label>
                                  <Input
                                    type="time"
                                    step="1"
                                    value={escala.turno1.fim}
                                    onChange={(e) => updateEscala(index, "turno1", { ...escala.turno1, fim: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="font-semibold text-xs">Turno 2 início:</Label>
                                  <Input
                                    type="time"
                                    step="1"
                                    value={escala.turno2.inicio}
                                    onChange={(e) => updateEscala(index, "turno2", { ...escala.turno2, inicio: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="font-semibold text-xs">Turno 2 fim:</Label>
                                  <Input
                                    type="time"
                                    step="1"
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

                  {/* Contato */}

                  {/* Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/sistema/cadastro-profissionais")}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      Salvar Profissional
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminCadastroProfissional;
