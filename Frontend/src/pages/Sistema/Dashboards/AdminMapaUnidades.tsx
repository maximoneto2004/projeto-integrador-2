import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isValid, parseISO, subDays } from "date-fns";
import { isCargoProfissionalSaude } from "@/security/acess";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";
import { api } from "@/services/api";
import { UnidadeDetalheDialog } from "../../../components/dashboard-gestor/UnidadeDetalheDialog";
import { getEficiencia } from "../../../components/dashboard-gestor/UnidadeDetalheDialog";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useMapaMedicamentos } from "@/hooks/sistema/useMapaMedicamentos";
import { MedicamentosHeatLayer } from "@/components/dashboard-gestor/mapa/MedicamentosHeatLayer";
import { MedicamentosHeatControls } from "@/components/dashboard-gestor/mapa/MedicamentosHeatControls";
import { nomeMedicamento } from "@/lib/mapaAssistencial";
import { formatSla } from "@/lib/sla";
import type { AnaliseUnidade, DemandaUnidade, MedicamentoMapa } from "@/types/mapaAssistencial";

type OrigemAtendimento = "156" | "RECEPCAO" | "SITE" | "FILA";
type OrigemAtendimentoCount = Record<OrigemAtendimento, number>;

export type ServicoMetrica = {
  servicoId: string;
  servicoNome: string;
  tipoServicoNome: string;
  esperadoMin: number;
  total: number;
  tempoMedioEsperaMin: number;
  tempoMedioAtendimentoMin: number | null;
  tempoExcedenteMedioMin: number;
  pctAcimaEsperado: number;
};

export type UnidadeMetricas = {
  atendimentosMensaisTotal: number;
  atendimentosMensaisComum: number;
  atendimentosMensaisEspecializado: number;
  profissionaisTotal: number;
  profissionais: UnidadeProfissional[];
  tempoMedioAtendimentoMin: number;
  tempoMedioEsperadoMin: number;
  tempoMedioAtendimentoComumMin: number;
  tempoMedioAtendimentoEspecializadoMin: number;
  tempoMedioEsperadoComumMin: number;
  tempoMedioEsperadoEspecializadoMin: number;

  origem156: number;
  origemRecepcao: number;
  origemSite: number;
  origemFila: number;

  servicosDistintos30d: number;
  servicosPrestados30d: number;
  tempoMedioEsperaMin: number;
  tempoExcedenteMedioMin: number;
  pctAcimaEsperado: number;
  servicosMetricas: ServicoMetrica[];
};

export type UnidadeProfissional = {
  id: string;
  nome: string;
  cargo: string;
  cpf: string;
  contato: string;
  email: string;
  ehAtendente: boolean;
  notaMedia: number | null;
  totalAvaliacoes: number;
};

export type UnidadeMapa = {
  analise?: AnaliseUnidade | null;
  id: string;
  nome: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cep: string;
  bairroId: string;
  bairroNome: string;
  bairrosAbrangencia: Array<{ id: string; nome: string }>;
  telefone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string | null;
  metricas: UnidadeMetricas;
};

type MapaUnidadeApi = {
  analise?: AnaliseUnidade | null;
  id: string;
  nome: string;
  created_at: string | null;
  logradouro: string;
  numero: string;
  complemento: string | null;
  cep: string;
  bairro: { id: string; nome: string } | null;
  telefone: string;
  email: string;
  latitude: string | number | null;
  longitude: string | number | null;
  bairros_abrangencia?: Array<{ id: string; nome: string }> | null;
  metricas?: {
    atendimentos_total?: number | null;
    atendimentos_comum_30d?: number | null;
    atendimentos_especializado_30d?: number | null;
    profissionais_total?: number | null;
    profissionais?: Array<{
      id?: string;
      nome?: string;
      nota_media?: number | null;
      total_avaliacoes?: number | null;
      profissional?: {
        id?: string;
        nome_completo?: string;
        cpf?: string;
        telefone?: string;
        email?: string;
        groups?: Array<{ id?: string; name?: string }> | null;
      } | null;
    }> | null;
    tempo_medio_atendimento_min?: number | null;
    tempo_medio_esperado_min?: number | null;
    tempo_medio_atendimento_comum_min?: number | null;
    tempo_medio_atendimento_especializado_min?: number | null;
    tempo_medio_esperado_comum_min?: number | null;
    tempo_medio_esperado_especializado_min?: number | null;
    origem_atendimentos?: Partial<Record<OrigemAtendimento, number>> | null;
    servicos_distintos_30d?: number | null;
    servicos_prestados_30d?: number | null;
    tempo_medio_espera_min?: number | null;
    tempo_excedente_medio_min?: number | null;
    pct_acima_esperado?: number | null;
    servicos_metricas?: Array<{
      servico_id?: string;
      servico_nome?: string;
      tipo_servico_nome?: string;
      esperado_min?: number | string | null;
      total?: number | string | null;
      tempo_medio_espera_min?: number | string | null;
      tempo_medio_atendimento_min?: number | string | null;
      tempo_excedente_medio_min?: number | string | null;
      pct_acima_esperado?: number | string | null;
    }> | null;
  } | null;
};

