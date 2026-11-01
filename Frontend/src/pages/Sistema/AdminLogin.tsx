import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/sonner";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups, getDefaultRouteByRole } from "@/lib/authHelpers";
import { authService } from "@/services/sistema/authService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthLayout, CAMPO_AUTH } from "@/components/AuthLayout";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const usuario = await login({ email, password: senha });
      toast.success("Login realizado com sucesso!");
      const userRole = deriveRoleFromGroups(usuario?.grupos);
      navigate(getDefaultRouteByRole(userRole));
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Usuário ou senha inválidos");
      console.log(err);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const response = await authService.passwordReset({ email: forgotEmail });
      toast.success(response.data.detail || "Se o e-mail estiver cadastrado, enviaremos as instruções.");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err) {
      toast.error("Não foi possível enviar as instruções.");
      console.log(err);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <AuthLayout rodape="Uso exclusivo de profissionais autorizados. Os acessos são registrados.">
      <div className="mb-8 space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2C8576]/10 px-3 py-1 text-xs font-semibold text-[#2C8576]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Acesso restrito a profissionais
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Bem-vindo de volta</h1>
        <p className="text-muted-foreground">Entre com seu e-mail institucional para acessar o sistema.</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="exemplo@fortaleza.ce.gov.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`pl-11 ${CAMPO_AUTH}`}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-sm font-semibold text-[#2C8576] hover:text-[#1E6B5E] transition-colors"
            >
              Esqueceu a senha?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={`pl-11 pr-11 ${CAMPO_AUTH}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="group w-full h-12 bg-[#E2672A] hover:bg-[#C9551C] text-white font-bold text-base rounded-xl shadow-lg shadow-[#E2672A]/25 transition-all active:scale-[0.98]"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Autenticando...
            </>
          ) : (
            <>
              Entrar no sistema
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
            <DialogDescription>Informe o e-mail cadastrado para receber as instruções de recuperação.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-mail</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="exemplo@fortaleza.ce.gov.br"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className={CAMPO_AUTH}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full h-11 rounded-xl bg-[#E2672A] hover:bg-[#C9551C]" disabled={forgotLoading}>
                {forgotLoading ? "Enviando..." : "Enviar instruções"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
};

export default AdminLogin;
