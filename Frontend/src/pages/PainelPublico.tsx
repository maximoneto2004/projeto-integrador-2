import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Volume2, MapPin, Clock } from "lucide-react";
import { usePainelChamadas } from "@/hooks/sistema/usePainelChamadas";

const logoPrefeituraSrc = `${import.meta.env.BASE_URL}Untitled-2-01.png`;

type ChamadoDisplay = {
  nomeCidadao: string;
  mesa: string;
  hora: string;
};

export default function PainelPublico() {
  const { data: chamadas = [] } = usePainelChamadas();
  const ultimoChamadoId = useRef<string | null>(null);
  const [vozSelecionada, setVozSelecionada] = useState<SpeechSynthesisVoice | null>(null);

  const historico = useMemo<ChamadoDisplay[]>(() => {
    return chamadas.map((item) => ({
      nomeCidadao: item.cidadao || "Cidadao",
      mesa: item.guiche || item.local || "Guiche",
      hora: item.horario_chamada || format(new Date(), "HH:mm"),
    }));
  }, [chamadas]);

  const ultimoChamado = useMemo(() => historico[0], [historico]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;

    const selecionarVoz = () => {
      const vozes = synth.getVoices();
      if (!vozes.length) return;
      const ptBr =
        vozes.find((voz) => voz.lang?.toLowerCase() === "pt-br") ||
        vozes.find((voz) => voz.lang?.toLowerCase().startsWith("pt")) ||
        vozes[0];
      setVozSelecionada(ptBr || null);
    };

    selecionarVoz();
    synth.addEventListener("voiceschanged", selecionarVoz);
    return () => {
      synth.removeEventListener("voiceschanged", selecionarVoz);
    };
  }, []);

  useEffect(() => {
    if (!ultimoChamado) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!vozSelecionada) return;

    const currentId = `${ultimoChamado.nomeCidadao}-${ultimoChamado.mesa}-${ultimoChamado.hora}`;
    if (ultimoChamadoId.current === currentId) return;
    ultimoChamadoId.current = currentId;

    const msg = new SpeechSynthesisUtterance(`${ultimoChamado.nomeCidadao}, dirigir-se ao ${ultimoChamado.mesa}`);
    msg.voice = vozSelecionada;
    msg.lang = vozSelecionada.lang || "pt-BR";
    msg.rate = 1;
    msg.pitch = 1;

    const synth = window.speechSynthesis;
    synth.cancel();
    setTimeout(() => {
      synth.speak(msg);
    }, 50);
  }, [ultimoChamado, vozSelecionada]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 font-sans">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1600px] flex-col">
        <header className="mb-4 flex-none md:mb-8">
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
            <img
              src={logoPrefeituraSrc}
              alt="Logo Prefeitura de Fortaleza"
              className="h-16 w-auto object-contain drop-shadow-sm sm:h-20 md:h-28"
            />
            <div className="text-center md:text-left">
              <div className="mb-1 flex items-center justify-center gap-2 sm:gap-3 md:justify-start">
                <h1 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl md:text-5xl">
                  Painel de Chamadas
                </h1>
                <Volume2 className="h-5 w-5 animate-pulse text-primary sm:h-6 sm:w-6 md:h-8 md:w-8" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex flex-grow flex-col gap-4 md:gap-6">
          {ultimoChamado ? (
            <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground shadow-[0_20px_50px_-20px_rgba(var(--primary-rgb),0.4)]">
              <div className="pointer-events-none absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl" />

              <div className="relative z-10 space-y-4 p-5 text-center sm:p-6 md:space-y-6 md:p-10 xl:p-12">
                <div className="text-base font-bold uppercase tracking-widest opacity-90 sm:text-lg md:text-2xl">
                  Chamando Agora
                </div>

                <div className="break-words py-1 text-3xl font-black leading-tight drop-shadow-sm sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
                  {ultimoChamado.nomeCidadao}
                </div>

                <div className="mt-4 flex items-center justify-center md:mt-6">
                  <div className="inline-flex max-w-full items-center gap-3 rounded-[2rem] border border-white/30 bg-white/20 px-4 py-3 shadow-lg ring-4 ring-white/10 backdrop-blur-md sm:px-6 md:gap-4 md:px-8 md:py-5">
                    <MapPin className="h-6 w-6 shrink-0 opacity-80 md:h-9 md:w-9" />
                    <div className="text-left">
                      <span className="mb-1 block text-sm font-medium leading-none opacity-90 sm:text-base md:text-xl">
                        Dirija-se a:
                      </span>
                      <span className="block break-words text-2xl font-extrabold sm:text-3xl md:text-5xl">
                        {ultimoChamado.mesa}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2 text-sm font-medium opacity-80 sm:text-base md:mt-6 md:text-xl">
                  <Clock className="h-5 w-5" />
                  Horário da chamada: {ultimoChamado.hora}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-2 border-dashed bg-white/50 p-8 text-center shadow-sm backdrop-blur sm:p-12 md:p-16">
              <div className="flex items-center justify-center gap-3 text-lg font-semibold text-muted-foreground sm:text-2xl md:text-3xl">
                <span className="relative flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
                </span>
                Aguardando próxima chamada...
              </div>
            </Card>
          )}

          {historico.length > 1 && (
            <div className="pt-1 md:pt-2">
              <h2 className="mb-3 flex items-center gap-2 px-1 text-lg font-bold text-slate-700 sm:text-xl md:mb-4 md:text-2xl">
                <Clock className="h-6 w-6 text-primary" />
                Últimos Chamados
              </h2>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
                {historico.slice(1).map((chamado, index) => (
                  <Card
                    key={index}
                    className="border-b-0 border-l-4 border-r-0 border-t-0 border-l-primary bg-white/80 p-4 shadow-sm transition-all backdrop-blur-sm hover:shadow-md md:p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="overflow-hidden">
                        <div className="mb-1 truncate text-lg font-bold leading-tight text-slate-800 md:text-xl">
                          {chamado.nomeCidadao}
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary/70" />
                          Local: <span className="text-sm font-bold text-primary md:text-base">{chamado.mesa}</span>
                        </div>
                      </div>
                      <div className="whitespace-nowrap text-right">
                        <span className="flex items-center justify-end gap-1 rounded-md bg-slate-100 px-2 py-1 text-sm font-bold text-slate-500">
                          <Clock className="h-3 w-3" />
                          {chamado.hora}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
