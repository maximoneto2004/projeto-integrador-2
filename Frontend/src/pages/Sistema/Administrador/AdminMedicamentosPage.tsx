import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Pill, Plus, Search, Trash2 } from "lucide-react";
import { PaginaSistema } from "@/components/PaginaSistema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FORMAS_FARMACEUTICAS, UNIDADES_MEDIDA, VIAS_ADMINISTRACAO } from "@/constants/medicamentos";
import { medicamentoService, type Medicamento, type MedicamentoPayload } from "@/services/sistema/medicamentoService";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

type Filtro = "ativos" | "inativos" | "todos";

type Formulario = Omit<MedicamentoPayload, "estoque_minimo" | "classe_terapeutica" | "fabricante" | "codigo_registro" | "observacoes"> & {
  estoque_minimo: string;
  classe_terapeutica: string;
  fabricante: string;
  codigo_registro: string;
  observacoes: string;
};

const formularioVazio: Formulario = {
  nome: "",
  principio_ativo: "",
  forma_farmaceutica: "COMPRIMIDO",
  concentracao: "",
  unidade_medida: "MG",
  via_administracao: "ORAL",
  controlado: false,
  classe_terapeutica: "",
  fabricante: "",
  codigo_registro: "",
  observacoes: "",
  estoque_minimo: "0",
  is_active: true,
};

const paraFormulario = (m: Medicamento): Formulario => ({
  nome: m.nome,
  principio_ativo: m.principio_ativo,
  forma_farmaceutica: m.forma_farmaceutica,
  concentracao: m.concentracao,
  unidade_medida: m.unidade_medida,
  via_administracao: m.via_administracao,
  controlado: m.controlado,
  classe_terapeutica: m.classe_terapeutica ?? "",
  fabricante: m.fabricante ?? "",
  codigo_registro: m.codigo_registro ?? "",
  observacoes: m.observacoes ?? "",
  estoque_minimo: String(m.estoque_minimo ?? 0),
  is_active: m.is_active,
});

