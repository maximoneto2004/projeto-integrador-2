import { useEffect } from "react";
import L from "leaflet";
import "leaflet.heat";
import { useMap } from "react-leaflet";
import { RAMPA_CALOR } from "@/lib/coresGraficos";

type Props = { pontos: Array<[number, number, number]> };

export function MedicamentosHeatLayer({ pontos }: Props) {
  const map = useMap();
  useEffect(() => {
    // Pesos normalizados pela maior demanda da rede; filtrar um bairro não muda a escala.
    const layer = L.heatLayer(pontos, {
      radius: 42, blur: 28, max: 1, maxZoom: 0, minOpacity: 0.3,
      gradient: { 0.2: RAMPA_CALOR[0], 0.4: RAMPA_CALOR[1], 0.6: RAMPA_CALOR[2], 0.8: RAMPA_CALOR[3], 1: RAMPA_CALOR[4] },
    }).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, pontos]);
  return null;
}
