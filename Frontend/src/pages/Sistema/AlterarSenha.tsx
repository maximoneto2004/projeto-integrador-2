import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/lib/sonner";
import { Lock, Eye, EyeOff, KeyRound, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/sistema/authService";
import { AuthLayout, CAMPO_AUTH } from "@/components/AuthLayout";

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
  const linkInvalido = !uid || !token;
  const senhasDiferentes = confirmarSenha.length > 0 && novaSenha !== confirmarSenha;

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
    <AuthLayout
      rodape={
        <Link to="/sistema/login" className="inline-flex items-center gap-1 font-semibold text-primary hover:text-marca-800">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para o login
        </Link>
      }
    >
      <div className="mb-8 space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-marca-500/10 px-3 py-1 text-xs font-semibold text-primary">
          <KeyRound className="h-3.5 w-3.5" />
          Recuperação de acesso
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Alterar senha</h1>
        <p className="text-muted-foreground">Defina sua nova senha para continuar.</p>
      </div>

      {linkInvalido && (
        <div className="mb-5 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          Este link de recuperação é inválido ou está incompleto. Solicite um novo pela tela de login.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="nova-senha">Nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              id="nova-senha"
              type={showNovaSenha ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className={`pl-11 pr-11 ${CAMPO_AUTH}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowNovaSenha((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
              aria-label={showNovaSenha ? "Ocultar nova senha" : "Mostrar nova senha"}
            >
              {showNovaSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmar-senha">Confirmar senha</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              id="confirmar-senha"
              type={showConfirmarSenha ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className={`pl-11 pr-11 ${CAMPO_AUTH}`}
              aria-invalid={senhasDiferentes}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmarSenha((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
              aria-label={showConfirmarSenha ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
            >
              {showConfirmarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {senhasDiferentes && <p className="text-sm text-destructive">As senhas não conferem.</p>}
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-destaque hover:bg-destaque-700 text-white font-bold text-base rounded-xl shadow-lg shadow-destaque-500/25 transition-all active:scale-[0.98]"
          disabled={loading || linkInvalido}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Atualizando...
            </>
          ) : (
            "Atualizar senha"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default AlterarSenha;
