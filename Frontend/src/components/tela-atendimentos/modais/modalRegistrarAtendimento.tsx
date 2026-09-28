import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, FileHeart } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Appointment } from "@/types/agenda";
import {
  CLASSIFICACAO_RISCO_OPCOES,
  mensagemErroApi,
  prontuarioService,
  type CidadaoProntuario,
  type ClassificacaoRisco,
  type RegistroAtendimentoPayload,
} from "@/services/prontuario/prontuarioService";
import { toast } from "@/lib/sonner";

interface ModalRegistrarAtendimentoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
}

const CAMPOS_TEXTO = ["queixa_principal", "subjetivo", "objetivo", "avaliacao", "cid", "plano"] as const;
const SINAIS_VITAIS = [
  { campo: "pressao_sistolica", label: "PA sistólica", unidade: "mmHg", decimal: false },
  { campo: "pressao_diastolica", label: "PA diastólica", unidade: "mmHg", decimal: false },
  { campo: "frequencia_cardiaca", label: "Freq. cardíaca", unidade: "bpm", decimal: false },
  { campo: "frequencia_respiratoria", label: "Freq. respiratória", unidade: "irpm", decimal: false },
  { campo: "temperatura", label: "Temperatura", unidade: "°C", decimal: true },
  { campo: "saturacao_o2", label: "Saturação O₂", unidade: "%", decimal: false },
  { campo: "glicemia_capilar", label: "Glicemia capilar", unidade: "mg/dL", decimal: false },
  { campo: "peso", label: "Peso", unidade: "kg", decimal: true },
  { campo: "altura", label: "Altura", unidade: "cm", decimal: false },
] as const;

type CampoTexto = (typeof CAMPOS_TEXTO)[number];
type CampoVital = (typeof SINAIS_VITAIS)[number]["campo"];
type Formulario = Record<CampoTexto | CampoVital, string> & { classificacao_risco: ClassificacaoRisco | "" };

const SEM_CLASSIFICACAO = "__nenhuma__";

const formularioVazio = (): Formulario => ({
  classificacao_risco: "",
  ...(Object.fromEntries([...CAMPOS_TEXTO, ...SINAIS_VITAIS.map((s) => s.campo)].map((c) => [c, ""])) as Record<
    CampoTexto | CampoVital,
    string
  >),
});

function paraPayload(form: Formulario, agendamento: string): RegistroAtendimentoPayload {
  const texto = (v: string) => v.trim() || null;
  const payload: Record<string, unknown> = {
    agendamento,
    classificacao_risco: form.classificacao_risco || null,
  };
  CAMPOS_TEXTO.forEach((c) => (payload[c] = texto(form[c])));
  payload.queixa_principal = form.queixa_principal.trim();
  SINAIS_VITAIS.forEach(({ campo, decimal }) => {
    const valor = form[campo].trim().replace(",", ".");
    payload[campo] = valor === "" ? null : decimal ? valor : Number(valor);
  });
  return payload as RegistroAtendimentoPayload;
}