export type UnidadeSeriePonto = {
  data: string;
  atendimentosTotal: number;
  finalizadosTotal: number;
  tempoMedioEsperaMin: number | null;
  tempoMedioAtendimentoMin: number | null;
  tempoMedioEsperadoMin: number | null;
  tempoExcedenteMedioMin: number | null;
  pctAcimaEsperado: number | null;
};

type MapaUnidadesApiResponse = {
  success?: boolean;
  result?: MapaUnidadeApi[] | MapaUnidadeApi;
  results?: {
    data_inicio?: string;
    data_fim?: string;
    unidades?: MapaUnidadeApi[];
  };
};

type MapaUnidadeSerieApiItem = {
  data?: string | null;
  atendimentos_total?: number | string | null;
  finalizados_total?: number | string | null;
  tempo_medio_espera_min?: number | string | null;
  tempo_medio_atendimento_min?: number | string | null;
  tempo_medio_esperado_min?: number | string | null;
  tempo_excedente_medio_min?: number | string | null;
  pct_acima_esperado?: number | string | null;
};

type MapaUnidadeSeriesApiResponse = {
  success?: boolean;
  results?: {
    unidade_id?: string;
    created_at?: string | null;
    data_inicio?: string;
    data_fim?: string;
    serie?: MapaUnidadeSerieApiItem[] | null;
  };
};

const extractApiList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as {
    result?: unknown;
    results?: unknown;
  };

  if (Array.isArray(obj.result)) return obj.result as T[];
  if (Array.isArray(obj.results)) return obj.results as T[];

  if (obj.results && typeof obj.results === "object") {
    const nested = obj.results as { result?: unknown; unidades?: unknown };
    if (Array.isArray(nested.result)) return nested.result as T[];
    if (Array.isArray(nested.unidades)) return nested.unidades as T[];
  }

  return [];
};

const extractApiItem = <T,>(payload: unknown): T | null => {
  if (payload && typeof payload === "object") {
    const obj = payload as { result?: unknown };
    if (obj.result && typeof obj.result === "object" && !Array.isArray(obj.result)) {
      return obj.result as T;
    }
    if (!Array.isArray(payload)) return payload as T;
  }
  return null;
};

const toRecord = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" ? (value as Record<string, unknown>) : null);

const TEMPO_META_PADRAO_MIN = 20;

const EMPTY_METRICAS: UnidadeMetricas = {
  atendimentosMensaisTotal: 0,
  atendimentosMensaisComum: 0,
  atendimentosMensaisEspecializado: 0,
  profissionaisTotal: 0,
  profissionais: [],
  tempoMedioAtendimentoMin: 0,
  tempoMedioEsperadoMin: 0,
  tempoMedioAtendimentoComumMin: 0,
  tempoMedioAtendimentoEspecializadoMin: 0,
  tempoMedioEsperadoComumMin: 0,
  tempoMedioEsperadoEspecializadoMin: 0,
  origem156: 0,
  origemRecepcao: 0,
  origemSite: 0,
  origemFila: 0,
  servicosDistintos30d: 0,
  servicosPrestados30d: 0,
  tempoMedioEsperaMin: 0,
  tempoExcedenteMedioMin: 0,
  pctAcimaEsperado: 0,
  servicosMetricas: [],
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "string" && value.trim() === "") return fallback;
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

const extractNumbers = (value: unknown): number[] => {
  if (typeof value !== "string") return [];
  const matches = value.trim().match(/[-+]?\d+(?:[.,]\d+)?/g);
  if (!matches?.length) return [];
  return matches.map((m) => Number(m.replace(",", "."))).filter((n) => Number.isFinite(n));
};

const parseCoordValue = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [first] = extractNumbers(trimmed);
  return typeof first === "number" && Number.isFinite(first) ? first : null;
};

const parseLatLng = (rawLatitude: unknown, rawLongitude: unknown): { latitude: number | null; longitude: number | null } => {
  let latitude = parseCoordValue(rawLatitude);
  let longitude = parseCoordValue(rawLongitude);

  if (latitude === null || longitude === null) {
    const fromLat = extractNumbers(rawLatitude);
    const fromLon = extractNumbers(rawLongitude);
    const pair = fromLat.length >= 2 ? fromLat : fromLon.length >= 2 ? fromLon : [];
    if (pair.length >= 2) {
      if (latitude === null) latitude = pair[0];
      if (longitude === null) longitude = pair[1];
    }
  }

  if (latitude !== null && (latitude < -90 || latitude > 90)) latitude = null;
  if (longitude !== null && (longitude < -180 || longitude > 180)) longitude = null;

  return { latitude, longitude };
};

const formatPct = (v: number) => `${v}%`;

const houseSvg = (fill: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${fill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 10.5 12 3l9 7.5" />
  <path d="M5 10.5V21h14V10.5" />
  <path d="M9 21v-7h6v7" />
</svg>
`;

const createHouseIcon = () =>
  L.divIcon({
    className: "cras-house-marker",
    html: `
      <div class="cras-house-marker__bubble">
        ${houseSvg("#ffffff")}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });

const parseOrigemAtendimentos = (raw: unknown): OrigemAtendimentoCount => {
  const base: OrigemAtendimentoCount = { "156": 0, RECEPCAO: 0, SITE: 0, FILA: 0 };
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  base["156"] = toNumber(obj["156"], 0);
  base.RECEPCAO = toNumber(obj.RECEPCAO, 0);
  base.SITE = toNumber(obj.SITE, 0);
  base.FILA = toNumber(obj.FILA, 0);
  return base;
};

