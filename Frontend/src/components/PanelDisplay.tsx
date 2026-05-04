import { usePainelChamadas } from "@/hooks/sistema/usePainelChamadas";

export function PanelDisplay() {
  const { data: chamadas = [], isLoading } = usePainelChamadas({ limite: 1 });
  const currentCall = chamadas[0];

  if (isLoading || !currentCall) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
        <div className="text-3xl font-bold">Painel de Chamadas</div>
        <p className="text-lg">Aguardando próximo chamado...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Chamando</div>
      <div className="rounded-3xl bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 px-8 py-6 shadow-lg border border-primary/20">
        <p className="text-5xl font-black text-primary text-center">{currentCall.cidadao || "Cidadão"}</p>
        <p className="text-2xl text-center mt-2">Guichê {currentCall.guiche || currentCall.local || "Guichê"}</p>
      </div>
    </div>
  );
}
