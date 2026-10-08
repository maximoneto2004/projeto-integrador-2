import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, FileHeart, Pencil, Printer, ReceiptText, Search, Stethoscope } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCpf } from "@/utils/cpfFormater";
import { imprimirReceita } from "@/utils/imprimirReceita";
import { cidadaoService } from "@/services/sistema/cidadaoService";
import {
  CLASSIFICACAO_RISCO_OPCOES,
  mensagemErroApi,
  prontuarioService,
  type ProntuarioPaciente,
  type RegistroAtendimento,
} from "@/services/prontuario/prontuarioService";
import type { Receita } from "@/services/prontuario/receitaService";
import { toast } from "@/lib/sonner";

type ResultadoBusca = { id: string; nome: string; cpf: string; cns?: string | null; data_nascimento?: string | null };
type EventoLinhaDoTempo =
  | { tipo: "atendimento"; data: string; item: RegistroAtendimento }
  | { tipo: "receita"; data: string; item: Receita };

function formatarData(iso?: string | null, comHora = false) {
  if (!iso) return "-";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return comHora ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : d.toLocaleDateString("pt-BR");
}

function idade(dataNascimento?: string | null) {
  if (!dataNascimento) return null;
  const nasc = new Date(`${dataNascimento}T00:00:00`);
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())) anos -= 1;
  return anos;
}

function SinaisVitais({ r }: { r: RegistroAtendimento }) {
  const itens = [
    r.pressao_sistolica != null && `PA ${r.pressao_sistolica}/${r.pressao_diastolica} mmHg`,
    r.frequencia_cardiaca != null && `FC ${r.frequencia_cardiaca} bpm`,
    r.frequencia_respiratoria != null && `FR ${r.frequencia_respiratoria} irpm`,
    r.temperatura != null && `T ${r.temperatura} °C`,
    r.saturacao_o2 != null && `SpO₂ ${r.saturacao_o2}%`,
    r.glicemia_capilar != null && `Glicemia ${r.glicemia_capilar} mg/dL`,
    r.peso != null && `Peso ${r.peso} kg`,
    r.altura != null && `Altura ${r.altura} cm`,
    r.imc != null && `IMC ${r.imc}`,
  ].filter(Boolean);
  if (!itens.length) return null;
  return <p className="text-sm text-muted-foreground">{itens.join(" · ")}</p>;
}

