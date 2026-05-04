import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "@/lib/sonner";

import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/notifications";
import { beneficioService, type BeneficioSocial } from "@/services/prontuario/beneficioService";
import { encaminhamentoService } from "@/services/prontuario/encaminhamentoService";
import { useBeneficiosSociaisAdmin, useCodigoAreasAdmin } from "@/hooks/prontuario/useAdminProntuarioCampos";
import {
  useAtivarUnidadeProntuario,
  useCreateUnidadeProntuario,
  useDesativarUnidadeProntuario,
  useUnidadesProntuarioAdmin,
  useUpdateUnidadeProntuario,
} from "@/hooks/prontuario/useUnidadeProntuario";

const parseItem = <T,>(payload: unknown): T | null => {
  if (payload && typeof payload === "object" && "result" in payload && (payload as { result?: unknown }).result) {
    return (payload as { result: T }).result;
  }
  if (payload && typeof payload === "object") return payload as T;
  return null;
};

type AbaCamposProntuario = "unidades" | "beneficios" | "codigos-area";

type LinhaTabela = {
  id: string;
  nome: string;
  ativo: boolean;
  codigo?: number;
};

export default function AdminProntuarioCamposPage() {
  const [aba, setAba] = useState<AbaCamposProntuario>("unidades");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");
  const [modalForm, setModalForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [formUnidade, setFormUnidade] = useState({ unidade: "", ativo: true });
  const [formBeneficio, setFormBeneficio] = useState({ nome: "", ativo: true });
  const [formCodigoArea, setFormCodigoArea] = useState({ nome: "", codigo: "", ativo: true });

  const pageSize = 10;

  const unidadesState = useUnidadesProntuarioAdmin(aba === "unidades" ? filtro : "", pageSize);
  const beneficiosState = useBeneficiosSociaisAdmin(aba === "beneficios" ? filtro : "", pageSize);
  const codigosAreaState = useCodigoAreasAdmin(aba === "codigos-area" ? filtro : "", pageSize);
  const createUnidadeMutation = useCreateUnidadeProntuario();
  const updateUnidadeMutation = useUpdateUnidadeProntuario();
  const ativarUnidadeMutation = useAtivarUnidadeProntuario();
  const desativarUnidadeMutation = useDesativarUnidadeProntuario();

  const paginaAtual = aba === "unidades" ? unidadesState.page : aba === "beneficios" ? beneficiosState.page : codigosAreaState.page;
  const setPaginaAtual = aba === "unidades" ? unidadesState.setPage : aba === "beneficios" ? beneficiosState.setPage : codigosAreaState.setPage;
  const totalItens = aba === "unidades" ? unidadesState.total : aba === "beneficios" ? beneficiosState.total : codigosAreaState.total;
  const linhas = useMemo<LinhaTabela[]>(
    () =>
      aba === "unidades"
        ? unidadesState.items.map((item) => ({ id: item.id, nome: item.unidade, ativo: item.ativo }))
        : aba === "beneficios"
          ? beneficiosState.items.map((item) => ({ id: item.id, nome: item.nome, ativo: item.ativo }))
          : codigosAreaState.items.map((item) => ({ id: item.id, nome: item.nome, ativo: item.ativo, codigo: item.codigo })),
    [aba, beneficiosState.items, codigosAreaState.items, unidadesState.items],
  );
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const paginaInicio = totalItens ? (paginaAtual - 1) * pageSize + 1 : 0;
  const paginaFim = Math.min(paginaAtual * pageSize, totalItens);

  const carregarAtual = aba === "unidades" ? unidadesState.refresh : aba === "beneficios" ? beneficiosState.refresh : codigosAreaState.refresh;

  useEffect(() => {
    setPaginaAtual(1);
  }, [aba, filtro, setPaginaAtual]);

  const abrirNovo = () => {
    setEditandoId(null);
    setFormUnidade({ unidade: "", ativo: true });
    setFormBeneficio({ nome: "", ativo: true });
    setFormCodigoArea({ nome: "", codigo: "", ativo: true });
    setModalForm(true);
  };

  const abrirEditar = (id: string) => {
    setEditandoId(id);
    if (aba === "unidades") {
      const item = unidadesState.items.find((x) => x.id === id);
      if (item) setFormUnidade({ unidade: item.unidade, ativo: item.ativo });
    } else if (aba === "beneficios") {
      const item = beneficiosState.items.find((x) => x.id === id);
      if (item) setFormBeneficio({ nome: item.nome, ativo: item.ativo });
    } else {
      const item = codigosAreaState.items.find((x) => x.id === id);
      if (item) setFormCodigoArea({ nome: item.nome, codigo: String(item.codigo), ativo: item.ativo });
    }
    setModalForm(true);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      if (aba === "unidades") {
        if (!formUnidade.unidade.trim()) {
          toast.error("Informe a unidade.");
          return;
        }
        const payload = {
          unidade: formUnidade.unidade.trim(),
          is_active: formUnidade.ativo,
        };
        if (editandoId) {
          await updateUnidadeMutation.mutateAsync({ id: editandoId, payload });
        } else {
          await createUnidadeMutation.mutateAsync(payload);
        }
        await carregarAtual();
      } else if (aba === "beneficios") {
        if (!formBeneficio.nome.trim()) {
          toast.error("Informe o nome do benefício.");
          return;
        }
        const payload = {
          nome: formBeneficio.nome.trim(),
          is_active: formBeneficio.ativo,
        };
        const { data } = editandoId
          ? await beneficioService.atualizarBeneficioSocial(editandoId, payload)
          : await beneficioService.criarBeneficioSocial(payload);
        const item = parseItem<BeneficioSocial>(data);
        if (!item?.id) {
          await carregarAtual();
        } else {
          await carregarAtual();
        }
      } else {
        if (!formCodigoArea.nome.trim()) {
          toast.error("Informe o nome do código de área.");
          return;
        }
        const codigoNumero = Number(formCodigoArea.codigo);
        if (!Number.isInteger(codigoNumero) || codigoNumero < 0) {
          toast.error("Informe um código numérico válido.");
          return;
        }
        const payload = {
          nome: formCodigoArea.nome.trim(),
          codigo: codigoNumero,
          is_active: formCodigoArea.ativo,
        };
        const { data } = editandoId
          ? await encaminhamentoService.atualizarCodigoArea(editandoId, payload)
          : await encaminhamentoService.criarCodigoArea(payload);
        const item = parseItem<{ id?: string }>(data);
        if (!item?.id) {
          await carregarAtual();
        } else {
          await carregarAtual();
        }
      }
      setModalForm(false);
      toast.success("Registro salvo com sucesso.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar o registro."));
    } finally {
      setSalvando(false);
    }
  };

  const alternarStatus = async (id: string, proximoAtivo: boolean) => {
    try {
      if (aba === "unidades") {
        if (proximoAtivo) {
          await ativarUnidadeMutation.mutateAsync(id);
        } else {
          await desativarUnidadeMutation.mutateAsync(id);
        }
      } else if (aba === "beneficios") {
        await beneficioService.atualizarBeneficioSocial(id, { is_active: proximoAtivo });
      } else {
        await encaminhamentoService.atualizarCodigoArea(id, { is_active: proximoAtivo });
      }
      await carregarAtual();
      toast.success(proximoAtivo ? "Registro ativado." : "Registro desativado.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível atualizar o status."));
    }
  };

  const colSpan = useMemo(() => 3, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-3xl font-bold">Campos do prontuário e encaminhamento</h1>
                <p className="text-muted-foreground">Gerencie unidades, benefícios sociais e códigos de área</p>
              </div>
            </div>
            <Button onClick={abrirNovo} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <Tabs value={aba} onValueChange={(v) => setAba(v as AbaCamposProntuario)}>
            <TabsList>
              <TabsTrigger value="unidades">Unidades de encaminhamento</TabsTrigger>
              <TabsTrigger value="beneficios">Benefícios sociais</TabsTrigger>
              <TabsTrigger value="codigos-area">Códigos de área</TabsTrigger>
            </TabsList>

            <TabsContent value={aba} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {aba === "unidades" ? "Unidades cadastradas" : aba === "beneficios" ? "Benefícios cadastrados" : "Códigos de área cadastrados"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Buscar..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setFiltro(busca.trim());
                          setPaginaAtual(1);
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        setFiltro(busca.trim());
                        setPaginaAtual(1);
                      }}
                    >
                      Buscar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-card rounded-2xl shadow-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-secondary">
                    <TableRow>
                      <TableHead className="px-6 py-4">{aba === "codigos-area" ? "Código e nome" : "Nome"}</TableHead>
                      <TableHead className="px-6 py-4">Status</TableHead>
                      <TableHead className="px-6 py-4 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((item, idx) => (
                      <TableRow key={item.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                        <TableCell className="px-6 py-4 font-medium">
                          {aba === "codigos-area" ? `${String(item.codigo ?? "").padStart(2, "0")} - ${item.nome}` : item.nome}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant={item.ativo ? "default" : "secondary"}>{item.ativo ? "Ativo" : "Inativo"}</Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right align-middle">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => abrirEditar(item.id)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Switch
                              checked={item.ativo}
                              onCheckedChange={(checked) => void alternarStatus(item.id, checked)}
                              aria-label={item.ativo ? "Desativar registro" : "Ativar registro"}
                              className="scale-90 translate-y-[1px]"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {linhas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={colSpan} className="px-6 py-4 text-center text-muted-foreground">
                          Nenhum registro encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalItens > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foregragendamento CRAS ound">
                    Mostrando {paginaInicio} - {paginaFim} de {totalItens}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-2 rounded border disabled:opacity-50"
                      onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                      disabled={paginaAtual === 1}
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Página {paginaAtual} / {totalPaginas}
                    </span>
                    <button
                      className="px-3 py-2 rounded border disabled:opacity-50"
                      onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                      disabled={paginaAtual >= totalPaginas}
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <Dialog open={modalForm} onOpenChange={setModalForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editandoId ? "Editar" : !editandoId && aba === "unidades" ? "Nova" : "Novo"}{" "}
              {aba === "unidades" ? "unidade" : aba === "beneficios" ? "benefício" : "código de área"}
            </DialogTitle>
          </DialogHeader>
          {aba === "unidades" ? (
            <div className="space-y-3">
              <div>
                <Label>Unidade *</Label>
                <Input value={formUnidade.unidade} onChange={(e) => setFormUnidade((v) => ({ ...v, unidade: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between border rounded p-3">
                <Label htmlFor="u-ativo">Ativo</Label>
                <Switch id="u-ativo" checked={formUnidade.ativo} onCheckedChange={(c) => setFormUnidade((v) => ({ ...v, ativo: c }))} />
              </div>
            </div>
          ) : aba === "beneficios" ? (
            <div className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input value={formBeneficio.nome} onChange={(e) => setFormBeneficio((v) => ({ ...v, nome: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between border rounded p-3">
                <Label htmlFor="b-ativo">Ativo</Label>
                <Switch id="b-ativo" checked={formBeneficio.ativo} onCheckedChange={(c) => setFormBeneficio((v) => ({ ...v, ativo: c }))} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input value={formCodigoArea.nome} onChange={(e) => setFormCodigoArea((v) => ({ ...v, nome: e.target.value }))} />
              </div>
              <div>
                <Label>Codigo *</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={formCodigoArea.codigo}
                  onChange={(e) => setFormCodigoArea((v) => ({ ...v, codigo: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between border rounded p-3">
                <Label htmlFor="c-ativo">Ativo</Label>
                <Switch id="c-ativo" checked={formCodigoArea.ativo} onCheckedChange={(c) => setFormCodigoArea((v) => ({ ...v, ativo: c }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalForm(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
