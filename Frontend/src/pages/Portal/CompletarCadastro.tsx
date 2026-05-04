import { Header } from "@/components/portal/Header";
import { FaleConosco } from "@/components/portal/FaleConosco";
import { IntroSection } from "@/components/portal/IntroSection";
import { TabelaCadastro } from "@/components/portal/TabelaCadastro";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ModalTermos } from "@/components/portal/modais/ModalTermos";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/sonner";
import {
  fetchFortalezaDigitalPessoaBase,
  fetchFortalezaDigitalPerfil,
  getFortalezaDigitalEditCadastroUrl,
  mapPerfilToCadastro,
  upsertCidadaoFromSso,
  type FortalezaDigitalPerfil,
} from "@/services/portal/fortalezaDigital";
import { usePortalAuth } from "@/contexts/PortalAuthContext";

const RECENT_CADASTRO_VALIDATION_KEY = "portal:recent-cadastro-validation";

const ValidarCadastro = () => {
  const [showModal, setShowModal] = useState(false);
  // Estado para controlar se o checkbox está marcado
  const [concordou, setConcordou] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [perfil, setPerfil] = useState<FortalezaDigitalPerfil>(null);
  const { accessToken, initializing } = usePortalAuth();
  const navigate = useNavigate();
  const dadosCadastro = mapPerfilToCadastro(perfil);
  const editCadastroUrl = getFortalezaDigitalEditCadastroUrl();

  useEffect(() => {
    let active = true;

    const carregarPerfil = async () => {
      setLoading(true);
      if (!accessToken) {
        setPerfil(null);
        setLoading(false);
        return;
      }
      const perfilFallback = await fetchFortalezaDigitalPerfil(accessToken);
      const cpf = String(perfilFallback?.cpf ?? perfilFallback?.preferred_username ?? "").trim();
      const data = cpf ? await fetchFortalezaDigitalPessoaBase(accessToken, cpf) : null;
      const perfilFinal = data ?? perfilFallback;
      if (!active) return;

      setPerfil(perfilFinal);
      setLoading(false);
    };

    carregarPerfil();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const handleSubmit = async () => {
    if (!accessToken || saving) return;
    if (!dadosCadastro.bairro) {
      toast.error("Seu bairro não foi encontrado no Fortaleza Digital. Atualize seu endereço e tente novamente.");
      return;
    }
    setSaving(true);
    try {
      const response = await upsertCidadaoFromSso(accessToken);
      if (response?.success === false) {
        const bairroErrors = response?.errors?.bairro;
        const bairroMessage = Array.isArray(bairroErrors) ? bairroErrors.join(" ") : null;
        const fallbackMessage = typeof response?.result === "string" ? response.result : "Não foi possível validar seu cadastro.";
        toast.error(bairroMessage || fallbackMessage);
        return;
      }
      sessionStorage.setItem(RECENT_CADASTRO_VALIDATION_KEY, String(Date.now()));
      navigate("/perfil");
    } catch {
      toast.error("Não foi possível validar seu cadastro agora.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      <IntroSection title="Validar cadastro" />

      <div className="container mx-auto py-6 space-y-4">
        {loading || initializing ? (
          <div className="border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">Carregando dados do Fortaleza Digital...</div>
        ) : (
          <TabelaCadastro dados={dadosCadastro} />
        )}

        {/* BOX DE CONSENTIMENTO */}
        <div className="flex items-start space-x-3 p-6 border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
          <div className="relative flex items-center h-5">
            <input
              id="consentimento"
              type="checkbox"
              checked={concordou}
              onChange={(e) => setConcordou(e.target.checked)}
              className="peer h-5 w-5 cursor-pointer appearance-none border border-slate-300 bg-white checked:bg-slate-900 checked:border-slate-900 transition-all shadow-sm"
            />
            <span className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>

          <div className="flex flex-col">
            <label htmlFor="consentimento" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
              Li e concordo com os{" "}
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="text-blue-700 underline underline-offset-4 font-bold transition-colors"
              >
                termos de uso e política de privacidade de dados.
              </button>
            </label>

            <div className="mt-1 text-[10px] uppercase text-slate-400 font-medium tracking-tight">
              Aceite registrado em: {new Date().toLocaleDateString("pt-BR")}
            </div>
          </div>
        </div>

        {/* ALINHAMENTO DO BOTÃO À DIREITA */}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            size="lg"
            variant="outline"
            className="self-start rounded-none px-12 uppercase tracking-widest font-bold shadow-md transition-all"
            disabled={!editCadastroUrl}
            onClick={() => {
              if (!editCadastroUrl) return;
              window.location.href = editCadastroUrl;
            }}
          >
            Atualizar Cadastro
          </Button>
          <Button
            size="lg"
            className="self-end rounded-none px-12 uppercase tracking-widest font-bold shadow-md transition-all disabled:opacity-30 disabled:grayscale"
            disabled={!concordou || loading || saving || !accessToken}
            onClick={handleSubmit}
          >
            {saving ? "Enviando..." : "Seguir"}
          </Button>
        </div>
      </div>

      <FaleConosco />

      {/* COMPONENTE MODAL */}
      <ModalTermos isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
};

export default ValidarCadastro;
