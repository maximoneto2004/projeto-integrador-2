import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/sonner";
import { ArrowLeft, Calendar, Clock, UserPlus } from "lucide-react";
import { format, set } from "date-fns";
import { ptBR } from "date-fns/locale";
import { unidades, categorias, servicos, horariosDisponiveis } from "@/lib/appointmentStore";
import { NovoCidadaoModal } from "@/components/cidadao/NovoCidadaoModal";
import { CidadaoSearchBar } from "@/components/cidadao/CidadaoSearchBar";
import { useCidadaos, type CidadaoInput } from "@/hooks/sistema/useCidadaos";

interface Cidadao {
  id: string;
  nome: string;
  cpf: string;
  telefone?: string;
  email?: string;
  dataNascimento?: string;
  sexo?: string;
  endereco?: string;
  logradouro?: string;
  apelido?: string;
}

interface Agendamento {
  id: string;
  cidadaoNome: string;
  cidadaoCpf: string;
  unidade: string;
  categoria: string;
  servico: string;
  data: string;
  hora: string;
  status: string;
}

// Mock de agendamentos
const agendamentosMock: Agendamento[] = [
  {
    id: "1",
    cidadaoNome: "Maria da Silva",
    cidadaoCpf: "123.456.789-00",
    unidade: "Messejana - Fortaleza",
    categoria: "Auxílio",
    servico: "Auxílio bolsa família",
    data: format(new Date(), "yyyy-MM-dd"),
    hora: "09:00",
    status: "Agendado",
  },
];

