import { Header } from "@/components/portal/Header";
import { FaleConosco } from "@/components/portal/FaleConosco";
import { IntroSection } from "@/components/portal/IntroSection";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowUpCircle } from "lucide-react";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getFortalezaDigitalEditCadastroUrl } from "@/services/portal/fortalezaDigital";

const Selo = () => {
    const { initializing } = usePortalAuth();
    const redirectUrl = getFortalezaDigitalEditCadastroUrl();

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Header />
            <IntroSection title="Selo incompatível" />

            <div className="container mx-auto px-4 py-6 sm:py-10 max-w-4xl">
                {initializing && (
                    <div className="mb-6 border border-slate-200 bg-white p-4 text-center text-slate-500 shadow-sm">
                        Carregando acesso...
                    </div>
                )}
                {/* CARD PRINCIPAL */}
                <div className="bg-white border-l-4 border-l-amber-500 border border-slate-200 shadow-sm p-5 sm:p-8">

                    <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">

                        <div className="bg-amber-100 p-3 mx-auto sm:mx-0 shrink-0">
                            <AlertCircle className="text-amber-600" size={32} />
                        </div>

                        <div className="space-y-4 w-full text-center sm:text-left">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-800 uppercase tracking-tight">
                                Nível de acesso insuficiente
                            </h2>

                            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                                Identificamos que sua conta possui atualmente o <strong className="text-slate-900">Selo Básico</strong>.
                                Para acessar este sistema e realizar solicitações, é necessário possuir, no mínimo, o
                                <strong className="text-slate-900 font-bold underline decoration-amber-500 underline-offset-4"> Selo Intermediário</strong>.
                            </p>

                            {/* BOX DE INSTRUÇÕES */}
                            <div className="bg-slate-50 border border-slate-100 p-4 sm:p-5 space-y-3 text-left">
                                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 uppercase">
                                    <ArrowUpCircle size={16} />
                                    O que fazer agora?
                                </div>

                                <ul className="text-xs sm:text-sm text-slate-600 space-y-3 list-none">
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-amber-600">1.</span>
                                        Acesse o portal do <strong>Fortaleza Digital</strong>.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-amber-600">2.</span>
                                        Atualize seus dados para atingir o nível Intermediário.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-amber-600">3.</span>
                                        Após a atualização para o Selo Intermediário, retorne ao sistema para concluir seu login.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTÕES - Empilhados no mobile, lado a lado no desktop */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">

                    <Button
                        size="lg"
                        className="rounded-none px-12 uppercase tracking-widest text-xs font-bold shadow-md transition-all"
                        onClick={() => {
                            window.location.href = redirectUrl;
                        }}
                    >
                        Atualizar no Fortaleza Digital
                    </Button>
                </div>
            </div>

            <FaleConosco />
        </div>
    );
};

export default Selo;
