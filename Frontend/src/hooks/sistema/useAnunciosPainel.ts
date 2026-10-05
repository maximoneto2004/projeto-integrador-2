import { useCallback, useEffect, useRef, useState } from "react";
import type { PainelChamada } from "@/types/painel";

const chaveChamada = (c: PainelChamada) => c.chamada_id ?? `${c.id}-${c.horario_chamada ?? ""}`;
const textoAnuncio = (c: PainelChamada) => `${c.cidadao || "Paciente"}. Dirija-se a: ${c.guiche || c.local || "recepção"}.`;

/**
 * Anuncia em voz (com um sinal sonoro antes) cada chamada nova do painel, em ordem e sem perder chamadas
 * que chegaram no mesmo intervalo de consulta.
 *
 * Navegadores bloqueiam áudio e fala até a pessoa interagir com a página, por isso o som só começa
 * depois de `ativarSom` ser chamado a partir de um clique.
 */
export function useAnunciosPainel(chamadas: PainelChamada[] | undefined) {
  const [somAtivo, setSomAtivo] = useState(false);
  const somAtivoRef = useRef(false);
  const anunciadas = useRef<Set<string> | null>(null);
  const fila = useRef<PainelChamada[]>([]);
  const processando = useRef(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const voz = useRef<SpeechSynthesisVoice | null>(null);
  // O Chrome pode descartar a utterance antes do fim se não houver referência, e o onend nunca dispara.
  const falasEmAndamento = useRef(new Set<SpeechSynthesisUtterance>());

  const definirSomAtivo = useCallback((ativo: boolean) => {
    somAtivoRef.current = ativo;
    setSomAtivo(ativo);
  }, []);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const selecionarVoz = () => {
      const vozes = synth.getVoices();
      voz.current =
        vozes.find((v) => v.lang?.toLowerCase() === "pt-br") || vozes.find((v) => v.lang?.toLowerCase().startsWith("pt")) || null;
    };
    selecionarVoz();
    synth.addEventListener("voiceschanged", selecionarVoz);
    return () => {
      synth.removeEventListener("voiceschanged", selecionarVoz);
      synth.cancel();
      audioCtx.current?.close();
    };
  }, []);

  const tocarSinal = useCallback(async () => {
    const ctx = audioCtx.current;
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    const inicio = ctx.currentTime;
    // "Ding-dong" de dois tons.
    [
      [880, 0],
      [659, 0.35],
    ].forEach(([frequencia, atraso]) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequencia;
      ganho.gain.setValueAtTime(0.0001, inicio + atraso);
      ganho.gain.exponentialRampToValueAtTime(0.5, inicio + atraso + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + atraso + 0.7);
      osc.connect(ganho).connect(ctx.destination);
      osc.start(inicio + atraso);
      osc.stop(inicio + atraso + 0.75);
    });
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }, []);

  const falar = useCallback(
    (texto: string) =>
      new Promise<void>((resolve) => {
        const synth = window.speechSynthesis;
        if (!synth) return resolve();
        const fala = new SpeechSynthesisUtterance(texto);
        if (voz.current) fala.voice = voz.current;
        fala.lang = voz.current?.lang || "pt-BR";
        fala.rate = 0.95;

        let terminou = false;
        const finalizar = () => {
          if (terminou) return;
          terminou = true;
          clearTimeout(limite);
          falasEmAndamento.current.delete(fala);
          resolve();
        };
        // Garante que a fila siga mesmo se o navegador não disparar onend.
        const limite = setTimeout(finalizar, 5000 + texto.length * 120);
        fala.onend = finalizar;
        fala.onerror = (evento) => {
          if (evento.error === "not-allowed") definirSomAtivo(false);
          finalizar();
        };

        falasEmAndamento.current.add(fala);
        synth.resume(); // o Chrome às vezes deixa a fila pausada após a aba ficar em segundo plano
        synth.speak(fala);
      }),
    [definirSomAtivo],
  );

  const processarFila = useCallback(async () => {
    if (processando.current) return;
    processando.current = true;
    try {
      while (somAtivoRef.current && fila.current.length) {
        const chamada = fila.current.shift()!;
        await tocarSinal();
        await falar(textoAnuncio(chamada));
      }
    } finally {
      processando.current = false;
    }
  }, [tocarSinal, falar]);

  useEffect(() => {
    if (!chamadas) return;
    // Na primeira carga, o que já está na tela não é anunciado de novo.
    if (anunciadas.current === null) {
      anunciadas.current = new Set(chamadas.map(chaveChamada));
      return;
    }
    const vistas = anunciadas.current;
    // A API devolve da mais recente para a mais antiga; anuncia na ordem em que foram feitas.
    const novas = chamadas.filter((c) => !vistas.has(chaveChamada(c))).reverse();
    novas.forEach((c) => vistas.add(chaveChamada(c)));
    if (!novas.length || !somAtivoRef.current) return;
    fila.current.push(...novas);
    processarFila();
  }, [chamadas, processarFila]);

  const ativarSom = useCallback(() => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx && !audioCtx.current) audioCtx.current = new AudioCtx();
    audioCtx.current?.resume();
    // Fala vazia ainda dentro do clique: destrava a síntese de voz nos navegadores mais restritivos.
    window.speechSynthesis?.speak(new SpeechSynthesisUtterance(""));
    definirSomAtivo(true);
    // Feedback imediato e libera a fala dentro do gesto do usuário.
    fila.current = [];
    tocarSinal().then(() => falar("Som do painel ativado."));
  }, [definirSomAtivo, tocarSinal, falar]);

  return { somAtivo, ativarSom };
}