const parseProfissionaisUnidade = (raw: unknown): UnidadeProfissional[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const row = toRecord(item);
      if (!row) return null;

      const profissional = toRecord(row.profissional);
      const groups = Array.isArray(profissional?.groups) ? profissional.groups : [];
      const cargos = groups
        .map((g) => {
          const group = toRecord(g);
          return String(group?.name ?? "").trim();
        })
        .filter(Boolean);

      const cargo = cargos.length ? cargos.join(", ") : "-";
      const ehAtendente = cargos.some(isCargoProfissionalSaude);
      const notaMedia = ehAtendente ? toNumber(row.nota_media, 0) : null;

      return {
        id: String(row.id ?? profissional?.id ?? ""),
        nome: String(profissional?.nome_completo ?? row.nome ?? "").trim(),
        cargo,
        cpf: String(profissional?.cpf ?? "").trim(),
        contato: String(profissional?.telefone ?? "").trim(),
        email: String(profissional?.email ?? "").trim(),
        ehAtendente,
        notaMedia,
        totalAvaliacoes: ehAtendente ? toNumber(row.total_avaliacoes, 0) : 0,
      } as UnidadeProfissional;
    })
    .filter((p): p is UnidadeProfissional => Boolean(p?.id || p?.nome))
    .sort((a, b) => a.nome.localeCompare(b.nome));
};

const parseServicosMetricas = (raw: unknown): ServicoMetrica[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const row = toRecord(item);
      if (!row) return null;

      const servicoId = String(row.servico_id ?? "").trim();
      if (!servicoId) return null;

      return {
        servicoId,
        servicoNome: String(row.servico_nome ?? "").trim() || `Serviço ${servicoId}`,
        tipoServicoNome: String(row.tipo_servico_nome ?? "").trim() || "-",
        esperadoMin: toNumber(row.esperado_min, TEMPO_META_PADRAO_MIN),
        total: toNumber(row.total, 0),
        tempoMedioEsperaMin: toNumber(row.tempo_medio_espera_min, 0),
        tempoMedioAtendimentoMin: toNumber(row.tempo_medio_atendimento_min, 0),
        tempoExcedenteMedioMin: toNumber(row.tempo_excedente_medio_min, 0),
        pctAcimaEsperado: toNumber(row.pct_acima_esperado, 0),
      } as ServicoMetrica;
    })
    .filter((s): s is ServicoMetrica => Boolean(s))
    .sort((a, b) => b.total - a.total);
};

const parseUnidadeMetricas = (raw: MapaUnidadeApi["metricas"] | null | undefined): UnidadeMetricas => {
  if (!raw || typeof raw !== "object") return { ...EMPTY_METRICAS };

  const origem = parseOrigemAtendimentos(raw.origem_atendimentos);

  return {
    atendimentosMensaisTotal: toNumber(raw.atendimentos_total, 0),
    atendimentosMensaisComum: toNumber(raw.atendimentos_comum_30d, 0),
    atendimentosMensaisEspecializado: toNumber(raw.atendimentos_especializado_30d, 0),
    profissionaisTotal: toNumber(raw.profissionais_total, 0),
    profissionais: parseProfissionaisUnidade(raw.profissionais),
    tempoMedioAtendimentoMin: toNumber(raw.tempo_medio_atendimento_min, 0),
    tempoMedioEsperadoMin: toNumber(raw.tempo_medio_esperado_min, 0),
    tempoMedioAtendimentoComumMin: toNumber(raw.tempo_medio_atendimento_comum_min, 0),
    tempoMedioAtendimentoEspecializadoMin: toNumber(raw.tempo_medio_atendimento_especializado_min, 0),
    tempoMedioEsperadoComumMin: toNumber(raw.tempo_medio_esperado_comum_min, 0),
    tempoMedioEsperadoEspecializadoMin: toNumber(raw.tempo_medio_esperado_especializado_min, 0),
    origem156: origem["156"],
    origemRecepcao: origem.RECEPCAO,
    origemSite: origem.SITE,
    origemFila: origem.FILA,
    servicosDistintos30d: toNumber(raw.servicos_distintos_30d, 0),
    servicosPrestados30d: toNumber(raw.servicos_prestados_30d, 0),
    tempoMedioEsperaMin: toNumber(raw.tempo_medio_espera_min, 0),
    tempoExcedenteMedioMin: toNumber(raw.tempo_excedente_medio_min, 0),
    pctAcimaEsperado: toNumber(raw.pct_acima_esperado, 0),
    servicosMetricas: parseServicosMetricas(raw.servicos_metricas),
  };
};

