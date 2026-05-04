import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/sonner";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react"; // Adicionando ícones
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Se tiver o componente Label
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups, getDefaultRouteByRole } from "@/lib/authHelpers";
import { authService } from "@/services/sistema/authService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import bgCras from "@/assets/images/bgCras.jpg";
import citinova from "@/assets/images/logo-citinova-branc.png";
import sdhds from "@/assets/images/logo-sdhds-branca.png";
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
    <div className="min-h-screen bg-background flex">
      {/* Lado Esquerdo - Formulário */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Acesso Restrito</h1>
            <p className="text-muted-foreground">Bem-vindo ao sistema administrativo do CRAS.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@fortaleza.ce.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="pl-10 pr-11 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#f25c2d] hover:bg-[#d84a1f] text-white font-bold text-md rounded-xl mt-4 transition-transform active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? "Autenticando..." : "Entrar no Sistema"}
              </Button>
            </form>
          </div>

          {/* <p className="text-center text-sm text-slate-500">Suporte técnico: (85) 0000-0000</p> */}
        </div>
      </div>

      {/* Lado Direito - Imagem de Fundo e Logos */}
      <div className="hidden lg:block lg:w-[60%] relative overflow-hidden bg-slate-200">
        <img src={bgCras} alt="" aria-hidden="true" className="absolute inset-0 z-0 h-full w-full object-cover" />
        {/* Overlay opcional para melhorar contraste se necessário */}
        <div className="absolute inset-0 z-10 bg-black/10" />

        {/* Logo Superior */}
        <div className="absolute top-8 left-8 z-20">
          <img src={sdhds} alt="Logo SDHDS" className="h-28 w-auto object-contain drop-shadow-lg" />
        </div>

        {/* Logo Inferior */}
        <div className="absolute bottom-8 left-8 z-20">
          <img src={citinova} alt="Logo Citinova" className="h-16 w-auto object-contain drop-shadow-lg" />
        </div>

        {/* Texto de apoio (opcional, mantido comentado conforme seu original) */}
        {/* <div className="absolute bottom-8 right-8 text-white text-right drop-shadow-md">
    <h2 className="text-xl font-bold">Inclusão Social</h2>
    <p className="text-sm opacity-90">Prefeitura de Fortaleza</p>
  </div> 
  */}
      </div>

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
                className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-[#f25c2d] hover:bg-[#d84a1f]" disabled={forgotLoading}>
                {forgotLoading ? "Enviando..." : "Enviar instruções"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLogin;
