type ApiErrorData = {
  result?: string;
  mensagem?: string;
  detail?: string;
  [key: string]: unknown;
};

type ApiErrorShape = {
  response?: { data?: unknown };
  message?: string;
};

const asValidationMessage = (data: unknown): string | null => {
  if (!data || typeof data !== "object") return null;

  const entries = Object.entries(data as Record<string, unknown>);
  const messages = entries
    .map(([field, value]) => {
      if (typeof value === "string" && value.trim()) return `${field}: ${value}`;
      if (Array.isArray(value) && value.length > 0) {
        const first = value.find((item) => typeof item === "string");
        if (typeof first === "string" && first.trim()) return `${field}: ${first}`;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));

  if (!messages.length) return null;
  if (messages.length === 1) return messages[0].replace(/^[^:]+:\s*/, "");
  return messages.join(" | ");
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  const err = error as ApiErrorShape | null | undefined;
  const data = err?.response?.data as
    | { result?: string; mensagem?: string; detail?: string }
    | undefined;

  return (
    data?.result ||
    data?.mensagem ||
    data?.detail ||
    asValidationMessage(err?.response?.data) ||
    err?.message ||
    fallback
  );
}