const parseUnidadeMapa = (raw: MapaUnidadeApi): UnidadeMapa => {
  const bairroId = String(raw?.bairro?.id ?? "");
  const bairroNome = String(raw?.bairro?.nome ?? "");
  const coords = parseLatLng(raw?.latitude, raw?.longitude);

  return {
    analise: raw.analise,
    id: String(raw?.id ?? ""),
    nome: String(raw?.nome ?? ""),
    createdAt: raw?.created_at ?? null,
    logradouro: String(raw?.logradouro ?? ""),
    numero: String(raw?.numero ?? ""),
    complemento: String(raw?.complemento ?? ""),
    cep: String(raw?.cep ?? ""),
    bairroId,
    bairroNome,
    bairrosAbrangencia: Array.isArray(raw?.bairros_abrangencia)
      ? raw.bairros_abrangencia
          .filter(Boolean)
          .map((b) => ({ id: String(b.id ?? ""), nome: String(b.nome ?? "") }))
          .filter((b) => Boolean(b.id))
      : [],
    telefone: String(raw?.telefone ?? ""),
    email: String(raw?.email ?? ""),
    latitude: coords.latitude,
    longitude: coords.longitude,
    metricas: {
      ...parseUnidadeMetricas(raw?.metricas),
      ...(raw.analise ? { tempoMedioAtendimentoMin: raw.analise.media_min } : {}),
    },
  };
};

const parseSeriePontos = (payload: unknown): UnidadeSeriePonto[] => {
  const obj = toRecord(payload);
  const results = toRecord(obj?.results);
  const serie = Array.isArray(results?.serie) ? results.serie : [];

  return serie
    .map((item) => {
      const row = toRecord(item);
      const data = String(row?.data ?? "").trim();
      if (!data) return null;

      return {
        data,
        atendimentosTotal: toNumber(row?.atendimentos_total, 0),
        finalizadosTotal: toNumber(row?.finalizados_total, 0),
        tempoMedioEsperaMin: toNumber(row?.tempo_medio_espera_min, 0),
        tempoMedioAtendimentoMin: toNumber(row?.tempo_medio_atendimento_min, 0),
        tempoMedioEsperadoMin: toNumber(row?.tempo_medio_esperado_min, 0),
        tempoExcedenteMedioMin: toNumber(row?.tempo_excedente_medio_min, 0),
        pctAcimaEsperado: toNumber(row?.pct_acima_esperado, 0),
      } as UnidadeSeriePonto;
    })
    .filter((item): item is UnidadeSeriePonto => Boolean(item));
};

function FitBounds({ pontos }: { pontos: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!pontos.length) return;
    const bounds = L.latLngBounds(pontos.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(bounds.pad(0.18), { animate: true, duration: 0.6 });
  }, [map, pontos]);

  return null;
}

function FlyTo({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position, 14, { duration: 1.1 });
  }, [map, position]);

  return null;
}

