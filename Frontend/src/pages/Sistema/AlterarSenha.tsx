import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/lib/sonner";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/sistema/authService";
import bgCras from "@/assets/images/bgCras.jpg";
import citinova from "@/assets/images/logo-citinova-branc.png";
import sdhds from "@/assets/images/logo-sdhds-branca.png";

const AlterarSenha = () => {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !token) {
      toast.error("Link de recuperação inválido.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.passwordResetConfirm({
        uid,
        token,
        new_password: novaSenha,
      });
      toast.success(response.data.detail || "Senha atualizada com sucesso!");
      setNovaSenha("");
      setConfirmarSenha("");
      navigate("/sistema/login");
    } catch (err) {
      toast.error("Não foi possível atualizar a senha.");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-full lg:w-[40%] flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Alterar senha</h1>
            <p className="text-muted-foreground">Defina sua nova senha para continuar.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nova-senha">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="nova-senha"
                    type={showNovaSenha ? "text" : "password"}
                    placeholder="••••••••"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="pl-10 pr-11 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNovaSenha((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showNovaSenha ? "Ocultar nova senha" : "Mostrar nova senha"}
                  >
                    {showNovaSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmar-senha">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="confirmar-senha"
                    type={showConfirmarSenha ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="pl-10 pr-11 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmarSenha((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showConfirmarSenha ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
                  >
                    {showConfirmarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#f25c2d] hover:bg-[#d84a1f] text-white font-bold text-md rounded-xl mt-4 transition-transform active:scale-[0.98]"
                disabled={loading || !uid || !token}
              >
                {loading ? "Atualizando..." : "Atualizar senha"}
              </Button>
            </form>
          </div>

          {/* <p className="text-center text-sm text-slate-500">Suporte técnico: (85) 0000-0000</p> */}
        </div>
      </div>

      <div className="hidden lg:block lg:w-[60%] relative overflow-hidden bg-slate-200">
        <img src={bgCras} alt="" aria-hidden="true" className="absolute inset-0 z-0 h-full w-full object-cover" />
        <div className="absolute inset-0 z-10 bg-black/10" />

        <div className="absolute top-8 left-8 z-20">
          <img src={sdhds} alt="Logo SDHDS" className="h-28 w-auto object-contain drop-shadow-lg" />
        </div>

        <div className="absolute bottom-8 left-8 z-20">
          <img src={citinova} alt="Logo Citinova" className="h-16 w-auto object-contain drop-shadow-lg" />
        </div>
      </div>
    </div>
  );
};

export default AlterarSenha;
