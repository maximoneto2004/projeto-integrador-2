import { useEffect, useMemo, useState } from "react";

import { Header } from "@/components/portal/Header";
import { FaleConosco } from "@/components/portal/FaleConosco";
import { IntroSection } from "@/components/portal/IntroSection";
import { useUnidadesCras } from "@/hooks/useUnidadesCras";
import { useServicosDisponiveis } from "@/hooks/sistema/useServicosConfig";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye } from "lucide-react";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

const icon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function FlyTo({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position, 14, { duration: 1.2 });
  }, [map, position]);

  return null;
}

type UnidadePortal = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
  servicos: string[];
  servicosDetalhes: {
    id: string;
    nome: string;
    diasSemana: string[];
    mesmoExpediente: boolean;
    horaManhaInicio: string;
    horaManhaFim: string;
    horaTardeInicio: string;
    horaTardeFim: string;
  }[];
  turnoManhaInicio: string;
  turnoManhaFim: string;
  turnoTardeInicio: string;
  turnoTardeFim: string;
  position: [number, number] | null;
};

const DEFAULT_POSITION: [number, number] = [-3.7319, -38.5267];
const ITEMS_PER_LOAD = 5;
const SERVICOS_PER_LOAD = 4;
const DIA_LABEL: Record<string, string> = {
  DOM: "Domingo",
  SEG: "Segunda-feira",
  TER: "Terça-feira",
  QUA: "Quarta-feira",
  QUI: "Quinta-feira",
  SEX: "Sexta-feira",
  SAB: "Sábado",
};
const DIA_ORDEM: Record<string, number> = {
  DOM: 0,
  SEG: 1,
  TER: 2,
  QUA: 3,
  QUI: 4,
  SEX: 5,
  SAB: 6,
};

const parseCoordinate = (value?: number | string | null) => {
  if (value === null || value === undefined) return null;
  const normalized = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
};

const buildEndereco = (logradouro?: string, numero?: string, complemento?: string) => {
  const base = [logradouro, numero].filter(Boolean).join(", ");
  if (!complemento) return base || "Endereço não informado";
  return base ? `${base} - ${complemento}` : complemento;
};

const lower = (value?: string | null) => (value || "").toLowerCase();

const formatFaixa = (inicio?: string, fim?: string) => {
  if (!inicio || !fim) return "";
  return `${inicio} às ${fim}`;
};

const formatDias = (diasSemana: string[]) => {
  if (!diasSemana.length) return "Não informado";
  const ordenados = [...diasSemana].sort((a, b) => (DIA_ORDEM[a] ?? 99) - (DIA_ORDEM[b] ?? 99));
  return ordenados.map((dia) => DIA_LABEL[dia] || dia).join(", ");
};