function UnidadePopup({ unidade, metricas, demanda, medicamento }: {
  unidade: UnidadeMapa; metricas: UnidadeMetricas; demanda?: DemandaUnidade; medicamento?: MedicamentoMapa | null;
}) {
  const eficiencia = getEficiencia(
    metricas.pctAcimaEsperado,
    metricas.tempoMedioAtendimentoComumMin,
    metricas.tempoMedioEsperadoComumMin,
  );

  return (
    <div className="min-w-[280px] space-y-2 text-sm">
      <div className="min-w-0">
        <div className="font-semibold leading-tight break-words">{unidade.nome || `Unidade ${unidade.id}`}</div>
        <div className="text-xs text-muted-foreground">{unidade.logradouro}, {unidade.numero} · {unidade.bairroNome}</div>
        <div className="text-xs text-muted-foreground">Indicadores no período selecionado</div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <div className="text-xs text-muted-foreground">Atendimentos</div>
          <div className="font-medium">{metricas.atendimentosMensaisTotal}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Espera média</div>
          <div className="font-medium">{metricas.tempoMedioEsperaMin} min</div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Profissionais</div>
          <div className="font-medium">{metricas.profissionaisTotal}</div>
        </div>

        <div className="col-span-2">
          <div className="text-xs text-muted-foreground">Tipos de atendimento (origem)</div>
          <div className="font-medium">
            Recepção: {metricas.origemRecepcao} · Fila: {metricas.origemFila} · Site: {metricas.origemSite} · 156: {metricas.origem156}
          </div>
        </div>

        <div className="col-span-2">
          <div className="text-xs text-muted-foreground">Serviços (30d)</div>
          <div className="font-medium">
            {metricas.servicosPrestados30d} atendimentos · {metricas.servicosDistintos30d} tipos · aderência à meta:{" "}
            {eficiencia === null ? "-" : eficiencia.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            Excedente médio: {metricas.tempoExcedenteMedioMin} min · meta média:{" "}
            {metricas.tempoMedioEsperadoMin > 0 ? `${metricas.tempoMedioEsperadoMin} min` : "-"}
          </div>
        </div>
      </div>
      {medicamento && <div className="rounded-lg bg-primary/10 p-2"><p className="font-medium">{nomeMedicamento(medicamento)}</p><p>{demanda?.solicitacoes ?? 0} receitas nesta unidade</p></div>}
      {unidade.analise && <div className="space-y-2 border-t pt-2">
        <div><p className="font-semibold">Serviços e tempo médio</p>
          {unidade.analise.servicos.slice(0, 3).map((servico) => <div key={servico.id} className="flex justify-between gap-3 text-xs"><span>{servico.nome}</span><span className="whitespace-nowrap">{formatSla(servico.media_min)}</span></div>)}
          {!unidade.analise.servicos.length && <p className="text-xs">Nenhum serviço informado.</p>}
        </div>
        <div><p className="font-semibold">Medicamentos mais solicitados</p>
          {unidade.analise.medicamentos.slice(0, 3).map((med) => <p key={med.id} className="text-xs">{med.nome} {med.concentracao} {med.unidade_medida.toLowerCase()}: {med.solicitacoes} receitas</p>)}
          {!unidade.analise.medicamentos.length && <p className="text-xs">Nenhuma solicitação no período.</p>}
        </div>
        <p className="text-xs text-primary">Clique na unidade para ver todos os detalhes.</p>
      </div>}
    </div>
  );
}

export default function AdminMapaUnidades() {
  const DEFAULT_POSITION: [number, number] = [-3.7319, -38.5267];
  const [unidades, setUnidades] = useState<UnidadeMapa[]>([]);
  const [loading, setLoading] = useState(false);
  const [unidadesError, setUnidadesError] = useState<string | null>(null);

  const periodo30d = useMemo(() => {
    const hoje = new Date();
    return {
      dataInicio: format(subDays(hoje, 30), "yyyy-MM-dd"),
      dataFim: format(hoje, "yyyy-MM-dd"),
    };
  }, []);

  const [busca, setBusca] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState(periodo30d.dataInicio);
  const [filtroDataFim, setFiltroDataFim] = useState(periodo30d.dataFim);
  const [camada, setCamada] = useState<"unidades" | "medicamentos">("unidades");
  const [medicamentoId, setMedicamentoId] = useState("");
  const medicamentosMapa = useMapaMedicamentos({
    data_inicio: filtroDataInicio, data_fim: filtroDataFim, medicamento_id: medicamentoId || undefined,
  }, camada === "medicamentos");
  const [filtroBairro, setFiltroBairro] = useState("todos");
  const [filtroUnidadeId, setFiltroUnidadeId] = useState("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<UnidadeMapa | null>(null);

  const [seriePontos, setSeriePontos] = useState<UnidadeSeriePonto[] | null>(null);
  const [serieLoading, setSerieLoading] = useState(false);
  const [serieError, setSerieError] = useState<string | null>(null);
  const [serieDataInicio, setSerieDataInicio] = useState(periodo30d.dataInicio);
  const [serieDataFim, setSerieDataFim] = useState(periodo30d.dataFim);
  const requisicaoMapa = useRef(0);
  const requisicaoDetalhe = useRef(0);

  const fetchMapaUnidades = useCallback(async () => {
    const requisicao = ++requisicaoMapa.current;
    if (filtroDataInicio && filtroDataFim && filtroDataInicio > filtroDataFim) {
      setUnidadesError("Data de início não pode ser maior que data fim.");
      setUnidades([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setUnidadesError(null);

    try {
      const { data } = await api.get<MapaUnidadesApiResponse>("/mapa_unidades/", {
        params: { data_inicio: filtroDataInicio, data_fim: filtroDataFim },
      });

      const lista = extractApiList<MapaUnidadeApi>(data);
      if (!Array.isArray(lista)) {
        throw new Error("Resposta inválida da API de mapa/unidades.");
      }

      const parsed = lista.map(parseUnidadeMapa).filter((u) => Boolean(u.id));
      if (requisicao !== requisicaoMapa.current) return;
      setUnidades(parsed);
    } catch (err) {
      if (requisicao !== requisicaoMapa.current) return;
      const message = getApiErrorMessage(err, "Não foi possível carregar as unidades do mapa.");
      setUnidades([]);
      setUnidadesError(message);
      toast.error(message);
    } finally {
      if (requisicao === requisicaoMapa.current) setLoading(false);
    }
  }, [filtroDataFim, filtroDataInicio]);

  useEffect(() => {
    void fetchMapaUnidades();
  }, [fetchMapaUnidades]);

  const bairros = useMemo(() => {
    const map = new Map<string, string>();

    for (const u of unidades) {
      if (!u.bairroId) continue;
      map.set(u.bairroId, u.bairroNome || u.bairroId);
    }

    return Array.from(map.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [unidades]);

  const bairrosPorId = useMemo(() => new Map(bairros.map((b) => [b.id, b.nome])), [bairros]);
  const getBairroNome = useCallback((bairroId: string) => bairrosPorId.get(bairroId) || bairroId || "-", [bairrosPorId]);

  const unidadesFiltradas = useMemo(() => {
    const term = busca.trim().toLowerCase();

    return unidades.filter((u) => {
      if (term && !(u.nome || "").toLowerCase().includes(term)) return false;
      if (filtroBairro !== "todos" && u.bairroId !== filtroBairro) return false;
      return true;
    });
  }, [busca, filtroBairro, unidades]);

  const unidadesComCoords = useMemo(() => {
    const term = busca.trim().toLowerCase();

    return unidades.filter((u) => {
      if (u.latitude === null || u.longitude === null) return false;
      if (term && !(u.nome || "").toLowerCase().includes(term)) return false;
      if (filtroBairro !== "todos" && u.bairroId !== filtroBairro) return false;
      if (filtroUnidadeId !== "todas" && u.id !== filtroUnidadeId) return false;
      return true;
    });
  }, [busca, filtroBairro, filtroUnidadeId, unidades]);

  const pontos = useMemo<[number, number][]>(() => unidadesComCoords.map((u) => [u.latitude as number, u.longitude as number]), [unidadesComCoords]);
  const demandaPorUnidade = useMemo(() => new Map((medicamentosMapa.data?.unidades ?? []).map((item) => [item.unidade_id, item])), [medicamentosMapa.data]);
  const demandaSemLocalizacao = useMemo(() => unidades.reduce((total, unidade) =>
    unidade.latitude === null || unidade.longitude === null
      ? total + (demandaPorUnidade.get(unidade.id)?.solicitacoes ?? 0) : total, 0), [unidades, demandaPorUnidade]);
  const pontosCalor = useMemo<Array<[number, number, number]>>(() => {
    const maximo = medicamentosMapa.data?.maior_demanda ?? 0;
    if (!maximo) return [];
    return unidadesComCoords.flatMap((u) => {
      const total = demandaPorUnidade.get(u.id)?.solicitacoes ?? 0;
      return total > 0 ? [[u.latitude as number, u.longitude as number, total / maximo] as [number, number, number]] : [];
    });
  }, [demandaPorUnidade, medicamentosMapa.data?.maior_demanda, unidadesComCoords]);
  const listaUnidades = useMemo(() => unidadesFiltradas
    .filter((u) => filtroUnidadeId === "todas" || u.id === filtroUnidadeId)
    .sort((a, b) => camada === "medicamentos"
      ? (demandaPorUnidade.get(b.id)?.solicitacoes ?? 0) - (demandaPorUnidade.get(a.id)?.solicitacoes ?? 0) || a.nome.localeCompare(b.nome)
      : a.nome.localeCompare(b.nome)), [unidadesFiltradas, filtroUnidadeId, camada, demandaPorUnidade]);

  const metricasPorUnidade = useMemo(() => {
    return new Map(unidades.map((u) => [u.id, u.metricas ?? EMPTY_METRICAS]));
  }, [unidades]);

  const houseIcon = useMemo(() => createHouseIcon(), []);

  const metricasSelecionada = useMemo(() => {
    if (!unidadeSelecionada) return null;
    return unidadeSelecionada.metricas ?? metricasPorUnidade.get(unidadeSelecionada.id) ?? EMPTY_METRICAS;
  }, [metricasPorUnidade, unidadeSelecionada]);

  const servicosMetricasSelecionada = useMemo(() => metricasSelecionada?.servicosMetricas ?? [], [metricasSelecionada]);
  const servicosMetricasLoadingSelecionada = serieLoading;

  const bairroSelecionadoNome = useMemo(() => {
    if (!unidadeSelecionada) return "-";
    return bairrosPorId.get(unidadeSelecionada.bairroId) || unidadeSelecionada.bairroId || "-";
  }, [unidadeSelecionada, bairrosPorId]);

  const selectedPosition: [number, number] | null = useMemo(() => {
    if (!unidadeSelecionada || unidadeSelecionada.latitude === null || unidadeSelecionada.longitude === null) return null;
    return [unidadeSelecionada.latitude as number, unidadeSelecionada.longitude as number];
  }, [unidadeSelecionada]);

  const carregarDetalhesUnidade = useCallback(
    async (unidadeId: string, dataInicio = filtroDataInicio, dataFim = filtroDataFim) => {
      if (!unidadeId) return null;
      const { data } = await api.get<MapaUnidadesApiResponse>(`/mapa_unidades/${unidadeId}/`, {
        params: { data_inicio: dataInicio, data_fim: dataFim },
      });
      const item = extractApiItem<MapaUnidadeApi>(data);
      if (!item) return null;
      return parseUnidadeMapa(item);
    },
    [filtroDataFim, filtroDataInicio],
  );

  const carregarSerieUnidade = useCallback(
    async (unidadeId: string, dataInicio: string, dataFim: string) => {
      if (!unidadeId) return;
      if (!dataInicio) return;
      if (!dataFim) return;
      const requisicao = ++requisicaoDetalhe.current;

      setSerieLoading(true);
      setSerieError(null);

      try {
        const [detalhe, serieResponse] = await Promise.allSettled([
          carregarDetalhesUnidade(unidadeId, dataInicio, dataFim),
          api.get<MapaUnidadeSeriesApiResponse>("/mapa/unidades/series/", {
            params: { unidade_id: unidadeId, data_inicio: dataInicio, data_fim: dataFim },
          }),
        ]);
        if (requisicao !== requisicaoDetalhe.current) return;
        if (detalhe.status === "fulfilled" && detalhe.value) setUnidadeSelecionada(detalhe.value);
        if (serieResponse.status === "fulfilled") setSeriePontos(parseSeriePontos(serieResponse.value.data));
        else {
          setSeriePontos([]);
          setSerieError("Não foi possível carregar a série temporal. Os detalhes da unidade continuam disponíveis.");
        }
        if (detalhe.status === "rejected") setSerieError("Não foi possível atualizar os detalhes da unidade.");
      } catch (err) {
        if (requisicao !== requisicaoDetalhe.current) return;
        const message = getApiErrorMessage(err, "Não foi possível carregar os detalhes da unidade.");
        setSerieError(message);
        setSeriePontos([]);
      } finally {
        if (requisicao === requisicaoDetalhe.current) setSerieLoading(false);
      }
    },
    [carregarDetalhesUnidade],
  );

  const handleAtualizarSerie = useCallback(() => {
    if (!unidadeSelecionada) return;
    if (!serieDataInicio || !serieDataFim) {
      toast.error("Selecione o periodo para atualizar a serie temporal.");
      return;
    }
    if (serieDataInicio > serieDataFim) {
      toast.error("Data início não pode ser maior que data fim.");
      return;
    }
    void carregarSerieUnidade(unidadeSelecionada.id, serieDataInicio, serieDataFim);
  }, [carregarSerieUnidade, serieDataFim, serieDataInicio, unidadeSelecionada]);

  const handleSelecionarUnidade = (unidade: UnidadeMapa) => {
    setUnidadeSelecionada(unidade);
    setDialogOpen(true);

    const createdIso = unidade.createdAt;
    const createdParsed = createdIso ? parseISO(createdIso) : null;
    const inicioBase = createdParsed && isValid(createdParsed) ? format(createdParsed, "yyyy-MM-dd") : periodo30d.dataInicio;
    const inicio = filtroDataInicio || inicioBase;
    const fim = filtroDataFim || format(new Date(), "yyyy-MM-dd");

    setSerieDataInicio(inicio);
    setSerieDataFim(fim);
    setSeriePontos(null);
    setSerieError(null);
    void carregarSerieUnidade(unidade.id, inicio, fim);
  };

  const handleLimparFiltros = () => {
    setBusca("");
    setFiltroDataInicio(periodo30d.dataInicio);
    setFiltroDataFim(periodo30d.dataFim);
    setFiltroBairro("todos");
    setFiltroUnidadeId("todas");
    setMedicamentoId("");
  };

  const handleAtualizar = useCallback(() => {
    void fetchMapaUnidades();
    if (camada === "medicamentos") void medicamentosMapa.refetch();
    if (unidadeSelecionada?.id) {
      void carregarSerieUnidade(unidadeSelecionada.id, serieDataInicio, serieDataFim);
    }
  }, [carregarSerieUnidade, fetchMapaUnidades, serieDataFim, serieDataInicio, unidadeSelecionada?.id, camada, medicamentosMapa.refetch]);

  useEffect(() => {
    const unidadeIdSelecionada = unidadeSelecionada?.id;

    const refresh = () => {
      void fetchMapaUnidades();
      if (camada === "medicamentos") void medicamentosMapa.refetch();
      if (dialogOpen && unidadeIdSelecionada) {
        void carregarSerieUnidade(unidadeIdSelecionada, serieDataInicio, serieDataFim);
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, 300000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [carregarSerieUnidade, dialogOpen, fetchMapaUnidades, serieDataFim, serieDataInicio, unidadeSelecionada?.id, camada, medicamentosMapa.refetch]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Mapa de Monitoramento</h1>
                <p className="text-sm text-muted-foreground">Visualize todas as unidades de postos de Fortaleza.</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={handleAtualizar} disabled={loading || medicamentosMapa.isFetching}>
              Atualizar
            </Button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <aside className="max-h-[55vh] w-full shrink-0 overflow-y-auto border-r bg-muted/30 p-4 md:p-5 lg:max-h-[calc(100vh-110px)] lg:w-[340px]">
              <div className="space-y-4">
                <div role="group" aria-label="Camada do mapa" className="grid grid-cols-2 gap-1 rounded-lg border bg-card p-1">
                  <Button size="sm" className="min-w-0 whitespace-normal px-2 text-xs" variant={camada === "unidades" ? "default" : "ghost"} aria-pressed={camada === "unidades"} onClick={() => setCamada("unidades")}>Unidades</Button>
                  <Button size="sm" className="min-w-0 whitespace-normal px-2 text-xs" variant={camada === "medicamentos" ? "default" : "ghost"} aria-pressed={camada === "medicamentos"} onClick={() => setCamada("medicamentos")}>Calor por medicamento</Button>
                </div>
                {camada === "medicamentos" && <MedicamentosHeatControls data={medicamentosMapa.data} loading={medicamentosMapa.isFetching} error={medicamentosMapa.isError} onChange={setMedicamentoId} onRetry={() => void medicamentosMapa.refetch()} semLocalizacao={demandaSemLocalizacao} />}
                <div className="space-y-1">
                  <Label htmlFor="busca-unidade">Buscar unidade</Label>
                  <Input id="busca-unidade" placeholder="Ex: Unidade Centro..." value={busca} onChange={(e) => setBusca(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filtro-data-inicio">Data início</Label>
                  <Input
                    id="filtro-data-inicio"
                    type="date"
                    value={filtroDataInicio}
                    max={filtroDataFim || undefined}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filtro-data-fim">Data fim</Label>
                  <Input
                    id="filtro-data-fim"
                    type="date"
                    value={filtroDataFim}
                    min={filtroDataInicio || undefined}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filtro-bairro">Bairro</Label>
                  <Select value={filtroBairro} onValueChange={setFiltroBairro}>
                    <SelectTrigger id="filtro-bairro">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {bairros.map((b) => (
                        <SelectItem key={String(b.id)} value={String(b.id)}>
                          {b.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="filtro-unidade">Unidade</Label>
                  <Select value={filtroUnidadeId} onValueChange={setFiltroUnidadeId}>
                    <SelectTrigger id="filtro-unidade">
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as unidades</SelectItem>
                      {unidadesFiltradas.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nome || `Unidade ${u.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="button" variant="outline" className="w-full" onClick={handleLimparFiltros}>
                  Limpar filtros
                </Button>

                {unidadesError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    {unidadesError}
                  </div>
                )}

                {unidades.length > 0 && unidadesComCoords.length === 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                    Nenhuma unidade com coordenadas válidas. Verifique os campos de latitude/longitude no cadastro (ex.: -3.7319 e -38.5267).
                  </div>
                )}

                {loading && <div className="text-xs text-muted-foreground">Carregando unidades...</div>}
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold">Unidades cadastradas ({listaUnidades.length})</h2>
                  <p className="text-xs text-muted-foreground">Selecione um ponto no mapa ou uma unidade abaixo.</p>
                  {listaUnidades.map((unidade) => <Button key={unidade.id} variant="ghost" className="h-auto w-full flex-col items-start gap-1 whitespace-normal rounded-xl border bg-card p-3 text-left" onClick={() => handleSelecionarUnidade(unidades.find((u) => u.id === unidade.id) ?? unidade)}>
                    <span className="font-semibold">{unidade.nome}</span>
                    <span className="text-xs font-normal text-muted-foreground">{unidade.logradouro}, {unidade.numero}</span>
                    {camada === "medicamentos" && medicamentosMapa.data && <span className="text-xs font-medium text-primary">{demandaPorUnidade.get(unidade.id)?.solicitacoes ?? 0} receitas com o medicamento</span>}
                    {(unidade.latitude === null || unidade.longitude === null) && <span className="text-xs font-normal text-amber-700">Localização não cadastrada no mapa</span>}
                  </Button>)}
                  {!listaUnidades.length && !loading && <p className="text-xs text-muted-foreground">Nenhuma unidade encontrada para os filtros.</p>}
                </div>
              </div>
            </aside>

            <section className="relative min-w-0 flex-1 overflow-hidden" aria-label="Mapa das unidades">
              <div className="h-[60vh] min-h-[420px] w-full lg:h-[calc(100vh-110px)]">
                <MapContainer center={DEFAULT_POSITION} zoom={12} className="z-0 h-full w-full" key="mapa-unidades-gestor">
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    referrerPolicy="origin"
                  />
                  {pontos.length > 0 && <FitBounds key={camada} pontos={pontos} />}
                  {selectedPosition && <FlyTo position={selectedPosition} />}
                  {camada === "medicamentos" && <MedicamentosHeatLayer pontos={pontosCalor} />}
                  {unidadesComCoords.map((unidade) => {
                    const metricas = metricasPorUnidade.get(unidade.id) ?? unidade.metricas ?? EMPTY_METRICAS;
                    return (
                      <Marker
                        key={unidade.id}
                        title={unidade.nome}
                        position={[unidade.latitude as number, unidade.longitude as number]}
                        icon={houseIcon}
                        eventHandlers={{
                          mouseover: (e) => {
                            (e.target as L.Marker).openPopup();
                          },
                          mouseout: (e) => {
                            (e.target as L.Marker).closePopup();
                          },
                          click: (e) => {
                            (e.target as L.Marker).closePopup();
                            handleSelecionarUnidade(unidade);
                          },
                        }}
                      >
                        <Popup closeButton={false} autoPan autoPanPadding={[24, 24]} keepInView minWidth={240} maxWidth={320}>
                          <UnidadePopup unidade={unidade} metricas={metricas} demanda={demandaPorUnidade.get(unidade.id)} medicamento={camada === "medicamentos" ? medicamentosMapa.data?.medicamento : null} />
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
                {camada === "medicamentos" && medicamentosMapa.data?.medicamento && <div className="pointer-events-none absolute bottom-5 left-4 right-4 z-10 max-w-sm rounded-xl border bg-card/95 p-3 shadow-md">
                  <p className="text-xs font-semibold">{nomeMedicamento(medicamentosMapa.data.medicamento)}</p>
                  <p className="mb-2 mt-1 text-[11px] text-muted-foreground">Concentração de receitas por unidade no período</p>
                  <div className="h-2 rounded-full" style={{ background: "linear-gradient(to right, #14b8a6, #facc15, #f97316, #dc2626)" }} />
                  <div className="mt-1 flex justify-between text-[11px]"><span>Menor demanda</span><span>Maior: {medicamentosMapa.data.maior_demanda} receitas</span></div>
                </div>}

                {loading && unidades.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
                    <div className="space-y-2 text-center">
                      <div className="text-sm font-medium">Carregando unidades...</div>
                      <div className="text-xs text-muted-foreground">Primeiro carregamento pode demorar um pouco.</div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <UnidadeDetalheDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            unidade={unidadeSelecionada}
            bairroNome={bairroSelecionadoNome}
            metricas={metricasSelecionada}
            servicosMetricas={servicosMetricasSelecionada}
            servicosLoading={servicosMetricasLoadingSelecionada}
            seriePontos={seriePontos}
            serieLoading={serieLoading}
            serieError={serieError}
            serieDataInicio={serieDataInicio}
            serieDataFim={serieDataFim}
            onSerieDataInicioChange={setSerieDataInicio}
            onSerieDataFimChange={setSerieDataFim}
            onAtualizarSerie={handleAtualizarSerie}
            tempoMetaPadraoMin={metricasSelecionada?.tempoMedioEsperadoMin ?? 0}
          />
        </main>
      </div>
    </SidebarProvider>
  );
}