export default function AdminAgendarCidadao() {
  const navigate = useNavigate();
  const location = useLocation();
  const cidadaoSelecionado = location.state?.cidadao as Cidadao | undefined;

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(agendamentosMock);
  const [salvando, setSalvando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cidadaoEditando, setCidadaoEditando] = useState<Cidadao | null>(null);
  const { cidadaos, loading, createCidadao, updateCidadao, fetchCidadaos } = useCidadaos();

  // Campos do formulário
  const [cpfBusca, setCpfBusca] = useState(cidadaoSelecionado?.cpf || "");
  const [cidadao, setCidadao] = useState<Cidadao | null>(cidadaoSelecionado || null);
  const [unidade, setUnidade] = useState(unidades[0]);
  const [categoria, setCategoria] = useState("");
  const [servico, setServico] = useState("");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hora, setHora] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const servicosDisponiveis = categoria ? servicos[categoria] || [] : [];

  // Campos do novo cidadão (para o modal)
  const [apelido, setApelido] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState("");
  const [unidadeOrigem, setUnidadeOrigem] = useState(unidades[0] || "");
  const [endereco, setEndereco] = useState("");
  const [enderecoNumero, setenderecoNumero] = useState("");
  const [enderecoComplemento, setEnderecoComplemento] = useState("");
  const [enderecoBairro, setEnderecoBairro] = useState("");
  const [enderecoCep, setEnderecoCep] = useState("");

  const camposObrigatoriosPreenchidos = () => nome.trim() && cpf.trim() && telefone.trim() && dataNascimento && sexo;

  const montarPayload = (): CidadaoInput => ({
    nome: nome.trim(),
    cpf: cpf.trim(),
    apelido: apelido.trim() || null,
    telefone: telefone.trim(),
    email: email.trim() || undefined,
    dataNascimento: dataNascimento || undefined,
    sexo: sexo ? (sexo.toUpperCase() as CidadaoInput["sexo"]) : undefined,
    unidade_origem: unidadeOrigem || undefined,
    logradouro: endereco || undefined,
    numero: enderecoNumero || undefined,
    complemento: enderecoComplemento || null,
    cep: enderecoCep || undefined,
    bairro: enderecoBairro || undefined,
  });
  const handleCadastrar = async () => {
    if (!camposObrigatoriosPreenchidos()) {
      toast.error("Preencha todos os campos obrigatórios");
      return false;
    }

    setSalvando(true);
    try {
      const payload = montarPayload();

      if (cidadaoEditando) {
        await updateCidadao(cidadaoEditando.id, payload);
        toast.success(`Dados de ${nome} atualizados com sucesso!`);
      } else {
        await createCidadao(payload);
        toast.success(`Cidadão ${nome} cadastrado com sucesso!`);
      }

      limparFormulario();
      setMostrarFormulario(false);
      setCidadaoEditando(null);
      setModalAberto(false);
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar o cidadão. Tente novamente.");
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const handleBuscarCidadao = async () => {
    await fetchCidadaos({ cpf: cpfBusca})
  };

  useEffect(() => {
    if (cidadaos.length > 0){
      setCidadao(cidadaos[0]);
      toast.success("Cidadão encontrado!");
    }
    else if (!loading && cpfBusca.replace(/\D/g, "").length === 11) {
      toast.error("Cidadão não encontrado.");
    }
  }, [cidadaos, loading]);

  const handleAgendar = () => {
    if (!cidadao || !categoria || !servico || !hora) {
      toast.error("Preencha todos os campos");
      return;
    }

    const novoAgendamento: Agendamento = {
      id: Date.now().toString(),
      cidadaoNome: cidadao.nome,
      cidadaoCpf: cidadao.cpf,
      unidade,
      categoria,
      servico,
      data,
      hora,
      status: "Agendado",
    };

    setAgendamentos([novoAgendamento, ...agendamentos]);
    toast.success("Agendamento realizado com sucesso!");
    limparFormulario();
  };

  const limparFormulario = () => {
    setCpfBusca("");
    setCidadao(null);
    setCategoria("");
    setServico("");
    setHora("");
    setMostrarFormulario(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      Agendado: "default",
      Finalizado: "secondary",
      Cancelado: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <SidebarProvider>
      <RoleBasedSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">Agendar Horário</h1>
                <p className="text-muted-foreground">Agende atendimentos para cidadãos cadastrados</p>
              </div>
            </div>
            <Button className="gap-2" onClick={() => setModalAberto(true)}>
              <UserPlus className="h-4 w-4" />
              Cadastrar Cidadão
            </Button>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Buscar Cidadão</CardTitle>
              </CardHeader>
              <CardContent>
                <CidadaoSearchBar
                  value={cpfBusca}
                  onChange={setCpfBusca}
                  onSearch={handleBuscarCidadao}
                  placeholder="000.000.000-00"
                  label="CPF do Cidadão"
                  buttonText="Buscar"
                  loading={loading}
                />

                {cidadao && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Cidadão Encontrado:</h3>
                    <p>
                      <strong>Nome:</strong> {cidadao.nome}
                    </p>
                    <p>
                      <strong>CPF:</strong> {cidadao.cpf}
                    </p>
                    <p>
                      <strong>Telefone:</strong> {cidadao.telefone}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {cidadao && (
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Agendamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unidade">Unidade</Label>
                      <Select value={unidade} onValueChange={setUnidade}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {unidades.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="categoria">Categoria *</Label>
                      <Select
                        value={categoria}
                        onValueChange={(value) => {
                          setCategoria(value);
                          setServico("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="servico">Serviço *</Label>
                      <Select value={servico} onValueChange={setServico} disabled={!categoria}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {servicosDisponiveis.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="data">Data *</Label>
                      <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hora">Horário *</Label>
                      <Select value={hora} onValueChange={setHora}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o horário" />
                        </SelectTrigger>
                        <SelectContent>
                          {horariosDisponiveis.map((h) => (
                            <SelectItem key={h} value={h}>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {h}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <Button onClick={handleAgendar}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Confirmar Agendamento
                    </Button>
                    <Button variant="outline" onClick={limparFormulario}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <NovoCidadaoModal
          open={modalAberto}
          onClose={() => {
            setModalAberto(false);
            setMostrarFormulario(false);
          }}
          onSubmit={handleCadastrar}
          cidadaoEditando={!!cidadaoEditando}
          nome={nome}
          apelido={apelido}
          cpf={cpf}
          telefone={telefone}
          email={email}
          dataNascimento={dataNascimento}
          sexo={sexo}
          unidadeOrigem={unidadeOrigem}
          unidadesOrigem={unidades.map((unidadeItem) => ({ value: unidadeItem, label: unidadeItem }))}
          endereco={endereco}
          enderecoNumero={enderecoNumero}
          enderecoComplemento={enderecoComplemento}
          enderecoBairro={enderecoBairro}
          enderecoCep={enderecoCep}
          setNome={setNome}
          setCpf={setCpf}
          setTelefone={setTelefone}
          setEmail={setEmail}
          setDataNascimento={setDataNascimento}
          setSexo={setSexo}
          setUnidadeOrigem={setUnidadeOrigem}
          setEndereco={setEndereco}
          setEnderecoNumero={setenderecoNumero}
          setEnderecoComplemento={setEnderecoComplemento}
          setEnderecoBairro={setEnderecoBairro}
          setEnderecoCep={setEnderecoCep}
          submitting={salvando}
          setApelido={setApelido}
        />
      </div>
    </SidebarProvider>
  );
}