export function ModalRegistrarAtendimento({ open, onOpenChange, appointment }: ModalRegistrarAtendimentoProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState<Formulario>(formularioVazio);
  const [registroId, setRegistroId] = useState<string | null>(null);
  const [paciente, setPaciente] = useState<CidadaoProntuario | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open || !appointment) return;
    setCarregando(true);
    setForm(formularioVazio());
    setRegistroId(null);
    setPaciente(null);

    const carregar = async () => {
      try {
        const [registro, prontuario] = await Promise.all([
          prontuarioService.buscarRegistroDoAgendamento(appointment.id),
          appointment.cidadaoId ? prontuarioService.obterProntuario(appointment.cidadaoId) : Promise.resolve(null),
        ]);
        setPaciente(prontuario?.cidadao ?? null);
        if (registro) {
          setRegistroId(registro.id);
          const preenchido = formularioVazio();
          (Object.keys(preenchido) as (keyof Formulario)[]).forEach((campo) => {
            const valor = registro[campo as keyof typeof registro];
            (preenchido as Record<string, string>)[campo] = valor === null || valor === undefined ? "" : String(valor);
          });
          setForm(preenchido);
        }
      } catch (err) {
        toast.error(mensagemErroApi(err, "Não foi possível carregar o registro do atendimento."));
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [open, appointment]);

  const atualizar = (campo: keyof Formulario, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  const salvar = async () => {
    if (!appointment) return;
    if (!form.queixa_principal.trim()) {
      toast.error("Informe a queixa principal.");
      return;
    }
    if (!!form.pressao_sistolica.trim() !== !!form.pressao_diastolica.trim()) {
      toast.error("Informe a pressão sistólica e a diastólica juntas.");
      return;
    }

    setSalvando(true);
    try {
      const payload = paraPayload(form, appointment.id);
      if (registroId) {
        await prontuarioService.atualizarRegistro(registroId, payload);
      } else {
        const criado = await prontuarioService.criarRegistro(payload);
        setRegistroId(criado.id);
      }
      toast.success("Atendimento registrado.");
      onOpenChange(false);
    } catch (err) {
      toast.error(mensagemErroApi(err, "Erro ao salvar o registro do atendimento."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{registroId ? "Editar registro do atendimento" : "Registrar atendimento"}</DialogTitle>
          <DialogDescription>
            {appointment ? `${appointment.nomeCidadao} · ${appointment.servico}` : ""}
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-5">
            {(paciente?.alergias || paciente?.condicoes_cronicas) && (
              <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div className="space-y-1">
                  {paciente.alergias && (
                    <p>
                      <strong>Alergias:</strong> {paciente.alergias}
                    </p>
                  )}
                  {paciente.condicoes_cronicas && (
                    <p>
                      <strong>Condições crônicas:</strong> {paciente.condicoes_cronicas}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="queixa">Queixa principal *</Label>
                <Input id="queixa" value={form.queixa_principal} onChange={(e) => atualizar("queixa_principal", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Classificação de risco</Label>
                <Select
                  value={form.classificacao_risco || SEM_CLASSIFICACAO}
                  onValueChange={(v) => atualizar("classificacao_risco", v === SEM_CLASSIFICACAO ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_CLASSIFICACAO}>Não classificado</SelectItem>
                    {CLASSIFICACAO_RISCO_OPCOES.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        <span className="flex items-center gap-2">
                          <span className={`inline-block h-3 w-3 rounded-full ${op.cor}`} />
                          {op.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <fieldset className="rounded-lg border p-3">
              <legend className="px-1 text-sm font-semibold">Sinais vitais</legend>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                {SINAIS_VITAIS.map(({ campo, label, unidade, decimal }) => (
                  <div key={campo} className="space-y-1">
                    <Label htmlFor={campo} className="text-xs">
                      {label} <span className="text-muted-foreground">({unidade})</span>
                    </Label>
                    <Input
                      id={campo}
                      inputMode={decimal ? "decimal" : "numeric"}
                      value={form[campo]}
                      onChange={(e) => atualizar(campo, e.target.value.replace(decimal ? /[^\d.,]/g : /\D/g, ""))}
                    />
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="subjetivo">Subjetivo (história)</Label>
                <Textarea id="subjetivo" rows={4} value={form.subjetivo} onChange={(e) => atualizar("subjetivo", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="objetivo">Objetivo (exame físico)</Label>
                <Textarea id="objetivo" rows={4} value={form.objetivo} onChange={(e) => atualizar("objetivo", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="avaliacao">Avaliação</Label>
                <Textarea id="avaliacao" rows={3} value={form.avaliacao} onChange={(e) => atualizar("avaliacao", e.target.value)} />
                <div className="flex items-center gap-2 pt-1">
                  <Label htmlFor="cid" className="whitespace-nowrap text-xs">
                    CID-10
                  </Label>
                  <Input
                    id="cid"
                    className="w-28"
                    placeholder="ex.: J06.9"
                    value={form.cid}
                    onChange={(e) => atualizar("cid", e.target.value.toUpperCase())}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="plano">Plano / conduta</Label>
                <Textarea id="plano" rows={4} value={form.plano} onChange={(e) => atualizar("plano", e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              {appointment?.cidadaoId ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2"
                  onClick={() => navigate(`/sistema/prontuario?cidadao=${appointment.cidadaoId}`)}
                >
                  <FileHeart className="h-4 w-4" />
                  Ver prontuário completo
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar registro"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
