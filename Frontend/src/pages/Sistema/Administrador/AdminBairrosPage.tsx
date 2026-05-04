import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "@/lib/sonner";
import { MapPin, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { bairroService } from "@/services/sistema/bairroService";
import { getApiErrorMessage } from "@/lib/notifications";
import type { Bairro as BairroApi } from "@/types/api";

type Bairro = {
  id: string;
  nome: string;
  ativo: boolean;
};

const bairroVazio: Bairro = { id: "", nome: "", ativo: true };

export default function AdminBairrosPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [totalItens, setTotalItens] = useState(0);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<unknown>(null);
  const [salvando, setSalvando] = useState(false);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [bairroSelecionado, setBairroSelecionado] = useState<Bairro | null>(null);
  const [bairroForm, setBairroForm] = useState<Bairro>(bairroVazio);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const pageSize = 10;

  const normalizarBairro = useCallback((bairro: BairroApi): Bairro => {
    return {
      id: String(bairro.id),
      nome: bairro.nome || "",
      ativo: bairro.is_active ?? true,
    };
  }, []);

  const carregarBairros = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const offset = (paginaAtual - 1) * pageSize;
      const { data } = await bairroService.listar({
        ...(filtroBusca ? { nome: filtroBusca } : {}),
        limit: pageSize,
        offset,
      });
      const paginated = data as { count?: number; results?: { success?: boolean; result?: BairroApi[]; mensagem?: string } };
      const lista = Array.isArray(data?.result)
        ? data.result
        : Array.isArray(paginated?.results?.result)
          ? paginated.results.result
          : Array.isArray(data)
            ? data
            : [];
      const total = typeof paginated?.count === "number" ? paginated.count : lista.length;

      if (!lista.length && (data?.success === false || paginated?.results?.success === false)) {
        throw new Error(data?.mensagem || paginated?.results?.mensagem || "Nenhum bairro encontrado.");
      }

      setBairros(lista.map(normalizarBairro));
      setTotalItens(total);
    } catch (err) {
      setErro(err);
      setTotalItens(0);
      toast.error(getApiErrorMessage(err, "Não foi possível carregar os bairros."));
    } finally {
      setCarregando(false);
    }
  }, [normalizarBairro, filtroBusca, paginaAtual, pageSize]);

  useEffect(() => {
    carregarBairros();
  }, [carregarBairros]);

  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const paginaInicio = totalItens ? (paginaAtual - 1) * pageSize + 1 : 0;
  const paginaFim = Math.min(paginaAtual * pageSize, totalItens);
  const mostraSkeletonTabela = carregando && bairros.length === 0;
  const mostraOverlayTabela = carregando && bairros.length > 0;

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  const abrirVisualizacao = (bairro: Bairro) => {
    setBairroSelecionado(bairro);
    setModalVisualizarAberto(true);
  };

  const abrirEdicao = (bairro: Bairro) => {
    setBairroForm(bairro);
    setEditandoId(bairro.id);
    setModalFormAberto(true);
  };

  const handleBuscar = () => {
    setFiltroBusca(busca.trim());
    setPaginaAtual(1);
  };
  const abrirNovo = () => {
    setBairroForm(bairroVazio);
    setEditandoId(null);
    setModalFormAberto(true);
  };

  const salvarBairro = async () => {
    if (!bairroForm.nome.trim()) {
      toast.error("Informe o nome do bairro.");
      return;
    }

    setSalvando(true);
    try {
      const payload = { nome: bairroForm.nome.trim(), is_active: bairroForm.ativo };

      if (editandoId) {
        const { data } = await bairroService.atualizar(editandoId, payload);
        const atualizado = data?.result ?? null;
        if (!atualizado) {
          throw new Error("Não foi possível atualizar o bairro.");
        }
        await carregarBairros();
        toast.success("Bairro atualizado com sucesso.");
      } else {
        const { data } = await bairroService.criar(payload);
        const criado = data?.result ?? null;
        if (!criado) {
          throw new Error("Não foi possível criar o bairro.");
        }
        const mudouParaPrimeira = paginaAtual !== 1;
        setPaginaAtual(1);
        if (!mudouParaPrimeira) {
          await carregarBairros();
        }
        toast.success("Bairro criado com sucesso.");
      }

      setModalFormAberto(false);
      setBairroForm(bairroVazio);
      setEditandoId(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar o bairro."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />

                <div>
                  <h1 className="text-3xl font-bold text-foreground">Bairros</h1>
                  <p className="text-muted-foreground">Gerencie os bairros das unidades CRAS</p>
                </div>
              </div>
              <Button onClick={abrirNovo} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar bairro
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Bairros cadastrados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 w-full ">
                  <Input
                    placeholder="Buscar bairro..."
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBuscar();
                    }}
                  />
                  <Button onClick={handleBuscar}>Pesquisar</Button>
                </div>
              </CardContent>
            </Card>

            {erro ? (
              <p className="text-xs text-destructive">
                Não foi possível carregar os bairros.{" "}
                <button type="button" className="underline" onClick={carregarBairros}>
                  Tentar novamente
                </button>
              </p>
            ) : null}

            <div className="bg-card rounded-2xl shadow-md overflow-hidden">
              <div className="relative overflow-x-auto">
                {mostraOverlayTabela && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando bairros...
                    </div>
                  </div>
                )}
                <Table className="w-full">
                  <TableHeader className="bg-secondary">
                    <TableRow>
                      <TableHead className="px-6 py-4 text-left font-bold text-foreground">Nome</TableHead>
                      <TableHead className="px-6 py-4 text-left font-bold text-foreground">Status</TableHead>
                      <TableHead className="px-6 py-4 text-right font-bold text-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mostraSkeletonTabela &&
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell colSpan={3} className="px-6 py-4">
                            <div className="grid grid-cols-3 gap-4">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-16 justify-self-end" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    {!mostraSkeletonTabela &&
                      bairros.map((bairro, index) => (
                        <TableRow key={bairro.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <TableCell className="px-6 py-4 font-medium text-foreground">{bairro.nome}</TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge variant={bairro.ativo ? "default" : "secondary"}>{bairro.ativo ? "Ativo" : "Inativo"}</Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => abrirVisualizacao(bairro)} title="Visualizar">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => abrirEdicao(bairro)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    {!carregando && bairros.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="px-6 py-4 text-center text-muted-foreground">
                          Nenhum bairro encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
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
        </main>
      </div>

      <Dialog open={modalVisualizarAberto} onOpenChange={setModalVisualizarAberto}>
        <DialogContent className="max-w-md border-none overflow-hidden p-0 bg-white rounded-2xl shadow-lg">
          <div className="bg-[#f05a28] h-1.5 w-full" />

          <div className="p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2.5 rounded-full">
                  <Info className="w-5 h-5 text-[#f05a28]" />
                </div>
                <DialogTitle className="text-xl font-bold text-slate-800">Detalhes do bairro</DialogTitle>
              </div>
            </DialogHeader>

            {bairroSelecionado && (
              <div className="space-y-6">
                {/* Container de Informações Estilizado */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Nome do Bairro
                    </span>
                    <p className="text-lg font-semibold text-slate-700">{bairroSelecionado.nome}</p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status de Operação</span>
                    <div>
                      {bairroSelecionado.ativo ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 rounded-full">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200 border-none px-3 py-1 rounded-full">
                          <span className="w-2 h-2 bg-slate-400 rounded-full mr-2" />
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-slate-400 italic">Informações registradas no sistema de gestão territorial.</p>
                </div>
              </div>
            )}

            <DialogFooter className="mt-8">
              <Button
                onClick={() => setModalVisualizarAberto(false)}
                className="w-full bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold h-12 rounded-xl transition-all shadow-md shadow-orange-100"
              >
                Concluir Visualização
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalFormAberto} onOpenChange={setModalFormAberto}>
        <DialogContent className="max-w-md border-none overflow-hidden p-0 bg-white rounded-2xl shadow-lg">
          {/* Barra de destaque superior opcional */}
          <div className="bg-[#f05a28] h-1.5 w-full" />

          <div className="p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2.5 rounded-full">
                  <MapPin className="w-5 h-5 text-[#f05a28]" />
                </div>
                <div className="text-left">
                  <DialogTitle className="text-xl font-bold text-slate-800">{editandoId ? "Editar Bairro" : "Novo Bairro"}</DialogTitle>
                  <DialogDescription className="text-slate-500 text-sm">
                    {editandoId ? "Atualize as informações do bairro selecionado." : "Cadastre um novo bairro para a base do sistema."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Campo de Nome */}
              <div className="space-y-2">
                <Label htmlFor="bairro-nome" className="text-sm font-semibold text-slate-700 ml-1">
                  Nome do bairro <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bairro-nome"
                  placeholder="Ex: Aldeota"
                  className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] h-11"
                  value={bairroForm.nome}
                  onChange={(event) => setBairroForm((atual) => ({ ...atual, nome: event.target.value }))}
                />
              </div>

              {/* Card de Ativação */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/80 transition-all hover:bg-slate-50">
                <div className="space-y-0.5 text-left">
                  <Label htmlFor="bairro-ativo" className="text-sm font-bold text-slate-700 cursor-pointer">
                    Bairro Ativo
                  </Label>
                  <p className="text-xs text-slate-500">Define se o bairro estará disponível para novos agendamentos.</p>
                </div>
                <Switch
                  id="bairro-ativo"
                  className="data-[state=checked]:bg-[#f05a28]"
                  checked={bairroForm.ativo}
                  onCheckedChange={(checked) => setBairroForm((atual) => ({ ...atual, ativo: checked }))}
                />
              </div>
            </div>

            <DialogFooter className="mt-8 flex flex-row gap-3 sm:justify-end">
              <Button
                variant="ghost"
                className="flex-1 sm:flex-none text-slate-500 font-medium hover:bg-slate-100 rounded-xl"
                onClick={() => setModalFormAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 sm:flex-none bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold px-6 rounded-xl transition-all shadow-md shadow-orange-100"
                onClick={salvarBairro}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Criar bairro"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