const UnidadesCras = () => {
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_LOAD);
  const [servicesPage, setServicesPage] = useState(1);
  const [servicesModalOpen, setServicesModalOpen] = useState(false);
  const { unidades, loading, error, fetchUnidades } = useUnidadesCras("");
  const { data: servicosCatalogo = [] } = useServicosDisponiveis();

  useEffect(() => {
    void fetchUnidades();
  }, [fetchUnidades]);

  const servicoNomeById = useMemo(
    () => new Map(servicosCatalogo.map((servico) => [String(servico.id), String(servico.nome || "")])),
    [servicosCatalogo],
  );

  const unidadesPortal = unidades.map<UnidadePortal>((unidade) => {
    const latitude = parseCoordinate(unidade.latitude);
    const longitude = parseCoordinate(unidade.longitude);
    const servicosDetalhes = (unidade.servicosDetalhes || []).map((servico) => ({
      ...servico,
      nome: servicoNomeById.get(servico.nome) || servico.nome,
    }));
    return {
      id: unidade.id,
      nome: unidade.nome,
      telefone: unidade.telefone || "Não informado",
      email: unidade.email || "Não informado",
      endereco: buildEndereco(unidade.logradouro, unidade.numero, unidade.complemento),
      servicos: Array.from(new Set(servicosDetalhes.map((servico) => servico.nome))),
      servicosDetalhes,
      turnoManhaInicio: unidade.turnoManhaInicio || "",
      turnoManhaFim: unidade.turnoManhaFim || "",
      turnoTardeInicio: unidade.turnoTardeInicio || "",
      turnoTardeFim: unidade.turnoTardeFim || "",
      position: latitude !== null && longitude !== null ? [latitude, longitude] : null,
    };
  });

  const filteredUnidades = unidadesPortal.filter((unidade) => {
    const term = search.trim().toLowerCase();
    const matchTerm = !term || lower(unidade.nome).includes(term);

    return matchTerm;
  });

  const visibleUnidades = filteredUnidades.slice(0, visibleCount);
  const unidadesComMapa = filteredUnidades.filter((unidade) => unidade.position);
  const selected = filteredUnidades.find((unidade) => unidade.id === selectedId) || null;
  const mapCenter = selected?.position || unidadesComMapa[0]?.position || DEFAULT_POSITION;
  const servicosTabelaSelecionada = selected
    ? (() => {
        const agrupados = new Map<
          string,
          {
            id: string;
            nome: string;
            combinacoes: Map<string, { dias: string; horario: string }>;
          }
        >();

        selected.servicosDetalhes.forEach((servico) => {
          const faixaManha = formatFaixa(servico.horaManhaInicio || selected.turnoManhaInicio, servico.horaManhaFim || selected.turnoManhaFim);
          const faixaTarde = formatFaixa(servico.horaTardeInicio || selected.turnoTardeInicio, servico.horaTardeFim || selected.turnoTardeFim);
          const horario = faixaManha && faixaTarde ? `${faixaManha} / ${faixaTarde}` : faixaManha || faixaTarde || "Não informado";
          const diasFormatados = formatDias(servico.diasSemana || []);
          const key = lower(servico.nome).trim() || String(servico.id);
          const chaveCombinacao = `${diasFormatados}|||${horario}`;

          const atual = agrupados.get(key);
          if (atual) {
            atual.combinacoes.set(chaveCombinacao, {
              dias: diasFormatados || "Não informado",
              horario: horario || "Não informado",
            });
            return;
          }

          agrupados.set(key, {
            id: servico.id,
            nome: servico.nome,
            combinacoes: new Map([
              [
                chaveCombinacao,
                {
                  dias: diasFormatados || "Não informado",
                  horario: horario || "Não informado",
                },
              ],
            ]),
          });
        });

        return Array.from(agrupados.values())
          .map((servico) => {
            const combinacoes = servico.combinacoes.size
              ? Array.from(servico.combinacoes.values())
              : [{ dias: "Não informado", horario: "Não informado" }];
            return {
              id: servico.id,
              nome: servico.nome,
              combinacoes,
            };
          })
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      })()
    : [];
  const totalServicePages = Math.max(1, Math.ceil(servicosTabelaSelecionada.length / SERVICOS_PER_LOAD));
  const currentServicePage = Math.min(servicesPage, totalServicePages);
  const serviceStartIndex = (currentServicePage - 1) * SERVICOS_PER_LOAD;
  const servicosTabelaVisiveis = servicosTabelaSelecionada.slice(serviceStartIndex, serviceStartIndex + SERVICOS_PER_LOAD);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_LOAD);
  }, [search]);

  useEffect(() => {
    setServicesPage(1);
  }, [selectedId]);

  useEffect(() => {
    if (!filteredUnidades.length) {
      setSelectedId("");
      return;
    }
    if (!selectedId || !filteredUnidades.some((unidade) => unidade.id === selectedId)) {
      setSelectedId(filteredUnidades[0].id);
    }
  }, [filteredUnidades, selectedId]);

  return (
    <>
      <Header />
      <IntroSection title="Unidades CRAS" />

      <section className="px-4 py-8 md:py-14">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[390px_minmax(0,1fr)] gap-4 md:gap-6">
            <div className="order-1 xl:order-2 space-y-4">
              <div className="h-[260px] sm:h-[340px] md:h-[500px] xl:h-[670px] rounded-2xl overflow-hidden border bg-white">
                <MapContainer center={mapCenter} zoom={13} className="h-full w-full relative z-0">
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    referrerPolicy="origin"
                  />
                  {selected?.position && <FlyTo position={selected.position} />}
                  {unidadesComMapa.map((unidade) => (
                    <Marker key={unidade.id} position={unidade.position as [number, number]} icon={icon}>
                      <Popup>
                        <strong>{unidade.nome}</strong>
                        <br />
                        {unidade.telefone}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            <aside className="order-2 xl:order-1 xl:self-start xl:h-fit rounded-2xl border bg-white shadow-sm">
              <div className="p-4 border-b bg-muted/20 space-y-3">
                <p className="text-sm text-muted-foreground">Confira as unidades disponíveis em Fortaleza.</p>
                <input
                  type="text"
                  placeholder="Buscar por nome da unidade"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
                />
              </div>

              <div className="p-3 md:p-4 space-y-3 max-h-[420px] overflow-y-auto md:max-h-[560px]">
                {loading && <p className="text-sm text-muted-foreground">Carregando unidades...</p>}

                {error && !loading && <p className="text-sm text-red-600">Não foi possível carregar as unidades no momento.</p>}

                {!loading && !error && filteredUnidades.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma unidade encontrada para os filtros selecionados.</p>
                )}

                {!loading &&
                  !error &&
                  visibleUnidades.map((unidade) => {
                    const isSelected = selected?.id === unidade.id;
                    return (
                      <div
                        key={unidade.id}
                        className={`w-full text-left rounded-xl border p-3 transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <button type="button" onClick={() => setSelectedId(unidade.id)} className="flex-1 text-left min-w-0">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="text-xl">📍</span>
                              <div className="min-w-0">
                                <h3 className="font-semibold text-foreground break-words">{unidade.nome}</h3>
                                <p className="text-xs text-muted-foreground mt-1 break-words">📞 {unidade.telefone}</p>
                                <p className="text-xs text-muted-foreground  break-words">{unidade.endereco}</p>
                                <p className="text-xs text-blue-600 break-all">{unidade.email}</p>
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(unidade.id);
                              setServicesPage(1);
                              setServicesModalOpen(true);
                            }}
                            title={"Visualizar serviços"}
                            className="shrink-0 flex flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium text-primary hover:bg-primary/5"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {!loading && !error && visibleCount < filteredUnidades.length && (
                  <button
                    onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_LOAD)}
                    className="w-full py-2 text-sm font-medium text-primary hover:underline"
                  >
                    Carregar mais unidades
                  </button>
                )}
              </div>
            </aside>
          </div>

          <Dialog open={servicesModalOpen} onOpenChange={setServicesModalOpen}>
            <DialogContent className="w-[calc(100vw-1.5rem)] max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Serviços da {selected?.nome || ""}</DialogTitle>
              </DialogHeader>

              {!selected ? (
                <p className="text-sm text-muted-foreground">Selecione uma unidade para ver os serviços.</p>
              ) : servicosTabelaSelecionada.length ? (
                <div className="space-y-3">
                  <div className="md:hidden space-y-2">
                    {servicosTabelaVisiveis.map((servico) => (
                      <div key={servico.id} className="rounded-lg border p-3 bg-muted/10">
                        <p className="text-sm font-semibold text-foreground">{servico.nome}</p>
                        <div className="mt-2 space-y-2">
                          {servico.combinacoes.map((item, index) => (
                            <div key={`${servico.id}-modal-comb-${index}`} className="rounded-md border bg-white p-2">
                              <p className="text-xs text-muted-foreground">
                                {index + 1}. {item.dias}
                              </p>
                              <p className="text-sm">{item.horario}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block rounded-lg border overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Serviços</th>
                          <th className="px-3 py-2 text-left font-semibold">Dias</th>
                          <th className="px-3 py-2 text-left font-semibold">Horários</th>
                        </tr>
                      </thead>
                      <tbody>
                        {servicosTabelaVisiveis.map((servico) => (
                          <tr key={servico.id} className="border-t">
                            <td className="px-3 py-2 align-top">{servico.nome}</td>
                            <td className="px-3 py-2 align-top text-muted-foreground">
                              <div className="flex flex-col gap-3">
                                {servico.combinacoes.map((item, index) => (
                                  <span key={`${servico.id}-modal-td-dia-${index}`}>
                                    {index + 1}. {item.dias}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <div className="flex flex-col gap-1">
                                {servico.combinacoes.map((item, index) => (
                                  <span key={`${servico.id}-modal-td-hora-${index}`}>
                                    {index + 1}. {item.horario}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {servicosTabelaSelecionada.length > SERVICOS_PER_LOAD && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => setServicesPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentServicePage === 1}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <p className="order-last w-full text-center text-xs text-muted-foreground sm:order-none sm:w-auto">
                        Página {currentServicePage} de {totalServicePages}
                      </p>
                      <button
                        onClick={() => setServicesPage((prev) => Math.min(totalServicePages, prev + 1))}
                        disabled={currentServicePage === totalServicePages}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum serviço com horário informado para esta unidade.</p>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <FaleConosco />
    </>
  );
};

export default UnidadesCras;
