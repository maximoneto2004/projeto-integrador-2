import { useMemo } from "react";
import { GeoJSON } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { Layer, PathOptions } from "leaflet";
import type { BairroIndicadores } from "@/types/mapaAssistencial";

export type CamadaBairro = "demanda" | "faltas" | "fora" | "cobertura";

// Rampa sequencial de um tom (claro = pouco, escuro = muito), da paleta validada.
const RAMPA = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#184f95"];
const SEM_DADOS = "#d4d4d4";
const COBERTO = "#3987e5";
// Abaixo disso a taxa do bairro oscila demais para ser comparada.
export const BASE_MINIMA = 10;

export type Faixa = { cor: string; rotulo: string; min: number; max: number };

export const normalizarNomeGeo = (valor: string) =>
  (valor || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const faixasPercentuais = (limites: number[]): Faixa[] =>
  RAMPA.map((cor, i) => ({
    cor,
    min: limites[i],
    max: limites[i + 1] ?? Infinity,
    rotulo: limites[i + 1] === undefined ? `${limites[i]}% ou mais` : `${limites[i]}% a ${limites[i + 1]}%`,
  }));

// Intervalos iguais e arredondados para as contagens, começando em 1 (zero fica como "sem dados").
const faixasContagem = (maior: number): Faixa[] => {
  const passo = Math.max(1, Math.ceil(maior / RAMPA.length));
  return RAMPA.map((cor, i) => {
    const min = i * passo + 1;
    const max = (i + 1) * passo;
    return { cor, min, max: i === RAMPA.length - 1 ? Infinity : max, rotulo: i === RAMPA.length - 1 ? `${min} ou mais` : `${min} a ${max}` };
  });
};

export function valorDaCamada(camada: CamadaBairro, bairro: BairroIndicadores | undefined): number | null {
  if (!bairro) return null;
  if (camada === "demanda") return bairro.consultas || null;
  if (camada === "faltas") return bairro.base_absenteismo >= BASE_MINIMA ? bairro.absenteismo : null;
  if (camada === "fora") return bairro.consultas >= BASE_MINIMA ? bairro.pct_fora_territorio : null;
  return bairro.unidades_referencia.length;
}

export function faixasDaCamada(camada: CamadaBairro, bairros: BairroIndicadores[]): Faixa[] {
  if (camada === "faltas") return faixasPercentuais([0, 5, 10, 15, 20]);
  if (camada === "fora") return faixasPercentuais([0, 10, 25, 50, 75]);
  if (camada === "cobertura") return [{ cor: COBERTO, rotulo: "Com unidade de referência", min: 1, max: Infinity }];
  return faixasContagem(Math.max(0, ...bairros.map((b) => b.consultas)));
}

const corDoValor = (valor: number | null, faixas: Faixa[]) => {
  if (valor === null) return SEM_DADOS;
  return faixas.find((f) => valor >= f.min && valor < f.max)?.cor ?? (valor >= faixas[faixas.length - 1].min ? faixas[faixas.length - 1].cor : SEM_DADOS);
};

const linha = (rotulo: string, valor: string) => `<div><span style="color:#6b7280">${rotulo}:</span> ${valor}</div>`;
const escapar = (texto: string) => texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function conteudoDica(nome: string, bairro: BairroIndicadores | undefined) {
  if (!bairro) return `<strong>${escapar(nome)}</strong><div style="color:#6b7280">Bairro não cadastrado no sistema</div>`;
  const pct = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
  return [
    `<strong>${escapar(bairro.nome)}</strong>`,
    linha("Consultas", `${bairro.consultas} (${bairro.pacientes} pacientes)`),
    linha("Não comparecimento", bairro.base_absenteismo >= BASE_MINIMA ? pct(bairro.absenteismo) : `poucos dados (${bairro.base_absenteismo})`),
    linha("Atendidos fora do território", bairro.consultas ? `${bairro.consultas_fora_territorio} (${pct(bairro.pct_fora_territorio)})` : "—"),
    linha("Pacientes com condição crônica", `${bairro.pacientes_cronicos}`),
    linha("Unidade de referência", bairro.unidades_referencia.length ? escapar(bairro.unidades_referencia.map((u) => u.nome).join(", ")) : "nenhuma"),
    bairro.atendidos_em.length
      ? linha("Mais atendidos em", escapar(bairro.atendidos_em.map((d) => `${d.unidade} (${d.consultas})`).join(", ")))
      : "",
  ].join("");
}

type BairrosCamadaProps = {
  geojson: FeatureCollection;
  bairros: BairroIndicadores[];
  camada: CamadaBairro;
};

export function BairrosCamada({ geojson, bairros, camada }: BairrosCamadaProps) {
  const porChave = useMemo(() => new Map(bairros.map((b) => [b.chave, b])), [bairros]);
  const faixas = useMemo(() => faixasDaCamada(camada, bairros), [bairros, camada]);
  const nomeDe = (feature?: Feature) => String(feature?.properties?.Nome ?? feature?.properties?.nome ?? "");

  const estilo = (feature?: Feature): PathOptions => {
    const bairro = porChave.get(normalizarNomeGeo(nomeDe(feature)));
    return {
      fillColor: corDoValor(valorDaCamada(camada, bairro), faixas),
      fillOpacity: 0.65,
      color: "#ffffff",
      weight: 1,
    };
  };

  const aoCriar = (feature: Feature, layer: Layer) => {
    layer.bindTooltip(conteudoDica(nomeDe(feature), porChave.get(normalizarNomeGeo(nomeDe(feature)))), { sticky: true });
  };

  // A chave recria a camada quando os dados ou a medida mudam; o GeoJSON do react-leaflet não reestiliza sozinho.
  return <GeoJSON key={`${camada}:${bairros.length}:${faixas.map((f) => f.min).join(",")}:${bairros.reduce((a, b) => a + b.consultas, 0)}`} data={geojson} style={estilo} onEachFeature={aoCriar} />;
}

export function BairrosLegenda({ camada, bairros, naoEncontrados }: { camada: CamadaBairro; bairros: BairroIndicadores[]; naoEncontrados: number }) {
  const faixas = faixasDaCamada(camada, bairros);
  const titulo = {
    demanda: "Consultas por bairro de residência",
    faltas: "Não comparecimento por bairro (meta até 15%)",
    fora: "Consultas fora da unidade de referência",
    cobertura: "Bairros cobertos por uma unidade de referência",
  }[camada];
  const semDados = {
    demanda: "Sem consultas",
    faltas: `Menos de ${BASE_MINIMA} agendamentos que já deveriam ter acontecido`,
    fora: `Menos de ${BASE_MINIMA} consultas`,
    cobertura: "Sem unidade de referência",
  }[camada];
  return (
    <div className="pointer-events-none absolute bottom-5 left-4 z-10 max-w-xs rounded-xl border bg-card/95 p-3 text-[11px] shadow-md">
      <p className="mb-2 text-xs font-semibold">{titulo}</p>
      <ul className="space-y-1">
        {faixas.map((f) => (
          <li key={f.rotulo} className="flex items-center gap-2">
            <span className="h-3 w-5 rounded-sm" style={{ backgroundColor: f.cor }} aria-hidden />
            {f.rotulo}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm" style={{ backgroundColor: SEM_DADOS }} aria-hidden />
          {semDados}
        </li>
      </ul>
      {naoEncontrados > 0 && (
        <p className="mt-2 text-amber-800">
          {naoEncontrados} {naoEncontrados === 1 ? "bairro do cadastro não tem" : "bairros do cadastro não têm"} nome igual ao do mapa e ficam de fora.
        </p>
      )}
    </div>
  );
}
