import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/sonner";
import { useFaleConosco } from "@/hooks/portal/useFaleConosco";

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const MAX_MENSAGEM = 500;
const MAX_NAME = 150;

export function FaleConosco() {
  const [isOpen, setIsOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");

  const { mutate, isPending } = useFaleConosco();

  const handleNomeChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_NAME) {
      setNome(value);
    }
  };

  const handleSubmit = () => {
    const n = nome.trim();
    const e = email.trim();
    const a = assunto.trim();
    const m = mensagem.trim();

    if (!n) {
      toast.error("Informe seu nome completo.");
      return;
    }

    if (!e) {
      toast.error("Informe seu e-mail.");
      return;
    }

    if (!isValidEmail(e)) {
      toast.error("E-mail inválido. Ex: nome@dominio.com");
      return;
    }

    if (!a) {
      toast.error("Informe o assunto.");
      return;
    }

    if (!m) {
      toast.error("Escreva a mensagem.");
      return;
    }

    if (m.length > MAX_MENSAGEM) {
      toast.error(`A mensagem deve ter no máximo ${MAX_MENSAGEM} caracteres.`);
      return;
    }

    if (n.length > MAX_NAME) {
      toast.error(`O nome completo deve ter no máximo ${MAX_NAME} caracteres.`);
      return;
    }

    mutate(
      {
        nome_completo: n,
        email: e,
        assunto: a,
        mensagem: m,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          setNome("");
          setEmail("");
          setAssunto("");
          setMensagem("");
        },
      }
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-full p-4 shadow-lg hover:bg-primary/90 transition-all z-50 flex items-center gap-2 group"
        title="Fale Conosco"
        type="button"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
          Fale Conosco
        </span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Fale Conosco
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome completo *</Label>
              <Input
                id="nome"
                value={nome}
                maxLength={150}
                onChange={handleNomeChange}
                placeholder="Digite seu nome"
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <Label htmlFor="assunto">Assunto *</Label>
              <Input
                id="assunto"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Qual o assunto?"
                maxLength={120}
              />
              <div className="text-right text-xs text-muted-foreground">
                {assunto.length}/120
              </div>
            </div>

            <div>
              <Label htmlFor="mensagem">Mensagem *</Label>
              <Textarea
                id="mensagem"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Descreva sua dúvida ou solicitação..."
                rows={5}
                maxLength={MAX_MENSAGEM}
              />
              <div className="text-right text-xs text-muted-foreground">
                {mensagem.length}/{MAX_MENSAGEM}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
                disabled={isPending}
                type="button"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={isPending}
                type="button"
              >
                {isPending ? "Enviando..." : "Enviar Mensagem"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
