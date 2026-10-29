import { useEffect } from "react";
import L from "leaflet";
import "leaflet.heat";
import { useMap } from "react-leaflet";

type Props = { pontos: Array<[number, number, number]> };

export function MedicamentosHeatLayer({ pontos }: Props) {
  const map = useMap();
  useEffect(() => {
    // Pesos normalizados pela maior demanda da rede; filtrar um bairro não muda a escala.
    const layer = L.heatLayer(pontos, {
      radius: 42, blur: 28, max: 1, maxZoom: 0, minOpacity: 0.3,
      gradient: { 0.2: "#14b8a6", 0.45: "#facc15", 0.7: "#f97316", 1: "#dc2626" },
    }).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, pontos]);
  return null;
}
