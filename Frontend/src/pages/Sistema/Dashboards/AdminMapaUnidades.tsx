import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO, subDays } from "date-fns";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";
import { api } from "@/services/api";
import { UnidadeDetalheDialog } from "../../../components/dashboard-gestor/UnidadeDetalheDialog";
import { getEficiencia } from "../../../components/dashboard-gestor/UnidadeDetalheDialog";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

type OrigemAtendimento = "156" | "RECEPCAO" | "SITE" | "FILA";
type OrigemAtendimentoCount = Record<OrigemAtendimento, number>;

export type ServicoMetrica = {
  servicoId: string;
  servicoNome: string;
  tipoServicoNome: string;
  esperadoMin: number;
  total: number;
  tempoMedioEsperaMin: number;
  tempoMedioAtendimentoMin: number;
  tempoExcedenteMedioMin: number;
  pctAcimaEsperado: number;
};

export type UnidadeMetricas = {
  notaAvaliacao: number;
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
    nota_avaliacao_media?: number | null;
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
  notaAvaliacaoMedia: number | null;
  notaAvaliacaoTotal: number;
};

export type UnidadeAvaliacao = {
  id: string;
  nota: number;
  comentario: string;
  createdAt: string | null;
  atendente?: {
    id: string;
    nome: string;
  } | null;
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

type MapaUnidadeDetalheApi = MapaUnidadeApi & {
  avaliacoes?: unknown[] | null;
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
  nota_avaliacao_media?: number | string | null;
  nota_avaliacao_total?: number | string | null;
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

type UnidadeCrasListApiItem = {
  id: string;
  nome: string;
  created_at?: string | null;
  logradouro?: string;
  numero?: string;
  complemento?: string | null;
  cep?: string;
  bairro?: string | { id?: string; nome?: string } | null;
  telefone?: string;
  email?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
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
  notaAvaliacao: 0,
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
const formatNota = (v: number) => (v > 0 ? v.toFixed(1) : "-");

type NotaAvaliacaoTone = "sem-dados" | "excelente" | "muito-bom" | "regular" | "critico";

const NOTA_MARKER_CONFIG: Record<NotaAvaliacaoTone, { markerClass: string; legendClass: string; label: string }> = {
  "sem-dados": {
    markerClass: "cras-house-marker__bubble--sem-dados",
    legendClass: "bg-slate-500",
    label: "Sem dados",
  },
  excelente: {
    markerClass: "cras-house-marker__bubble--excelente",
    legendClass: "bg-green-600",
    label: "Nota >= 4.5",
  },
  "muito-bom": {
    markerClass: "cras-house-marker__bubble--muito-bom",
    legendClass: "bg-yellow-500",
    label: "Nota 4.0-4.4",
  },
  regular: {
    markerClass: "cras-house-marker__bubble--regular",
    legendClass: "bg-orange-500",
    label: "Nota 3.0-3.9",
  },
  critico: {
    markerClass: "cras-house-marker__bubble--critico",
    legendClass: "bg-red-600",
    label: "Nota < 3.0",
  },
};

const getNotaAvaliacaoTone = (notaAvaliacao: number): NotaAvaliacaoTone => {
  if (!Number.isFinite(notaAvaliacao) || notaAvaliacao <= 0) return "sem-dados";
  if (notaAvaliacao >= 4.5) return "excelente";
  if (notaAvaliacao >= 4.0) return "muito-bom";
  if (notaAvaliacao >= 3.0) return "regular";
  return "critico";
};

const houseSvg = (fill: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${fill}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 10.5 12 3l9 7.5" />
  <path d="M5 10.5V21h14V10.5" />
  <path d="M9 21v-7h6v7" />
</svg>
`;

const createHouseIcon = (tone: NotaAvaliacaoTone) =>
  L.divIcon({
    className: "cras-house-marker",
    html: `
      <div class="cras-house-marker__bubble ${NOTA_MARKER_CONFIG[tone].markerClass}">
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
      const cargoNorm = cargo.toLowerCase();
      const ehAtendente = cargoNorm.includes("atendente");
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
    notaAvaliacao: toNumber(raw.nota_avaliacao_media, 0),
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
    metricas: parseUnidadeMetricas(raw?.metricas),
  };
};

const parseUnidadeCard = (raw: UnidadeCrasListApiItem): UnidadeMapa => {
  const bairroId = typeof raw?.bairro === "string" ? raw.bairro : String(raw?.bairro?.id ?? "");
  const bairroNome = typeof raw?.bairro === "object" && raw?.bairro ? String(raw.bairro.nome ?? "") : "";
  const coords = parseLatLng(raw?.latitude, raw?.longitude);

  return {
    id: String(raw?.id ?? ""),
    nome: String(raw?.nome ?? ""),
    createdAt: raw?.created_at ?? null,
    logradouro: String(raw?.logradouro ?? ""),
    numero: String(raw?.numero ?? ""),
    complemento: String(raw?.complemento ?? ""),
    cep: String(raw?.cep ?? ""),
    bairroId,
    bairroNome,
    bairrosAbrangencia: [],
    telefone: String(raw?.telefone ?? ""),
    email: String(raw?.email ?? ""),
    latitude: coords.latitude,
    longitude: coords.longitude,
    metricas: { ...EMPTY_METRICAS },
  };
};

const parseListaAvaliacoes = (raw: unknown): UnidadeAvaliacao[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const obj = toRecord(item);
      if (!obj) return null;
      const id = String(obj.id ?? "");
      if (!id) return null;
      return {
        id,
        nota: toNumber(obj.nota, 0),
        comentario: String(obj.comentario ?? "").trim(),
        createdAt: obj.created_at ? String(obj.created_at) : null,
        atendente: (() => {
          const atendenteObj = toRecord(obj.atendente);
          if (!atendenteObj) return null;
          const atendenteId = String(atendenteObj.id ?? "").trim();
          const atendenteNome = String(atendenteObj.nome ?? "").trim();
          if (!atendenteId && !atendenteNome) return null;
          return { id: atendenteId, nome: atendenteNome };
        })(),
      } as UnidadeAvaliacao;
    })
    .filter((x): x is UnidadeAvaliacao => Boolean(x));
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
        notaAvaliacaoMedia: (() => {
          const nota = toNumber(row?.nota_avaliacao_media, 0);
          return nota > 0 ? nota : null;
        })(),
        notaAvaliacaoTotal: toNumber(row?.nota_avaliacao_total, 0),
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

function UnidadePopup({ unidade, metricas }: { unidade: UnidadeMapa; metricas: UnidadeMetricas }) {
  const eficiencia = getEficiencia(
    metricas.pctAcimaEsperado,
    metricas.tempoMedioAtendimentoComumMin,
    metricas.tempoMedioEsperadoComumMin,
  );

  return (
    <div className="min-w-[280px] space-y-2 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold leading-tight break-words">{unidade.nome || `Unidade ${unidade.id}`}</div>
          <div className="text-xs text-muted-foreground">Últimos 30 dias • métricas via API</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="secondary" className="whitespace-nowrap">
            Nota {formatNota(metricas.notaAvaliacao)}/5
          </Badge>
          {/* <Badge variant="outline" className="whitespace-nowrap">
            SLA {metricas.tempoMedioAtendimentoMin}m (meta {TEMPO_META_PADRAO_MIN}m)
          </Badge> */}
        </div>
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
  const [filtroNotaMin, setFiltroNotaMin] = useState("todas");
  const [filtroBairro, setFiltroBairro] = useState("todos");
  const [filtroUnidadeId, setFiltroUnidadeId] = useState("todas");
  const [unidadesCard, setUnidadesCard] = useState<UnidadeMapa[]>([]);
  const [unidadesCardLoading, setUnidadesCardLoading] = useState(false);
  const [unidadesCardError, setUnidadesCardError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<UnidadeMapa | null>(null);

  const [seriePontos, setSeriePontos] = useState<UnidadeSeriePonto[] | null>(null);
  const [serieLoading, setSerieLoading] = useState(false);
  const [serieError, setSerieError] = useState<string | null>(null);
  const [serieDataInicio, setSerieDataInicio] = useState(periodo30d.dataInicio);
  const [serieDataFim, setSerieDataFim] = useState(periodo30d.dataFim);
  const [avaliacoesPorUnidadeId, setAvaliacoesPorUnidadeId] = useState<Map<string, UnidadeAvaliacao[]>>(new Map());
  const [avaliacoesLoadingPorUnidadeId, setAvaliacoesLoadingPorUnidadeId] = useState<Map<string, boolean>>(new Map());

  const fetchMapaUnidades = useCallback(async () => {
    if (filtroDataInicio && filtroDataFim && filtroDataInicio > filtroDataFim) {
      setUnidadesError("Data de início não pode ser maior que data fim.");
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
      setUnidades(parsed);
    } catch (err) {
      const message = getApiErrorMessage(err, "Não foi possível carregar as unidades do mapa.");
      setUnidadesError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filtroDataFim, filtroDataInicio]);

  const fetchUnidadesCard = useCallback(async () => {
    setUnidadesCardLoading(true);
    setUnidadesCardError(null);

    try {
      const { data } = await api.get("/unidade_cras_list/");
      const lista = extractApiList<UnidadeCrasListApiItem>(data);
      const parsed = lista.map(parseUnidadeCard).filter((u) => Boolean(u.id));
      setUnidadesCard(parsed);
    } catch (err) {
      const message = getApiErrorMessage(err, "Não foi possível carregar as unidades.");
      setUnidadesCardError(message);
      toast.error(message);
    } finally {
      setUnidadesCardLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMapaUnidades();
  }, [fetchMapaUnidades]);

  useEffect(() => {
    void fetchUnidadesCard();
  }, [fetchUnidadesCard]);

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

  const unidadesMapaPorId = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);

  const unidadesFiltradas = useMemo(() => {
    const term = busca.trim().toLowerCase();
    const notaMin = filtroNotaMin === "todas" ? null : Number(filtroNotaMin);

    return unidadesCard.filter((u) => {
      if (term && !(u.nome || "").toLowerCase().includes(term)) return false;
      if (filtroBairro !== "todos" && u.bairroId !== filtroBairro) return false;
      if (notaMin === null) return true;
      const unidadeMapa = unidadesMapaPorId.get(u.id);
      const nota = unidadeMapa?.metricas?.notaAvaliacao ?? null;
      return nota !== null && nota >= notaMin;
    });
  }, [busca, filtroBairro, filtroNotaMin, unidadesCard, unidadesMapaPorId]);

  const unidadesComCoords = useMemo(() => {
    const term = busca.trim().toLowerCase();
    const notaMin = filtroNotaMin === "todas" ? null : Number(filtroNotaMin);

    return unidades.filter((u) => {
      if (u.latitude === null || u.longitude === null) return false;
      if (term && !(u.nome || "").toLowerCase().includes(term)) return false;
      if (filtroBairro !== "todos" && u.bairroId !== filtroBairro) return false;
      if (notaMin !== null && (u.metricas?.notaAvaliacao ?? 0) < notaMin) return false;
      if (filtroUnidadeId !== "todas" && u.id !== filtroUnidadeId) return false;
      return true;
    });
  }, [busca, filtroBairro, filtroNotaMin, filtroUnidadeId, unidades]);

  const pontos = useMemo<[number, number][]>(() => unidadesComCoords.map((u) => [u.latitude as number, u.longitude as number]), [unidadesComCoords]);

  const metricasPorUnidade = useMemo(() => {
    return new Map(unidades.map((u) => [u.id, u.metricas ?? EMPTY_METRICAS]));
  }, [unidades]);

  const iconsByTone = useMemo(() => {
    const tones: NotaAvaliacaoTone[] = ["sem-dados", "excelente", "muito-bom", "regular", "critico"];
    return new Map(tones.map((tone) => [tone, createHouseIcon(tone)]));
  }, []);

  const getIcon = (metricas: UnidadeMetricas) => {
    const tone = getNotaAvaliacaoTone(metricas.notaAvaliacao);
    return iconsByTone.get(tone) || createHouseIcon(tone);
  };

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

  const avaliacoesSelecionada = useMemo(() => {
    if (!unidadeSelecionada) return [];
    return avaliacoesPorUnidadeId.get(unidadeSelecionada.id) ?? [];
  }, [avaliacoesPorUnidadeId, unidadeSelecionada]);

  const avaliacoesLoadingSelecionada = useMemo(() => {
    if (!unidadeSelecionada) return false;
    return avaliacoesLoadingPorUnidadeId.get(unidadeSelecionada.id) ?? false;
  }, [avaliacoesLoadingPorUnidadeId, unidadeSelecionada]);

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

      setSerieLoading(true);
      setSerieError(null);

      try {
        const [detalhe, serieResponse] = await Promise.all([
          carregarDetalhesUnidade(unidadeId, dataInicio, dataFim),
          api.get<MapaUnidadeSeriesApiResponse>("/mapa/unidades/series/", {
            params: { unidade_id: unidadeId, data_inicio: dataInicio, data_fim: dataFim },
          }),
        ]);
        if (!detalhe) {
          setSeriePontos([]);
          return;
        }
        setUnidadeSelecionada(detalhe);
        setSeriePontos(parseSeriePontos(serieResponse.data));
      } catch (err) {
        const message = getApiErrorMessage(err, "Não foi possível carregar os detalhes da unidade.");
        setSerieError(message);
        setSeriePontos([]);
      } finally {
        setSerieLoading(false);
      }
    },
    [carregarDetalhesUnidade],
  );

  const carregarAvaliacoesUnidade = useCallback(
    async (unidadeId: string, dataInicio = filtroDataInicio, dataFim = filtroDataFim) => {
      if (!unidadeId) return;

      setAvaliacoesLoadingPorUnidadeId((prev) => new Map(prev).set(unidadeId, true));
      try {
        const { data } = await api.get<MapaUnidadesApiResponse>(`/mapa_unidades/${unidadeId}/`, {
          params: { data_inicio: dataInicio, data_fim: dataFim },
        });
        const detalhe = extractApiItem<MapaUnidadeDetalheApi>(data);
        const lista = parseListaAvaliacoes(detalhe?.avaliacoes);
        setAvaliacoesPorUnidadeId((prev) => new Map(prev).set(unidadeId, lista));
      } catch {
        setAvaliacoesPorUnidadeId((prev) => new Map(prev).set(unidadeId, []));
      } finally {
        setAvaliacoesLoadingPorUnidadeId((prev) => new Map(prev).set(unidadeId, false));
      }
    },
    [filtroDataFim, filtroDataInicio],
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
    void carregarAvaliacoesUnidade(unidadeSelecionada.id, serieDataInicio, serieDataFim);
    void carregarSerieUnidade(unidadeSelecionada.id, serieDataInicio, serieDataFim);
  }, [carregarAvaliacoesUnidade, carregarSerieUnidade, serieDataFim, serieDataInicio, unidadeSelecionada]);

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
    void carregarAvaliacoesUnidade(unidade.id, inicio, fim);
    void carregarSerieUnidade(unidade.id, inicio, fim);
  };

  const handleLimparFiltros = () => {
    setBusca("");
    setFiltroDataInicio(periodo30d.dataInicio);
    setFiltroDataFim(periodo30d.dataFim);
    setFiltroNotaMin("todas");
    setFiltroBairro("todos");
    setFiltroUnidadeId("todas");
  };

  const handleAtualizar = useCallback(() => {
    void fetchMapaUnidades();
    void fetchUnidadesCard();
    if (unidadeSelecionada?.id) {
      void carregarAvaliacoesUnidade(unidadeSelecionada.id, serieDataInicio, serieDataFim);
      void carregarSerieUnidade(unidadeSelecionada.id, serieDataInicio, serieDataFim);
    }
  }, [carregarAvaliacoesUnidade, carregarSerieUnidade, fetchMapaUnidades, fetchUnidadesCard, serieDataFim, serieDataInicio, unidadeSelecionada?.id]);

  useEffect(() => {
    const unidadeIdSelecionada = unidadeSelecionada?.id;

    const refresh = () => {
      void fetchMapaUnidades();
      if (dialogOpen && unidadeIdSelecionada) {
        void carregarAvaliacoesUnidade(unidadeIdSelecionada, serieDataInicio, serieDataFim);
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
  }, [carregarAvaliacoesUnidade, carregarSerieUnidade, dialogOpen, fetchMapaUnidades, serieDataFim, serieDataInicio, unidadeSelecionada?.id]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Mapa de Monitoramento</h1>
                <p className="text-sm text-muted-foreground">Visualize todas as unidades CRAS de Fortaleza.</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={handleAtualizar} disabled={loading || unidadesCardLoading}>
              Atualizar
            </Button>
          </header>

          <div className="flex min-h-0 flex-1">
            <aside className="w-full max-w-[360px] shrink-0 overflow-y-auto border-r bg-muted/30 p-4 md:p-5">
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="busca-unidade">Buscar unidade</Label>
                  <Input id="busca-unidade" placeholder="Ex: CRAS Centro..." value={busca} onChange={(e) => setBusca(e.target.value)} />
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
                  <Label>Nota mínima</Label>
                  <Select value={filtroNotaMin} onValueChange={setFiltroNotaMin}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Bairro</Label>
                  <Select value={filtroBairro} onValueChange={setFiltroBairro}>
                    <SelectTrigger>
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
                  <Label>Unidade</Label>
                  <Select value={filtroUnidadeId} onValueChange={setFiltroUnidadeId}>
                    <SelectTrigger>
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

                {(unidadesCardError || unidadesError) && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    {unidadesCardError || unidadesError}
                  </div>
                )}

                {unidades.length > 0 && unidadesComCoords.length === 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                    Nenhuma unidade com coordenadas válidas. Verifique os campos de latitude/longitude no cadastro (ex.: -3.7319 e -38.5267).
                  </div>
                )}

                {unidadesCardLoading && <div className="text-xs text-muted-foreground">Carregando unidades para o seletor...</div>}
              </div>
            </aside>

            <section className="relative min-w-0 flex-1 overflow-hidden">
              {!dialogOpen && (
                <div className="absolute right-4 top-4 z-20 rounded-md border bg-background/95 p-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {(["sem-dados", "excelente", "muito-bom", "regular", "critico"] as NotaAvaliacaoTone[]).map((tone) => (
                      <span key={tone} className="inline-flex items-center gap-1">
                        <span className={`inline-block h-3 w-3 rounded-full ${NOTA_MARKER_CONFIG[tone].legendClass}`} />
                        {NOTA_MARKER_CONFIG[tone].label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="h-full w-full">
                <MapContainer center={DEFAULT_POSITION} zoom={12} className="h-full w-full">
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    referrerPolicy="origin"
                  />
                  {pontos.length > 0 && <FitBounds pontos={pontos} />}
                  {selectedPosition && <FlyTo position={selectedPosition} />}
                  {unidadesComCoords.map((unidade) => {
                    const metricas = metricasPorUnidade.get(unidade.id) ?? unidade.metricas ?? EMPTY_METRICAS;
                    return (
                      <Marker
                        key={unidade.id}
                        position={[unidade.latitude as number, unidade.longitude as number]}
                        icon={getIcon(metricas)}
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
                        <Popup closeButton={false} autoPan autoPanPadding={[24, 24]} keepInView minWidth={280}>
                          <UnidadePopup unidade={unidade} metricas={metricas} />
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>

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
            avaliacoes={avaliacoesSelecionada}
            avaliacoesLoading={avaliacoesLoadingSelecionada}
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
