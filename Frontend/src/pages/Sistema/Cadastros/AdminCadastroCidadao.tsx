import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/sonner";
import { Plus, Pencil, Calendar, Eye, Clock } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NovoCidadaoModal } from "@/components/cidadao/NovoCidadaoModal";
import { CidadaoSearchBar } from "@/components/cidadao/CidadaoSearchBar";
import { CidadaoAgendamentoModal } from "@/components/cidadao/CidadaoAgendamentoModal";
import type { Cidadao } from "@/types/api";
import { useCidadaos, type CidadaoInput } from "@/hooks/sistema/useCidadaos";
import { useCriarAgendamento } from "@/hooks/sistema/useAgendamentos";
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups } from "@/lib/authHelpers";
import { agendarService, getUnidadesFromResponse } from "@/services/agendarService";
import { agendamentoService } from "@/services/sistema/agendamentoService";
import { SITUACAO_PARA_STATUS } from "@/constants";

type Option = { value: string; label: string };
type HorarioOption = { value: string; label: string; complemento?: string };

export default function AdminCadastroCidadao() {
  const { user } = useAuth();
  const userRole = deriveRoleFromGroups(user?.grupos);
  const { cidadaos, total: totalCidadaos, loading, fetchCidadaos, createCidadao, updateCidadao } = useCidadaos();
  const { mutateAsync: criarAgendamento, isPending: criandoAgendamento } = useCriarAgendamento();

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cidadaoEditando, setCidadaoEditando] = useState<Cidadao | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [busca, setBusca] = useState("");

  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState("");
  const [unidadeOrigem, setUnidadeOrigem] = useState("");
  const [endereco, setEndereco] = useState("");
  const [enderecoNumero, setenderecoNumero] = useState("");
  const [enderecoComplemento, setEnderecoComplemento] = useState("");
  const [enderecoBairro, setEnderecoBairro] = useState("");
  const [enderecoCep, setEnderecoCep] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [cidadaoParaVisualizar, setCidadaoParaVisualizar] = useState<Cidadao | null>(null);

  const [cidadaoParaAgendar, setCidadaoParaAgendar] = useState<Cidadao | null>(null);
  const [agendarOutraUnidade, setAgendarOutraUnidade] = useState(false);
  const [motivoOutraUnidade, setMotivoOutraUnidade] = useState("");
  const [unidade, setUnidade] = useState("");
  const [categoria, setCategoria] = useState("");
  const [servico, setServico] = useState("");
  const [horario, setHorario] = useState("");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [opcoesUnidades, setOpcoesUnidades] = useState<Option[]>([]);
  const [opcoesCategorias, setOpcoesCategorias] = useState<Option[]>([]);
  const [opcoesServicos, setOpcoesServicos] = useState<Option[]>([]);
  const [opcoesHorarios, setOpcoesHorarios] = useState<HorarioOption[]>([]);
  const [carregandoCategorias, setCarregandoCategorias] = useState(false);
  const [carregandoServicos, setCarregandoServicos] = useState(false);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [termoBuscaAplicado, setTermoBuscaAplicado] = useState("");
  const camposObrigatoriosPreenchidos = () => nome.trim() && cpf.trim() && telefone.trim() && dataNascimento && sexo;
  const pageSize = 10;

  useEffect(() => {
    const carregarUnidades = async () => {
      try {
        const resp = await agendarService.listarUnidades();
        const lista = getUnidadesFromResponse(resp.data).map((u) => ({ value: String(u.id), label: u.nome })) as Option[];
        setOpcoesUnidades(lista);
        if (lista.length) {
          setUnidade((valorAtual) => valorAtual || lista[0].value);
          setUnidadeOrigem((valorAtual) => valorAtual || lista[0].value);
        }
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar unidades.");
      }
    };

    carregarUnidades();
  }, []);

  useEffect(() => {
    const limparSelecoes = () => {
      setCategoria("");
      setServico("");
      setHorario("");
      setOpcoesCategorias([]);
      setOpcoesServicos([]);
      setOpcoesHorarios([]);
    };

    if (!unidade) {
      limparSelecoes();
      return;
    }

    const carregarCategorias = async () => {
      setCarregandoCategorias(true);
      try {
        const resp = await agendarService.listarTipos(unidade);
        const lista = (resp.data?.tipos || []).map((tipo) => ({
          value: String(tipo.id),
          label: tipo.nome,
        })) as Option[];
        setOpcoesCategorias(lista);
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar categorias.");
      } finally {
        setCarregandoCategorias(false);
      }
    };

    carregarCategorias();
  }, [unidade]);

  useEffect(() => {
    const limparServicosEVagas = () => {
      setServico("");
      setHorario("");
      setOpcoesServicos([]);
      setOpcoesHorarios([]);
    };

    if (!unidade || !categoria) {
      limparServicosEVagas();
      return;
    }

    const carregarServicos = async () => {
      setCarregandoServicos(true);
      try {
        const resp = await agendarService.listarServicos(unidade, categoria);
        const lista = (resp.data?.servicos || []).map((serv) => ({
          value: String(serv.id),
          label: serv.nome,
        })) as Option[];
        setOpcoesServicos(lista);
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar serviços.");
      } finally {
        setCarregandoServicos(false);
      }
    };

    carregarServicos();
  }, [categoria, unidade]);

  useEffect(() => {
    const limparHorarios = () => {
      setHorario("");
      setOpcoesHorarios([]);
    };

    if (!unidade || !categoria || !data) {
      limparHorarios();
      return;
    }

    const carregarVagas = async () => {
      setCarregandoHorarios(true);
      try {
        const { data: resposta } = await agendamentoService.listarVagas({
          data,
          tipo_servico: categoria,
          unidade,
        });
        if (!resposta.success) {
          throw new Error((resposta as any)?.result || "Falha ao carregar horários.");
        }
        const horarios = (resposta.result || []).map((vaga: any) => {
          const horarioLabel = (vaga.horario || "").slice(0, 5) || vaga.horario;
          const vagasDisponiveis =
            typeof vaga.vagas_disponiveis === "number"
              ? vaga.vagas_disponiveis
              : typeof vaga.vagas === "number" && typeof vaga.vagas_ocupadas === "number"
                ? vaga.vagas - vaga.vagas_ocupadas
                : undefined;

          return {
            value: String(vaga.id),
            label: horarioLabel,
            complemento: typeof vagasDisponiveis === "number" ? `${vagasDisponiveis} vagas` : undefined,
          };
        }) as HorarioOption[];
        setOpcoesHorarios(horarios);
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar horários.");
      } finally {
        setCarregandoHorarios(false);
      }
    };

    carregarVagas();
  }, [unidade, categoria, data]);

  const montarPayload = (): CidadaoInput => ({
    nome: nome.trim(),
    cpf: cpf.trim(),
    telefone: telefone.trim(),
    apelido: apelido.trim() || null,
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
        if (termoBuscaAplicado.trim()) {
          const offset = (paginaAtual - 1) * pageSize;
          await fetchCidadaos({ cpf: termoBuscaAplicado.trim(), search: termoBuscaAplicado.trim(), limit: pageSize, offset });
        }
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

  const limparFormulario = () => {
    setNome("");
    setApelido("");
    setCpf("");
    setTelefone("");
    setEmail("");
    setDataNascimento("");
    setSexo("");
    setUnidadeOrigem("");
    setEndereco("");
    setenderecoNumero("");
    setEnderecoComplemento("");
    setEnderecoBairro("");
    setEnderecoCep("");
  };

  const handleEditar = (cidadao: Cidadao) => {
    setCidadaoEditando(cidadao);
    setNome(cidadao.nome);
    setApelido(cidadao.apelido || "");
    setCpf(cidadao.cpf);
    setTelefone(cidadao.telefone);
    setEmail(cidadao.email || "");
    setDataNascimento(cidadao.dataNascimento || "");
    setSexo((cidadao.sexo as string) || "");
    setUnidadeOrigem(typeof cidadao.unidade_origem === "string" ? cidadao.unidade_origem : cidadao.unidade_origem?.id || "");
    setEndereco(cidadao.logradouro || "");
    setenderecoNumero(cidadao.numero || "");
    setEnderecoComplemento(cidadao.complemento || "");
    setEnderecoBairro((cidadao.bairro as string) || "");
    setEnderecoCep(cidadao.cep || "");
    setMostrarFormulario(true);
    setModalAberto(true);
  };

  const limparDadosAgendamento = () => {
    setCategoria("");
    setServico("");
    setHorario("");
    setOpcoesServicos([]);
    setOpcoesHorarios([]);
    setData(format(new Date(), "yyyy-MM-dd"));
    setAgendarOutraUnidade(false);
    setMotivoOutraUnidade("");
  };

  const handleAgendar = async () => {
    if (!cidadaoParaAgendar) {
      toast.error("Selecione um cidadão para agendar.");
      return;
    }
    if (!unidade || !categoria || !servico || !horario) {
      toast.error("Preencha unidade, categoria, serviço e horário.");
      return;
    }
    if (agendarOutraUnidade && !motivoOutraUnidade.trim()) {
      toast.error("Informe o motivo para agendar em outra unidade.");
      return;
    }

    const origem = userRole === "atendente 156" ? "156" : userRole === "recepcionista" ? "RECEPCAO" : undefined;
    const motivoTerritorio = agendarOutraUnidade ? motivoOutraUnidade.trim() : undefined;
    try {
      await criarAgendamento({
        cidadao: cidadaoParaAgendar.id,
        servico,
        unidade,
        vaga: horario,
        origem,
        motivo_territorio: motivoTerritorio || undefined,
      });
      toast.success(`Agendamento criado para ${cidadaoParaAgendar.nome}.`);
      limparDadosAgendamento();
      setCidadaoParaAgendar(null);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.result || err?.message || "Não foi possível criar o agendamento.";
      toast.error(msg);
    }
  };

  const handleNovoCidadao = () => {
    limparFormulario();
    setCidadaoEditando(null);
    setBusca("");
    setMostrarFormulario(true);
  };

  const handleBuscar = async () => {
    const termo = busca.trim();
    if (!termo) {
      toast.error("Informe CPF ou nome para buscar.");
      return;
    }

    setTermoBuscaAplicado(termo);
    setPaginaAtual(1);
    setMostrarFormulario(false);
    setMostrarLista(true);
  };

  useEffect(() => {
    if (!mostrarLista) return;
    if (!termoBuscaAplicado) return;

    const offset = (paginaAtual - 1) * pageSize;
    fetchCidadaos({ cpf: termoBuscaAplicado, search: termoBuscaAplicado, limit: pageSize, offset });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarLista, termoBuscaAplicado, paginaAtual, pageSize]);

  const parseDataAgendamento = (dataAgendamento?: string) => {
    if (!dataAgendamento) return null;
    const dataBase = dataAgendamento.length >= 10 ? dataAgendamento.slice(0, 10) : dataAgendamento;
    const data = new Date(`${dataBase}T00:00:00`);
    return Number.isNaN(data.getTime()) ? null : data;
  };

  const formatarDataAgendamento = (dataAgendamento?: string) => {
    if (!dataAgendamento) return "-";
    const data = parseDataAgendamento(dataAgendamento);
    if (!data) return dataAgendamento;
    return data.toLocaleDateString("pt-BR");
  };

  const totalItens = totalCidadaos;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const paginaInicio = totalItens ? (paginaAtual - 1) * pageSize + 1 : 0;
  const paginaFim = Math.min(paginaAtual * pageSize, totalItens);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  const agendamentosVisiveis = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return (cidadaoParaVisualizar?.agendamentos ?? []).filter((agendamento) => {
      const dataAgendamento = parseDataAgendamento(agendamento.data);
      if (!dataAgendamento) return false;
      return dataAgendamento.getTime() >= hoje.getTime();
    });
  }, [cidadaoParaVisualizar?.agendamentos]);

  return (
    <SidebarProvider>
      <RoleBasedSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Cadastro e Agendamento de Cidadãos</h1>
              <p className="text-muted-foreground">Gerencie o cadastro de cidadãos no sistema</p>
            </div>

            <Button
              onClick={() => {
                handleNovoCidadao();
                setModalAberto(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Cidadão
            </Button>
          </div>

          <div className="space-y-6">
            {!mostrarFormulario && (
              <Card>
                <CardHeader>
                  <CardTitle>Buscar Cidadão</CardTitle>
                </CardHeader>
                <CardContent>
                  <CidadaoSearchBar
                    value={busca}
                    onChange={setBusca}
                    onSearch={handleBuscar}
                    placeholder="Buscar por CPF ou nome do cidadão..."
                    helperText="Aceita CPF completo ou nome."
                    buttonText="Pesquisar"
                    loading={loading}
                  />
                </CardContent>
              </Card>
            )}

            {mostrarLista && !mostrarFormulario && (
              <Card>
                <CardHeader>
                  <CardTitle>Cidadãos Encontrados ({totalItens})</CardTitle>
                </CardHeader>

                <CardContent>
                  {cidadaos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum cidadão encontrado.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>Telefone</TableHead>

                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {cidadaos.map((cidadao) => (
                          <TableRow key={cidadao.id}>
                            <TableCell className="font-medium">{cidadao.nome}</TableCell>
                            <TableCell>{cidadao.cpf}</TableCell>
                            <TableCell>{cidadao.telefone}</TableCell>

                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button variant="secondary" size="sm" onClick={() => setCidadaoParaVisualizar(cidadao)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {/* <Button variant="default" size="sm" onClick={() => setCidadaoParaAgendar(cidadao)}>
                                  <Calendar className="h-4 w-4" />
                                </Button> */}
                                <Button variant="outline" size="sm" onClick={() => handleEditar(cidadao)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {totalItens > 0 && (
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

          <CidadaoAgendamentoModal
            open={!!cidadaoParaAgendar}
            cidadao={cidadaoParaAgendar}
            unidades={opcoesUnidades}
            categorias={opcoesCategorias}
            servicos={opcoesServicos}
            horarios={opcoesHorarios}
            unidade={unidade}
            categoria={categoria}
            servico={servico}
            data={data}
            horario={horario}
            exibirMotivoOutraUnidade
            agendarOutraUnidade={agendarOutraUnidade}
            motivoOutraUnidade={motivoOutraUnidade}
            loadingCategorias={carregandoCategorias}
            loadingServicos={carregandoServicos}
            loadingHorarios={carregandoHorarios}
            confirmando={criandoAgendamento}
            onChangeUnidade={(value) => {
              setUnidade(value);
              setCategoria("");
              setServico("");
              setHorario("");
            }}
            onChangeCategoria={setCategoria}
            onChangeServico={setServico}
            onChangeData={setData}
            onChangeHorario={setHorario}
            onToggleOutraUnidade={(checked) => {
              setAgendarOutraUnidade(checked);
              if (!checked) {
                setMotivoOutraUnidade("");
              }
            }}
            onChangeMotivoOutraUnidade={setMotivoOutraUnidade}
            onConfirm={handleAgendar}
            onClose={() => {
              setCidadaoParaAgendar(null);
              limparDadosAgendamento();
            }}
          />

          <Dialog open={!!cidadaoParaVisualizar} onOpenChange={(open) => !open && setCidadaoParaVisualizar(null)}>
            <DialogContent className="max-w-3xl border-none p-0 bg-white rounded-2xl shadow-lg h-[90vh] md:h-auto md:max-h-[85vh] flex flex-col overflow-hidden">
              {/* Barra de destaque superior laranja */}
              <div className="bg-[#f05a28] h-1.5 w-full flex-shrink-0" />

              {/* Header Fixo */}
              <DialogHeader className="p-6 md:p-8 pb-4 border-b border-slate-50 flex-shrink-0">
                <div className="flex items-center gap-4 text-left">
                  <div className="bg-orange-100 p-3 rounded-2xl text-[#f05a28]"></div>
                  <div>
                    <DialogTitle className="text-xl md:text-2xl font-bold text-slate-800">Agendamentos do Cidadão</DialogTitle>
                    <p className="text-sm text-slate-500 font-medium">
                      Histórico de agendamentos para: <span className="text-slate-900 font-bold">{cidadaoParaVisualizar?.nome}</span>
                    </p>
                  </div>
                </div>
              </DialogHeader>

              {/* Área de Conteúdo com Scroll Independente */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-white">
                {!agendamentosVisiveis.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                    <div className="bg-slate-50 p-4 rounded-full"></div>
                    <p className="text-sm text-slate-500 font-medium italic">Nenhum agendamento atual ou futuro encontrado para este cidadão.</p>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-100">
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4 px-6">Data</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4 px-6">Horário</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4 px-6">Status</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4 px-6">Atendente</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agendamentosVisiveis.map((agendamento) => (
                          <TableRow key={agendamento.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                            <TableCell className="py-4 px-6 font-bold text-slate-700">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-[#f05a28]/60" />
                                {formatarDataAgendamento(agendamento.data)}
                              </div>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <div className="flex items-center gap-2 font-semibold text-slate-600">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {(agendamento.horario || "").slice(0, 5) || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border bg-slate-50 text-slate-500 border-slate-100">
                                {SITUACAO_PARA_STATUS[agendamento.situacao] ?? agendamento.situacao}
                              </span>
                            </TableCell>
                            <TableCell className="py-4 px-6 text-sm text-slate-600 font-medium">
                              {agendamento.atendente?.nome_completo || agendamento.atendente?.nome || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Footer Fixo */}
              <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100 flex-shrink-0">
                <Button
                  onClick={() => setCidadaoParaVisualizar(null)}
                  className="w-full md:w-auto min-w-[120px] bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold rounded-xl h-11 transition-all shadow-sm"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          unidadesOrigem={opcoesUnidades}
          endereco={endereco}
          enderecoNumero={enderecoNumero}
          enderecoComplemento={enderecoComplemento}
          enderecoBairro={enderecoBairro}
          enderecoCep={enderecoCep}
          setNome={setNome}
          setApelido={setApelido}
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
        />
      </div>
    </SidebarProvider>
  );
}
