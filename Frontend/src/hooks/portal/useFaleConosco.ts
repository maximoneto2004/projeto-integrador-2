import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { api } from "@/services/api";
import { toast } from "@/lib/sonner";

interface FaleConoscoData {
  nome_completo: string;
  email: string;
  assunto: string;
  mensagem: string;
}

type ApiErrorPayload =
  | string
  | { detail?: string; result?: string }
  | Record<string, unknown>
  | unknown;

function getErrorMessage(payload: ApiErrorPayload) {
  if (!payload) return "Erro ao enviar a mensagem.";

  if (typeof payload === "string") return payload;

  if (typeof payload === "object" && payload !== null) {
    const p = payload as any;

    if (typeof p.result === "string" && p.result.trim()) return p.result;
    if (typeof p.detail === "string" && p.detail.trim()) return p.detail;

    const parts: string[] = [];
    for (const [field, value] of Object.entries(p)) {
      if (Array.isArray(value)) {
        for (const v of value) parts.push(`${field}: ${String(v)}`);
      } else if (value != null && typeof value !== "object") {
        parts.push(`${field}: ${String(value)}`);
      }
    }

    if (parts.length) return parts.join(" | ");
  }

  return "Erro ao enviar a mensagem.";
}

export function useFaleConosco() {
  return useMutation({
    mutationFn: async (payload: FaleConoscoData) => {
      const { data } = await api.post("fale-conosco/", payload);
      return data;
    },
    onSuccess: () => {
      toast.success(
        "Mensagem enviada com sucesso! Entraremos em contato em breve.",
      );
    },
    onError: (error: unknown) => {
      const apiError = (error as AxiosError<ApiErrorPayload>)?.response?.data;
      toast.error(getErrorMessage(apiError));
    },
  });
}