function CartaoAtendimento({ r }: { r: RegistroAtendimento }) {
  const risco = CLASSIFICACAO_RISCO_OPCOES.find((o) => o.value === r.classificacao_risco);
  const secoes = [
    ["Subjetivo", r.subjetivo],
    ["Objetivo", r.objetivo],
    ["Avaliação", r.avaliacao ? `${r.avaliacao}${r.cid ? ` (CID ${r.cid})` : ""}` : r.cid ? `CID ${r.cid}` : null],
    ["Plano", r.plano],
  ].filter(([, v]) => v);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{r.servico_nome}</CardTitle>
          {risco && (
            <Badge className={`${risco.cor} text-white`} title={risco.label}>
              {risco.label.split(" - ")[0]}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatarData(r.created_at, true)} · {r.profissional_nome} · {r.unidade_nome}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">
          <strong>Queixa:</strong> {r.queixa_principal}
        </p>
        <SinaisVitais r={r} />
        {secoes.map(([titulo, texto]) => (
          <p key={titulo} className="whitespace-pre-line text-sm">
            <strong>{titulo}:</strong> {texto}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function CartaoReceita({ r }: { r: Receita }) {
  return (
    <Card className="border-indigo-200">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <ReceiptText className="h-4 w-4 text-indigo-700" />
          <CardTitle className="text-base">Receita</CardTitle>
          {r.vencida && <Badge variant="destructive">Vencida</Badge>}
          <Button type="button" variant="outline" size="sm" className="ml-auto gap-1" onClick={() => imprimirReceita(r)}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatarData(r.data_emissao, true)} · {r.profissional_nome || "-"} · válida até {formatarData(r.data_validade)}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm">
          {r.medicamentos.map((m) => (
            <li key={m.id}>
              <strong>{m.nome}</strong> — {m.dosagem}, {m.frequencia}, {m.duracao}
              {!m.legado && (
                <span className="text-muted-foreground">
                  {" "}
                  ({m.quantidade_dispensada}/{m.quantidade_prescrita} dispensado)
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DadosClinicos({ prontuario, onSalvo }: { prontuario: ProntuarioPaciente; onSalvo: () => void }) {
  const { cidadao } = prontuario;
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ cns: "", alergias: "", condicoes_cronicas: "" });

  const iniciarEdicao = () => {
    setForm({ cns: cidadao.cns ?? "", alergias: cidadao.alergias ?? "", condicoes_cronicas: cidadao.condicoes_cronicas ?? "" });
    setEditando(true);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await prontuarioService.atualizarDadosClinicos(cidadao.id, {
        cns: form.cns.trim() || null,
        alergias: form.alergias.trim() || null,
        condicoes_cronicas: form.condicoes_cronicas.trim() || null,
      });
      toast.success("Dados clínicos atualizados.");
      setEditando(false);
      onSalvo();
    } catch (err) {
      toast.error(mensagemErroApi(err, "Erro ao salvar os dados clínicos."));
    } finally {
      setSalvando(false);
    }
  };

  const anos = idade(cidadao.data_nascimento);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-2xl">{cidadao.nome}</CardTitle>
          <p className="text-sm text-muted-foreground">
            CPF {formatCpf(cidadao.cpf) || "-"}
            {anos !== null && ` · ${anos} anos`}
            {cidadao.sexo_display && ` · ${cidadao.sexo_display}`}
            {` · CNS ${cidadao.cns || "não informado"}`}
          </p>
        </div>
        {!editando && (
          <Button variant="outline" size="sm" className="gap-2" onClick={iniciarEdicao}>
            <Pencil className="h-4 w-4" />
            Editar dados clínicos
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editando ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="cns">Cartão Nacional de Saúde (CNS)</Label>
              <Input id="cns" inputMode="numeric" value={form.cns} onChange={(e) => setForm({ ...form, cns: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="alergias">Alergias</Label>
              <Textarea id="alergias" rows={2} value={form.alergias} onChange={(e) => setForm({ ...form, alergias: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="condicoes">Condições crônicas</Label>
              <Textarea
                id="condicoes"
                rows={2}
                value={form.condicoes_cronicas}
                onChange={(e) => setForm({ ...form, condicoes_cronicas: e.target.value })}
              />
            </div>
            <div className="flex gap-2 md:col-span-3">
              <Button onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="ghost" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <p>
              <strong>Alergias:</strong>{" "}
              {cidadao.alergias ? <span className="text-red-700">{cidadao.alergias}</span> : "Nenhuma informada"}
            </p>
            <p>
              <strong>Condições crônicas:</strong> {cidadao.condicoes_cronicas || "Nenhuma informada"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminProntuarioPaciente() {
  const [searchParams, setSearchParams] = useSearchParams();
  const cidadaoId = searchParams.get("cidadao") || "";

  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [prontuario, setProntuario] = useState<ProntuarioPaciente | null>(null);
  const [carregando, setCarregando] = useState(false);

  const carregarProntuario = async (id: string) => {
    setCarregando(true);
    try {
      setProntuario(await prontuarioService.obterProntuario(id));
    } catch (err) {
      setProntuario(null);
      toast.error(mensagemErroApi(err, "Não foi possível carregar o prontuário."));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (cidadaoId) carregarProntuario(cidadaoId);
    else setProntuario(null);
  }, [cidadaoId]);

  const buscar = async () => {
    const busca = termo.trim();
    if (busca.length < 3) {
      toast.error("Digite pelo menos 3 caracteres.");
      return;
    }
    setBuscando(true);
    try {
      // CPF/CNS digitados com máscara são enviados só com os dígitos.
      const termoApi = /^[\d.\-\s]+$/.test(busca) ? busca.replace(/\D/g, "") : busca;
      const { data } = await cidadaoService.listar({ search: termoApi });
      setResultados(((data as unknown as { results?: ResultadoBusca[] }).results ?? []).slice(0, 50));
    } catch (err) {
      toast.error(mensagemErroApi(err, "Erro ao buscar pacientes."));
    } finally {
      setBuscando(false);
    }
  };

  const linhaDoTempo = useMemo<EventoLinhaDoTempo[]>(() => {
    if (!prontuario) return [];
    const eventos: EventoLinhaDoTempo[] = [
      ...prontuario.atendimentos.map((item) => ({ tipo: "atendimento" as const, data: item.created_at, item })),
      ...prontuario.receitas.map((item) => ({ tipo: "receita" as const, data: item.data_emissao, item })),
    ];
    return eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [prontuario]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <div className="flex flex-1 flex-col">
          <SidebarInset>
            <div className="container mx-auto space-y-6 p-6">
              <div className="flex items-center gap-3">
                <FileHeart className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Prontuário do paciente</h1>
                  <p className="text-muted-foreground">Histórico de atendimentos e receitas</p>
                </div>
              </div>

              {!cidadaoId && (
                <div className="space-y-4 rounded-lg border bg-card p-6">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Nome, CPF ou CNS do paciente"
                      value={termo}
                      onChange={(e) => setTermo(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && buscar()}
                    />
                    <Button onClick={buscar} disabled={buscando} className="gap-2">
                      <Search className="h-4 w-4" />
                      {buscando ? "Buscando..." : "Buscar"}
                    </Button>
                  </div>
                  {resultados && (
                    <ul className="divide-y rounded-md border">
                      {resultados.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nenhum paciente encontrado.</li>}
                      {resultados.map((c) => (
                        <li key={c.id}>
                          <button
                            className="flex w-full items-center justify-between p-3 text-left hover:bg-accent"
                            onClick={() => setSearchParams({ cidadao: c.id })}
                          >
                            <span className="font-medium">{c.nome}</span>
                            <span className="text-sm text-muted-foreground">
                              CPF {formatCpf(c.cpf)}
                              {c.data_nascimento && ` · nasc. ${formatarData(c.data_nascimento)}`}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {cidadaoId && (
                <>
                  <Button variant="ghost" className="gap-2" onClick={() => setSearchParams({})}>
                    <ArrowLeft className="h-4 w-4" />
                    Buscar outro paciente
                  </Button>
                  {carregando && <p className="text-sm text-muted-foreground">Carregando prontuário...</p>}
                  {!carregando && prontuario && (
                    <>
                      <DadosClinicos prontuario={prontuario} onSalvo={() => carregarProntuario(cidadaoId)} />
                      <div className="space-y-3">
                        <h2 className="text-xl font-semibold">Linha do tempo</h2>
                        {linhaDoTempo.length === 0 && (
                          <p className="text-sm text-muted-foreground">Nenhum atendimento ou receita registrado.</p>
                        )}
                        {linhaDoTempo.map((evento) =>
                          evento.tipo === "atendimento" ? (
                            <CartaoAtendimento key={`a-${evento.item.id}`} r={evento.item} />
                          ) : (
                            <CartaoReceita key={`r-${evento.item.id}`} r={evento.item} />
                          ),
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
