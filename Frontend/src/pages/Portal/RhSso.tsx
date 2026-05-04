import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useRhSso } from "@/hooks/portal/useRhSso";

const RhSso = () => {
  const [searchParams] = useSearchParams();
  const { handleCode } = useRhSso();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const code = useMemo(() => searchParams.get("code"), [searchParams]);

  useEffect(() => {
    console.log("[RHSSO] /rhsso route loaded");
    console.log("[RHSSO] query params:", Object.fromEntries(searchParams.entries()));
  }, [searchParams]);

  useEffect(() => {
    if (!code) {
      console.log("[RHSSO] missing code in query string");
      setStatus("error");
      setMessage("Código de autorização não encontrado na URL.");
      return;
    }

    let isMounted = true;
    const run = async () => {
      setStatus("loading");
      setMessage("Trocando code por token...");
      console.log("[RHSSO] starting exchange with code:", code);
      const data = await handleCode(code);
      if (!isMounted) return;

      if (data?.access_token) {
        setStatus("success");
        setMessage("Token salvo nos cookies com sucesso.");
      } else {
        setStatus("error");
        setMessage("Falha ao obter o token. Verifique logs.");
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, [code, handleCode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Autenticação RHSSO</h1>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-4 text-sm">
          <span className="font-medium text-gray-700">Status:</span>{" "}
          <span className="text-gray-900">{status}</span>
        </div>
      </div>
    </div>
  );
};

export default RhSso;