function SelectCampo({
  label,
  value,
  opcoes,
  onChange,
}: {
  label: string;
  value: string;
  opcoes: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label} *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function AdminMedicamentosPage() {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("ativos");

  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario>(formularioVazio);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Medicamento | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setMedicamentos(
        await medicamentoService.listar({
          busca: buscaAplicada || undefined,
          is_active: filtro === "todos" ? undefined : filtro === "ativos",
        }),
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível carregar os medicamentos."));
    } finally {
      setCarregando(false);
    }
  }, [buscaAplicada, filtro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(formularioVazio);
    setFormAberto(true);
  };

  const abrirEdicao = (m: Medicamento) => {
    setEditandoId(m.id);
    setForm(paraFormulario(m));
    setFormAberto(true);
  };

  const atualizar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => setForm((f) => ({ ...f, [campo]: valor }));

  const salvar = async () => {
    if (!form.nome.trim() || !form.principio_ativo.trim() || !form.concentracao.trim()) {
      toast.error("Preencha nome, princípio ativo e concentração.");
      return;
    }
    const estoqueMinimo = Number(form.estoque_minimo || 0);
    if (!Number.isInteger(estoqueMinimo) || estoqueMinimo < 0) {
      toast.error("O estoque mínimo deve ser um número inteiro maior ou igual a zero.");
      return;
    }
    const texto = (v: string) => v.trim() || null;
    const payload: MedicamentoPayload = {
      ...form,
      nome: form.nome.trim(),
      principio_ativo: form.principio_ativo.trim(),
      concentracao: form.concentracao.trim(),
      classe_terapeutica: texto(form.classe_terapeutica),
      fabricante: texto(form.fabricante),
      codigo_registro: texto(form.codigo_registro),
      observacoes: texto(form.observacoes),
      estoque_minimo: estoqueMinimo,
    };

    setSalvando(true);
    try {
      if (editandoId) {
        await medicamentoService.atualizar(editandoId, payload);
        toast.success("Medicamento atualizado.");
      } else {
        await medicamentoService.criar(payload);
        toast.success("Medicamento cadastrado.");
      }
      setFormAberto(false);
      carregar();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar o medicamento."));
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!paraExcluir) return;
    try {
      await medicamentoService.remover(paraExcluir.id);
      toast.success("Medicamento excluído.");
      carregar();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível excluir o medicamento."));
    } finally {
      setParaExcluir(null);
    }
  };

  return (
    <PaginaSistema
      titulo="Medicamentos"
      subtitulo="Cadastro de medicamentos usado nas receitas e no estoque"
      acoes={
        <Button onClick={abrirNovo} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo medicamento
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-[240px] flex-1"
          placeholder="Nome, princípio ativo ou registro ANVISA"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setBuscaAplicada(busca.trim())}
        />
        <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" className="gap-2" onClick={() => setBuscaAplicada(busca.trim())}>
          <Search className="h-4 w-4" />
          Pesquisar
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-md">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead>Medicamento</TableHead>
              <TableHead>Princípio ativo</TableHead>
              <TableHead>Via</TableHead>
              <TableHead className="text-right">Estoque mínimo</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!carregando && medicamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum medicamento encontrado.
                </TableCell>
              </TableRow>
            )}
            {!carregando &&
              medicamentos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-primary" />
                      {m.descricao_completa}
                      {m.controlado && <Badge variant="destructive">Controlado</Badge>}
                    </span>
                  </TableCell>
                  <TableCell>{m.principio_ativo}</TableCell>
                  <TableCell>{m.via_administracao_display}</TableCell>
                  <TableCell className="text-right">{m.estoque_minimo || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEdicao(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Excluir" onClick={() => setParaExcluir(m)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={formAberto} onOpenChange={setFormAberto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar medicamento" : "Novo medicamento"}</DialogTitle>
            <DialogDescription>A combinação de nome, concentração, unidade e forma não pode se repetir.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="principio">Princípio ativo *</Label>
              <Input id="principio" value={form.principio_ativo} onChange={(e) => atualizar("principio_ativo", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="concentracao">Concentração *</Label>
                <Input
                  id="concentracao"
                  placeholder="ex.: 500"
                  value={form.concentracao}
                  onChange={(e) => atualizar("concentracao", e.target.value)}
                />
              </div>
              <SelectCampo label="Unidade" value={form.unidade_medida} opcoes={UNIDADES_MEDIDA} onChange={(v) => atualizar("unidade_medida", v)} />
            </div>
            <SelectCampo
              label="Forma farmacêutica"
              value={form.forma_farmaceutica}
              opcoes={FORMAS_FARMACEUTICAS}
              onChange={(v) => atualizar("forma_farmaceutica", v)}
            />
            <SelectCampo
              label="Via de administração"
              value={form.via_administracao}
              opcoes={VIAS_ADMINISTRACAO}
              onChange={(v) => atualizar("via_administracao", v)}
            />
            <div className="space-y-1">
              <Label htmlFor="classe">Classe terapêutica</Label>
              <Input
                id="classe"
                placeholder="ex.: Analgésico"
                value={form.classe_terapeutica}
                onChange={(e) => atualizar("classe_terapeutica", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fabricante">Fabricante</Label>
              <Input id="fabricante" value={form.fabricante} onChange={(e) => atualizar("fabricante", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="registro">Registro ANVISA</Label>
              <Input id="registro" value={form.codigo_registro} onChange={(e) => atualizar("codigo_registro", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="minimo">Estoque mínimo por unidade</Label>
              <Input
                id="minimo"
                inputMode="numeric"
                value={form.estoque_minimo}
                onChange={(e) => atualizar("estoque_minimo", e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-xs text-muted-foreground">Em unidades de dispensação. 0 desativa o alerta.</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea id="obs" rows={2} value={form.observacoes} onChange={(e) => atualizar("observacoes", e.target.value)} />
            </div>
            <label className="flex items-center gap-3">
              <Switch checked={form.controlado} onCheckedChange={(v) => atualizar("controlado", v)} />
              <span className="text-sm font-medium">Medicamento controlado</span>
            </label>
            <label className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => atualizar("is_active", v)} />
              <span className="text-sm font-medium">Ativo (disponível para receitas e estoque)</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paraExcluir} onOpenChange={(open) => !open && setParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir medicamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {paraExcluir?.descricao_completa}. Medicamentos que já têm lotes ou receitas não podem ser excluídos — nesse caso,
              inative-os.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluir}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PaginaSistema>
  );
}
