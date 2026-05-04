import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "@/lib/sonner";

import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useGuiches, type GuicheItem } from "@/hooks/sistema/useGuiches";
import { getApiErrorMessage } from "@/lib/notifications";

type Guiche = GuicheItem;
const BUSCA_MAX_LENGTH = 100;

const sanitizeBusca = (value: string) => value.replace(/[\r\n]+/g, " ").trim().slice(0, BUSCA_MAX_LENGTH);

export default function AdminGuichesCoordenador() {
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const unidadeId = user?.unidade_ativa?.id ?? "";
  const { guiches, totalCount, loading, error, fetchGuiches, createGuiche, updateGuiche, deleteGuiche } = useGuiches(filtroBusca);

  const [guichesEdicao, setGuichesEdicao] = useState<Guiche[]>([]);
  const [novoGuicheNome, setNovoGuicheNome] = useState("");
  const [adicionandoGuiche, setAdicionandoGuiche] = useState(false);
  const [salvandoGuicheId, setSalvandoGuicheId] = useState<string | null>(null);
  const [removendoGuicheId, setRemovendoGuicheId] = useState<string | null>(null);
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [guicheEditandoId, setGuicheEditandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);

  const pageSize = 10;
  const totalItens = totalCount || guichesEdicao.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const paginaInicio = totalItens ? (paginaAtual - 1) * pageSize + 1 : 0;
  const paginaFim = Math.min(paginaAtual * pageSize, totalItens);
  const guichesPaginados = useMemo(() => guichesEdicao, [guichesEdicao]);

  useEffect(() => {
    if (unidadeId) {
      fetchGuiches(unidadeId, { limit: String(pageSize), offset: String((paginaAtual - 1) * pageSize) });
    }
  }, [fetchGuiches, pageSize, paginaAtual, unidadeId, filtroBusca]);

  useEffect(() => {
    setGuichesEdicao(guiches.map((guiche) => ({ ...guiche })));
  }, [guiches]);

  useEffect(() => {
    if (!error) return;
    toast.error(getApiErrorMessage(error, "Não foi possível carregar os guichês."));
  }, [error]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) setPaginaAtual(totalPaginas);
  }, [paginaAtual, totalPaginas]);

  const atualizarGuicheEdicao = (id: string, valor: string) => {
    setGuichesEdicao((atual) => atual.map((item) => (item.id === id ? { ...item, nome: valor } : item)));
  };

  const abrirModalEdicao = (guiche: Guiche) => {
    setGuicheEditandoId(guiche.id);
    setNomeEdicao(guiche.nome);
    setModalEditarAberto(true);
  };

  const confirmarEdicao = async () => {
    if (!guicheEditandoId) return;
    const nome = nomeEdicao.trim();
    if (!nome) {
      toast.error("Informe o nome do guichê.");
      return;
    }
    const guicheAtual = guichesEdicao.find((item) => item.id === guicheEditandoId);
    if (!guicheAtual) {
      toast.error("Guichê não encontrado.");
      return;
    }
    atualizarGuicheEdicao(guicheAtual.id, nome);
    await salvarGuiche({ ...guicheAtual, nome });
    setModalEditarAberto(false);
  };

  const adicionarGuiche = async () => {
    if (!unidadeId) {
      toast.error("Nenhuma unidade ativa vinculada.");
      return;
    }
    const nome = novoGuicheNome.trim();
    if (!nome) {
      toast.error("Informe o nome do guichê.");
      return;
    }
    setAdicionandoGuiche(true);
    try {
      const created = await createGuiche({ nome, unidade: unidadeId, is_active: true });
      if (!created) {
        throw new Error("Não foi possível adicionar o guichê.");
      }
      setNovoGuicheNome("");
      toast.success("Guichê adicionado.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível adicionar o guichê."));
    } finally {
      setAdicionandoGuiche(false);
    }
  };

  const salvarGuiche = async (guiche: Guiche) => {
    const nome = guiche.nome.trim();
    if (!nome) {
      toast.error("Informe o nome do guichê.");
      return;
    }
    setSalvandoGuicheId(guiche.id);
    try {
      const updated = await updateGuiche(guiche.id, { nome, unidade: unidadeId || undefined });
      if (!updated) {
        throw new Error("Não foi possível atualizar o guichê.");
      }
      toast.success("Guichê atualizado.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível atualizar o guichê."));
    } finally {
      setSalvandoGuicheId(null);
    }
  };

  const removerGuiche = async (guicheId: string) => {
    setRemovendoGuicheId(guicheId);
    try {
      await deleteGuiche(guicheId);
      toast.success("Guichê removido.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível remover o guichê."));
    } finally {
      setRemovendoGuicheId(null);
    }
  };

  const handleBuscar = () => {
    setFiltroBusca(busca.trim());
    setPaginaAtual(1);
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
                  <h1 className="text-3xl font-bold text-foreground">Guichês</h1>
                  <p className="text-muted-foreground">Gerencie os guichês ou salas da unidade</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setModalAdicionarAberto(true)}
                disabled={!unidadeId}
                className="bg-[#f26522] hover:bg-[#d95a1e] text-white font-bold px-6 gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar guichê
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Guichês/Salas cadastrados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 w-full ">
                  <Input
                    placeholder="Buscar por nome ou status..."
                    value={busca}
                    maxLength={BUSCA_MAX_LENGTH}
                    onChange={(event) => setBusca(sanitizeBusca(event.target.value))}
                  />
                  <Button onClick={handleBuscar}>Pesquisar</Button>
                </div>
              </CardContent>
            </Card>

            {!unidadeId ? <p className="text-xs text-destructive">Nenhuma unidade ativa vinculada ao usuário.</p> : null}

            <div className="bg-card rounded-2xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader className="bg-secondary">
                    <TableRow>
                      <TableHead className="px-6 py-4 text-left font-bold text-foreground">Nome</TableHead>
                      <TableHead className="px-6 py-4 text-left font-bold text-foreground">Status</TableHead>
                      <TableHead className="px-6 py-4 text-right font-bold text-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : guichesPaginados.length ? (
                      guichesPaginados.map((guiche) => (
                        <TableRow key={guiche.id}>
                          <TableCell className="px-6 py-4">{guiche.nome}</TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge variant={guiche.ocupado ? "destructive" : "secondary"} className="rounded-full">
                              {guiche.ocupado ? "Ocupado" : "Livre"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                title="Editar"
                                className="p-2 hover:bg-muted rounded-full"
                                onClick={() => abrirModalEdicao(guiche)}
                                disabled={salvandoGuicheId === guiche.id}
                              >
                                <Pencil className="h-3.5 w-3.5 mr-1" />
                              </button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removerGuiche(guiche.id)}
                                disabled={removendoGuicheId === guiche.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">
                          Nenhum guichê encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            {guichesEdicao.length > 0 && (
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

      <Dialog open={modalAdicionarAberto} onOpenChange={setModalAdicionarAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">Adicionar guichê</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Nome do novo guichê</label>
              <Input
                className="bg-white"
                value={novoGuicheNome}
                onChange={(event) => setNovoGuicheNome(event.target.value)}
                placeholder="Ex: Guiche 01"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setModalAdicionarAberto(false)} disabled={adicionandoGuiche}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () => {
                await adicionarGuiche();
                setModalAdicionarAberto(false);
              }}
              disabled={adicionandoGuiche || !novoGuicheNome.trim()}
              className="bg-[#f26522] hover:bg-[#d95a1e] text-white font-bold px-6 gap-2"
            >
              <Plus className="h-4 w-4" />
              {adicionandoGuiche ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalEditarAberto}
        onOpenChange={(open) => {
          if (!open) setGuicheEditandoId(null);
          setModalEditarAberto(open);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">Editar guichê</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Nome do guichê</label>
              <Input className="bg-white" value={nomeEdicao} onChange={(event) => setNomeEdicao(event.target.value)} placeholder="Ex: Guichê 01" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setModalEditarAberto(false)} disabled={salvandoGuicheId === guicheEditandoId}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmarEdicao}
              disabled={salvandoGuicheId === guicheEditandoId || !nomeEdicao.trim()}
              className="bg-[#f26522] hover:bg-[#d95a1e] text-white font-bold px-6 gap-2"
            >
              <Save className="h-4 w-4" />
              {salvandoGuicheId === guicheEditandoId ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
