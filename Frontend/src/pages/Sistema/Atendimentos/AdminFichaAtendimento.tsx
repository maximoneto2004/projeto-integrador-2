import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/sonner";
import { fichaAtendimentoStore } from "@/lib/fichaAtendimentoStore";
import type { ComposicaoFamiliarItem, FichaAtendimento, OrigemAtendimento, TelefoneTipo } from "@/types/fichaAtendimento";
import { appointmentStore } from "@/lib/appointmentStore";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  History,
  NotebookPen,
  Plus,
  Save,
} from "lucide-react";

import {
  User,
  MapPin,
  IdCard,
  Phone,
  Mail,
  Home,
  Hash,
  Building2,
  Calendar
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

type FichaFormState = Omit<FichaAtendimento, "createdAt" | "updatedAt">;

const orgaoBaseOptions = [
  "CRAS",
  "CREAS",
  "Conselho Tutelar",
  "Unidade de Saúde",
  "Hospital",
  "Escola",
  "Outros"
];

const beneficiosBaseOptions = ["Bolsa Família", "BPC", "PETI"];
const criarLinha = (ordem: number): ComposicaoFamiliarItem => ({
  id: `linha-${ordem}-${Date.now()}`,
  ordem,
  nome: "",
  parentesco: "",
  beneficio: "",
  dataNascimento: "",
  escolaridade: "",
  ocupacao: "",
  renda: "",
});

export default function AdminFichaAtendimento() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get("id") || "";
  const cpfParam = searchParams.get("cpf") || "";
  const [orgaoOptions, setOrgaoOptions] = useState<string[]>(orgaoBaseOptions);
  const [beneficiosOptions, setBeneficiosOptions] = useState<string[]>(beneficiosBaseOptions);
  const [beneficioSelectOpen, setBeneficioSelectOpen] = useState(false);

  const [fichaAtual, setFichaAtual] = useState<FichaAtendimento | null>(null);

  const [form, setForm] = useState<FichaFormState>(() =>
    fichaAtendimentoStore.criarModeloVazio(),
  );
  const [activeMembroId, setActiveMembroId] = useState<string>("");
  const [adicionandoMembro, setAdicionandoMembro] = useState(false);

  // Form “do accordion” (um por vez, igual ao seu ComposicaoFamiliar)
  const [membroForm, setMembroForm] = useState<ComposicaoFamiliarItem>(() => criarLinha(1));

  const resetMembroForm = () => setMembroForm(criarLinha((form.composicaoFamiliar?.length || 0) + 1));

  useEffect(() => {
    if (!activeMembroId) return;

    const membro = (form.composicaoFamiliar || []).find((m) => m.id === activeMembroId);
    if (!membro) return;

    setMembroForm(membro);
  }, [activeMembroId, form.composicaoFamiliar]);


  const salvarMembroAccordion = () => {
    // ajuste de validação como quiser
    if (!membroForm.nome?.trim()) {
      toast.error("Informe o nome do membro.");
      return;
    }

    setForm((prev) => {
      const lista = prev.composicaoFamiliar || [];
      const exists = lista.some((m) => m.id === membroForm.id);

      if (exists) {
        return {
          ...prev,
          composicaoFamiliar: lista.map((m) => (m.id === membroForm.id ? { ...membroForm } : m)),
        };
      }
      const ordem = lista.length + 1;
      const novo = { ...membroForm, ordem, id: membroForm.id || `linha-${ordem}-${Date.now()}` };

      return {
        ...prev,
        composicaoFamiliar: [...lista, novo],
      };
    });

    // fecha estados
    setAdicionandoMembro(false);
    setActiveMembroId("");
    resetMembroForm();
    toast.success("Membro salvo na composição familiar.");
  };
  const iniciarNovoMembro = () => {
    setActiveMembroId("");
    setAdicionandoMembro(true);
    setMembroForm(criarLinha((form.composicaoFamiliar?.length || 0) + 1));
  };

  useEffect(() => {
    const resgatada = fichaAtendimentoStore.getByAppointmentOrCpf(appointmentId, cpfParam);
    if (resgatada) {
      setFichaAtual(resgatada);
      setForm({ ...resgatada });
      return;
    }

    const appointment = appointmentStore.getAppointmentById(appointmentId);
    setForm((prev) => ({
      ...prev,
      appointmentId: appointmentId || undefined,
      cras: appointment?.unidade || prev.cras,
      responsavelNome: appointment?.nomeCidadao || prev.nome,
      cpfResponsavel: cpfParam || appointment?.cpfCidadao || prev.cpf,
      cpf: cpfParam || appointment?.cpfCidadao || prev.cpf,
      telefone: appointment?.telefoneCidadao || prev.telefone,
      composicaoFamiliar: prev.composicaoFamiliar?.length
        ? prev.composicaoFamiliar
        : Array.from({ length: 5 }).map((_, idx) => criarLinha(idx + 1)),
    }));
  }, [appointmentId, cpfParam]);

  const targetCpf = (form.cpf || cpfParam || "").replace(/\D/g, "");

  const handleChange = <K extends keyof FichaFormState>(field: K, value: FichaFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleBeneficio = (beneficio: string, checked: boolean) => {
    setForm((prev) => {
      const atual = prev.beneficios ?? [];
      return {
        ...prev,
        beneficios: checked ? [...atual, beneficio] : atual.filter((i) => i !== beneficio),
      };
    });
  };
  const limparLinhasVazias = (linhas: ComposicaoFamiliarItem[]) =>
    linhas.filter(
      (l) =>
        l.nome ||
        l.parentesco ||
        l.beneficio ||
        l.dataNascimento ||
        l.escolaridade ||
        l.ocupacao ||
        l.renda,
    );

  const handleSalvar = () => {
    if (!form.nome) {
      toast.error("Informe o nome do(a) responsavel.");
      return;
    }

    const composicaoLimpa = limparLinhasVazias(form.composicaoFamiliar || []).map(
      (linha, idx) => ({ ...linha, ordem: idx + 1 }),
    );

    const fichaParaSalvar: FichaAtendimento = {
      ...(form as FichaAtendimento),
      id: form.id || fichaAtual?.id || `ficha-${Date.now()}`,
      appointmentId: appointmentId || form.appointmentId,
      participacoes: form.participacoes || [],
      composicaoFamiliar: composicaoLimpa,
      createdAt: fichaAtual?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const salva = fichaAtendimentoStore.salvarFicha(fichaParaSalvar);
    setFichaAtual(salva);
    setForm({ ...salva });
    toast.success("Ficha salva com sucesso.");
  };

  const handleEncaminhamento = () => {
    if (!targetCpf) {
      toast.error("Informe o CPF para acessar o encaminhamento.");
      return;
    }
    navigate(`/sistema/encaminhamento-prontuario?cpf=${targetCpf}`);
  };

  const handleHistorico = () => {
    if (!targetCpf) {
      toast.error("Informe o CPF para acessar o histórico.");
      return;
    }
    navigate(`/sistema/historico-prontuario?cpf=${targetCpf}`);
  };
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-white flex items-center px-6 gap-4 sticky top-0 z-10">
            <SidebarTrigger />
            <p className="text-lg font-semibold text-slate-800">Ficha de Atendimento Familiar</p>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-6">

              {/* BOTÕES DE AÇÃO - Responsividade ajustada */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <Button variant="outline" onClick={() => navigate("/sistema/agendamentos")} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>

                <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                  <Button variant="outline" onClick={handleEncaminhamento} className="flex-1 sm:flex-none gap-2">
                    <FileText className="h-4 w-4" />
                    Encaminhamento
                  </Button>
                  <Button variant="outline" onClick={handleHistorico} className="flex-1 sm:flex-none gap-2">
                    <History className="h-4 w-4" />
                    Histórico
                  </Button>
                  <Button onClick={handleSalvar} className="w-full sm:w-auto gap-2 bg-primary">
                    <Save className="h-4 w-4" />
                    Salvar ficha
                  </Button>
                </div>
              </div>

              {/* CARD 1: IDENTIFICAÇÃO (DESIGN REFEITO) */}
              <Card className="overflow-hidden border-none shadow-sm ring-1 ring-slate-200">
                <div className="bg-primary/5 border-b px-6 py-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Identificação da Família e Unidade
                  </CardTitle>
                </div>
                <CardContent className="p-6">
                  {/* Grid que vira 1 coluna no mobile para não cobrir texto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Unidade de Atendimento (CRAS)</Label>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{form.cras || "NÃO INFORMADO"}</p>
                          <p className="text-xs text-slate-500">Unidade Vinculada</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Nº de Inscrição da Família</Label>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Hash className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-mono font-bold text-slate-900">{form.numeroInscricao || "---"}</p>
                          <p className="text-xs text-slate-500">Código Automático</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 2: FORMA DE INGRESSO */}
              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    1. Forma de ingresso na unidade e motivo do primeiro atendimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Forma de ingresso *</Label>
                    <Select
                      value={form.formaIngresso ?? ""}
                      onValueChange={(value) => setForm({ ...form, formaIngresso: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma opção" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Demanda espontânea">Demanda espontânea</SelectItem>
                        <SelectItem value="Busca ativa da equipe">Busca ativa da equipe</SelectItem>
                        <SelectItem value="PSB">Encaminhamento Proteção Social Básica</SelectItem>
                        <SelectItem value="PSE">Encaminhamento Proteção Social Especial</SelectItem>
                        <SelectItem value="Saúde">Encaminhamento pela Saúde</SelectItem>
                        <SelectItem value="Educação">Encaminhamento pela Educação</SelectItem>
                        <SelectItem value="Outras políticas">Outras políticas setoriais</SelectItem>
                        <SelectItem value="Conselho Tutelar">Conselho Tutelar</SelectItem>
                        <SelectItem value="Poder Judiciário">Poder Judiciário</SelectItem>
                        <SelectItem value="SGD">Sistema de Garantia de Direitos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50/50 rounded-xl border border-dashed">
                    <div className="space-y-2">
                      <Label>Órgão/Unidade</Label>
                      <Select
                        value={form.orgaoEncaminhou ?? ""}
                        onValueChange={(v) => setForm({ ...form, orgaoEncaminhou: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {orgaoOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Contato</Label>
                      <Input
                        value={form.contatoOrgao ?? ""}
                        onChange={(e) => setForm({ ...form, contatoOrgao: e.target.value })}
                        placeholder="Telefone ou e-mail"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nº Prontuário SUAS</Label>
                      <Input
                        value={form.numeroProntuarioSuas || ""}
                        onChange={(e) => handleChange("numeroProntuarioSuas", e.target.value)}
                        placeholder="PR-0000"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>


              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    2. Identificação do(a) responsável
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4">
                  <div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label>Nome Completo *</Label>
                        <Input
                          value={form.nome}
                          onChange={(e) => setForm({ ...form, nome: e.target.value })}
                          placeholder="Nome completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Apelido (caso seja relevante)</Label>
                        <Input
                          value={form.apelido ?? ""}
                          onChange={(e) => setForm({ ...form, apelido: e.target.value })}
                          placeholder="Apelido"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Nome da Mãe</Label>
                        <Input
                          value={form.nomeMae}
                          onChange={(e) => setForm({ ...form, nomeMae: e.target.value })}
                          placeholder="Nome da mãe"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Sexo *</Label>
                        <Select
                          value={form.sexo}
                          onValueChange={(value) => setForm({ ...form, sexo: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Masculino">Masculino</SelectItem>
                            <SelectItem value="Feminino">Feminino</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Data de Nascimento *</Label>
                        <Input
                          type="date"
                          value={form.dataNascimento}
                          onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>NIS</Label>
                        <Input
                          value={form.nis}
                          onChange={(e) => setForm({ ...form, nis: e.target.value })}
                          placeholder="00000000000"
                          maxLength={11}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>CPF *</Label>
                        <Input
                          value={form.cpf}
                          onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                          placeholder="000.000.000-00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>RG</Label>
                        <Input
                          value={form.rg}
                          onChange={(e) => setForm({ ...form, rg: e.target.value })}
                          placeholder="000000000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Órgão Emissor</Label>
                        <Input
                          value={form.rgOrgao}
                          onChange={(e) => setForm({ ...form, rgOrgao: e.target.value })}
                          placeholder="SSP"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>UF do RG</Label>
                        <Input
                          value={form.rgUf}
                          onChange={(e) => setForm({ ...form, rgUf: e.target.value })}
                          placeholder="CE"
                          maxLength={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Data de Emissão RG</Label>
                        <Input
                          type="date"
                          value={form.rgDataEmissao}
                          onChange={(e) => setForm({ ...form, rgDataEmissao: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input
                          value={form.telefone}
                          onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                          placeholder="(00) 00000-0000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                    </div>
                  </div>

                  <br />

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Endereço da Família</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label>Endereço (Rua, Av.)</Label>
                        <Input
                          value={form.enderecoRua}
                          onChange={(e) => setForm({ ...form, enderecoRua: e.target.value })}
                          placeholder="Nome da rua ou avenida"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Número</Label>
                        <Input
                          value={form.enderecoNumero}
                          onChange={(e) => setForm({ ...form, enderecoNumero: e.target.value })}
                          placeholder="Número"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Complemento</Label>
                        <Input
                          value={form.enderecoComplemento}
                          onChange={(e) => setForm({ ...form, enderecoComplemento: e.target.value })}
                          placeholder="Casa, Apto, etc."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Bairro</Label>
                        <Input
                          value={form.enderecoBairro}
                          onChange={(e) => setForm({ ...form, enderecoBairro: e.target.value })}
                          placeholder="Bairro"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Município</Label>
                        <Input
                          value={form.enderecoMunicipio}
                          onChange={(e) => setForm({ ...form, enderecoMunicipio: e.target.value })}
                          placeholder="Município"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>UF</Label>
                        <Input
                          value={form.enderecoUf}
                          onChange={(e) => setForm({ ...form, enderecoUf: e.target.value })}
                          placeholder="CE"
                          maxLength={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>CEP</Label>
                        <Input
                          value={form.enderecoCep}
                          onChange={(e) => setForm({ ...form, enderecoCep: e.target.value })}
                          placeholder="00000-000"
                        />
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label>Ponto de Referência</Label>
                        <Input
                          value={form.enderecoPontoReferencia}
                          onChange={(e) => setForm({ ...form, enderecoPontoReferencia: e.target.value })}
                          placeholder="Ponto de referência próximo"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Localização do Domicílio</Label>
                        <Select
                          value={form.enderecoLocalizacao}
                          onValueChange={(value: "Urbano" | "Rural") => setForm({ ...form, enderecoLocalizacao: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Urbano">Urbano</SelectItem>
                            <SelectItem value="Rural">Rural</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 flex items-end">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="abrigo"
                            checked={form.enderecoAbrigo}
                            onCheckedChange={(checked) => setForm({ ...form, enderecoAbrigo: checked as boolean })}
                          />
                          <Label htmlFor="abrigo" className="cursor-pointer">
                            Endereço é de um Abrigo
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ... outros campos seguindo grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 */}
                </CardContent>
              </Card>


              <Card className="shadow-sm border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    3. Composição familiar
                  </CardTitle>

                  <Button variant="outline" size="sm" onClick={iniciarNovoMembro} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo membro
                  </Button>
                </CardHeader>

                <CardContent className="space-y-4">
                  {adicionandoMembro && (
                    <div className="rounded-md border p-4 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 space-y-2">
                          <Label>Nome</Label>
                          <Input value={membroForm.nome} onChange={(e) => setMembroForm({ ...membroForm, nome: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                          <Label>Parentesco</Label>
                          <Input
                            value={membroForm.parentesco}
                            onChange={(e) => setMembroForm({ ...membroForm, parentesco: e.target.value })}
                          />
                        </div>

                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-2">
                            <Label>
                              Benefícios Sociais Recebidos pela Família
                            </Label>
                            <Button
                              variant="link"
                              className="p-0 h-auto text-sm font-normal"
                              onClick={() => setBeneficioModalOpen(true)}
                            >
                              Não achou o benefício? Cadastre
                            </Button>
                          </div>

                          <Popover open={beneficioSelectOpen} onOpenChange={setBeneficioSelectOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-between">
                                <span className="truncate">
                                  {form.beneficios?.length
                                    ? form.beneficios.join(", ")
                                    : "Selecione um ou mais benefícios"}
                                </span>
                                {form.beneficios?.length ? (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {form.beneficios.length} selecionado(s)
                                  </span>
                                ) : null}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[360px] p-3" align="start">
                              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                                {beneficiosOptions.map((beneficio) => (
                                  <label key={beneficio} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      className="h-5 w-5 rounded-[3px]"
                                      checked={form.beneficios?.includes(beneficio)}
                                      onCheckedChange={(checked) => handleToggleBeneficio(beneficio, Boolean(checked))}
                                    />
                                    <span className="text-sm">{beneficio}</span>
                                  </label>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>


                        </div>

                        <div className="space-y-2">
                          <Label>Data de nascimento</Label>
                          <Input
                            type="date"
                            value={membroForm.dataNascimento}
                            onChange={(e) => setMembroForm({ ...membroForm, dataNascimento: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Escolaridade</Label>
                          <Input
                            value={membroForm.escolaridade}
                            onChange={(e) => setMembroForm({ ...membroForm, escolaridade: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Ocupação</Label>
                          <Input
                            value={membroForm.ocupacao}
                            onChange={(e) => setMembroForm({ ...membroForm, ocupacao: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Renda</Label>
                          <Input
                            value={membroForm.renda}
                            onChange={(e) => setMembroForm({ ...membroForm, renda: e.target.value })}
                            placeholder="R$"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAdicionandoMembro(false);
                            resetMembroForm();
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button onClick={salvarMembroAccordion}>Adicionar</Button>
                      </div>
                    </div>
                  )}

                  <Accordion.Root
                    type="single"
                    collapsible
                    value={activeMembroId}
                    onValueChange={(v) => {
                      setAdicionandoMembro(false);
                      setActiveMembroId(v);
                    }}
                    className="w-full"
                  >
                    {(form.composicaoFamiliar || []).map((m) => (
                      <Accordion.Item key={m.id} value={m.id} className="border-b">
                        <Accordion.Header>
                          <Accordion.Trigger className="w-full flex items-center justify-between py-3 text-left">
                            <div className="flex flex-col">
                              <span className="font-medium">{m.nome || "Sem nome"}</span>
                              <span className="text-xs text-muted-foreground">
                                {m.parentesco || "-"} • Benefício: {m.beneficio || "-"}
                              </span>
                            </div>
                            <ChevronDown className="w-4 h-4" />
                          </Accordion.Trigger>
                        </Accordion.Header>

                        <Accordion.Content className="pb-4">
                          {activeMembroId === m.id && (
                            <div className="rounded-md border p-4 space-y-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 space-y-2">
                                  <Label>Nome</Label>
                                  <Input
                                    value={membroForm.nome}
                                    onChange={(e) => setMembroForm({ ...membroForm, nome: e.target.value })}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Parentesco</Label>
                                  <Input
                                    value={membroForm.parentesco}
                                    onChange={(e) => setMembroForm({ ...membroForm, parentesco: e.target.value })}
                                  />
                                </div>

                                <div className="mt-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <Label>
                                      Benefícios Sociais Recebidos pela Família
                                    </Label>
                                    <Button
                                      variant="link"
                                      className="p-0 h-auto text-sm font-normal"
                                      onClick={() => setBeneficioModalOpen(true)}
                                    >
                                      Não achou o benefício? Cadastre
                                    </Button>
                                  </div>

                                  <Popover open={beneficioSelectOpen} onOpenChange={setBeneficioSelectOpen}>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full justify-between">
                                        <span className="truncate">
                                          {form.beneficios?.length
                                            ? form.beneficios.join(", ")
                                            : "Selecione um ou mais benefícios"}
                                        </span>
                                        {form.beneficios?.length ? (
                                          <span className="text-xs text-muted-foreground ml-2">
                                            {form.beneficios.length} selecionado(s)
                                          </span>
                                        ) : null}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[360px] p-3" align="start">
                                      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                                        {beneficiosOptions.map((beneficio) => (
                                          <label key={beneficio} className="flex items-center gap-2 cursor-pointer">
                                            <Checkbox
                                              className="h-5 w-5 rounded-[3px]"
                                              checked={form.beneficios?.includes(beneficio)}
                                              onCheckedChange={(checked) => handleToggleBeneficio(beneficio, Boolean(checked))}
                                            />
                                            <span className="text-sm">{beneficio}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>


                                </div>

                                <div className="space-y-2">
                                  <Label>Data de nascimento</Label>
                                  <Input
                                    type="date"
                                    value={membroForm.dataNascimento}
                                    onChange={(e) => setMembroForm({ ...membroForm, dataNascimento: e.target.value })}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Escolaridade</Label>
                                  <Input
                                    value={membroForm.escolaridade}
                                    onChange={(e) => setMembroForm({ ...membroForm, escolaridade: e.target.value })}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Ocupação</Label>
                                  <Input
                                    value={membroForm.ocupacao}
                                    onChange={(e) => setMembroForm({ ...membroForm, ocupacao: e.target.value })}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Renda</Label>
                                  <Input
                                    value={membroForm.renda}
                                    onChange={(e) => setMembroForm({ ...membroForm, renda: e.target.value })}
                                    placeholder="R$"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setActiveMembroId("");
                                    resetMembroForm();
                                  }}
                                >
                                  Fechar
                                </Button>
                                <Button onClick={salvarMembroAccordion}>Salvar alterações</Button>
                              </div>
                            </div>
                          )}
                        </Accordion.Content>
                      </Accordion.Item>
                    ))}

                    {(form.composicaoFamiliar || []).length === 0 && (
                      <p className="text-sm text-muted-foreground py-2">
                        Nenhum membro cadastrado ainda.
                      </p>
                    )}
                  </Accordion.Root>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    4. Demanda apresentada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    rows={5}
                    placeholder="Descreva a demanda relatada pela família"
                    value={form.demandaApresentada || ""}
                    onChange={(e) => handleChange("demandaApresentada", e.target.value)}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    5. Observações e evolução dos atendimentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    rows={6}
                    placeholder="Use este campo para registrar evoluções, datas e assinaturas."
                    value={form.observacoes || ""}
                    onChange={(e) => handleChange("observacoes", e.target.value)}
                  />
                </CardContent>
              </Card>

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
