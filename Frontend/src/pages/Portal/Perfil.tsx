import { Header } from "@/components/portal/Header";
import { Button } from "@/components/ui/button";
import { User, Calendar, MapPin, Check, List, Clock } from "lucide-react";

import { useState, useEffect, useMemo } from "react";
import { MenuItem } from "@/components/portal/MenuItem";
import { CidadaoPerfil } from "@/components/portal/CidadaoPerfil";
import { FaleConosco } from "@/components/portal/FaleConosco";
import CardsAgendamentos from "@/components/portal/CardsAgendamentos";
import { AgendarSolicitacao } from "@/components/portal/AgendarSolicitacao";
import {
  fetchFortalezaDigitalCidadaoMe,
  fetchFortalezaDigitalPerfil,
  mapPerfilToCadastro,
  upsertCidadaoFromSso,
  type FortalezaDigitalPerfil,
} from "@/services/portal/fortalezaDigital";
import { usePortalAuth } from "@/contexts/PortalAuthContext";

type CidadaoMe = {
  nome?: string | null;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  cep?: string | null;
  bairro?: { nome?: string | null } | string | null;
};

const pickValue = (primary?: string | null, fallback?: string | null) => {
  const p = (primary ?? "").trim();
  if (p) return p;
  const f = (fallback ?? "").trim();
  return f || null;
};

const mapCidadaoMeToCadastro = (cidadao: CidadaoMe | null | undefined) => {
  if (!cidadao) return {};
  const bairro =
    cidadao.bairro && typeof cidadao.bairro === "object"
      ? (cidadao.bairro.nome ?? null)
      : (cidadao.bairro ?? null);

  return {
    nome: cidadao.nome ?? null,
    cpf: cidadao.cpf ?? null,
    email: cidadao.email ?? null,
    telefone: cidadao.telefone ?? null,
    logradouro: cidadao.logradouro ?? null,
    numero: cidadao.numero ?? null,
    bairro: typeof bairro === "string" ? bairro : null,
    complemento: cidadao.complemento ?? null,
    cep: cidadao.cep ?? null,
  };
};

const Perfil = () => {
  const [active, setActive] = useState("perfil");
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<FortalezaDigitalPerfil>(null);
  const [cidadaoMe, setCidadaoMe] = useState<CidadaoMe | null>(null);
  const { accessToken, initializing } = usePortalAuth();

  useEffect(() => {
    let mounted = true;
    const carregarPerfil = async () => {
      setLoading(true);
      if (!accessToken) {
        setPerfil(null);
        setCidadaoMe(null);
        setLoading(false);
        return;
      }

      try {
        await upsertCidadaoFromSso(accessToken);
      } catch {
        // silencioso: ainda conseguimos renderizar o perfil via SSO
      }

      const [data, cidadao] = await Promise.all([
        fetchFortalezaDigitalPerfil(accessToken),
        fetchFortalezaDigitalCidadaoMe(accessToken),
      ]);
      if (!mounted) return;
      setPerfil(data);
      setCidadaoMe((cidadao as CidadaoMe) ?? null);
      setLoading(false);
    };
    void carregarPerfil();
    return () => {
      mounted = false;
    };
  }, [accessToken]);

  const cadastro = useMemo(() => {
    const base = mapPerfilToCadastro(perfil);
    const local = mapCidadaoMeToCadastro(cidadaoMe);

    return {
      nome: pickValue(local.nome, base.nome),
      cpf: pickValue(local.cpf, base.cpf),
      email: pickValue(local.email, base.email),
      telefone: pickValue(local.telefone, base.telefone),
      logradouro: pickValue(local.logradouro, base.logradouro),
      numero: pickValue(local.numero, base.numero),
      bairro: pickValue(local.bairro, base.bairro),
      complemento: pickValue(local.complemento, base.complemento),
      cep: pickValue(local.cep, base.cep),
    };
  }, [cidadaoMe, perfil]);

  const contentTitles = {
    perfil: { 
      title: "Dados pessoais e de contato", 
      sub: "Mantenha suas informações atualizadas.",
      color: "bg-teal-600 dark:bg-portal-secondary" // Cor baseada no logo da prefeitura
    },
    agendamentos: { 
      title: "Meus agendamentos", 
      sub: "Acompanhe suas solicitações marcadas.",
      color: "bg-teal-600 dark:bg-portal-secondary" // Cor dos botões principais
    },
    agendar: { 
      title: "Agende seu atendimento", 
      sub: "Preencha os campos para reservar seu horário.",
      color: "bg-teal-600 dark:bg-portal-secondary"
    },
  };

  return (
    <div className="min-h-screen bg-background"> 
      <Header />

      {loading || initializing ? (
        <div className="container mx-auto px-4 sm:px-6 py-10">
          <div className="border border-slate-200 dark:border-portal-neutral bg-white dark:bg-portal-secondary p-8 text-center text-slate-500 dark:text-portal-text-muted shadow-sm">
            Carregando acesso...
          </div>
        </div>
      ) : (
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 px-4 sm:px-6 py-6 sm:py-10">
        {/* ASIDE */}
        <aside className="lg:col-span-1 bg-white dark:bg-portal-secondary p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-portal-neutral h-fit">
          <h5 className="text-xl font-bold mb-4 sm:mb-6 text-slate-800 dark:text-portal-text-strong border-b border-slate-200 dark:border-portal-neutral pb-2">Menu</h5>
          <nav className="space-y-2">
            <MenuItem
              icon={<User size={18} />}
              label="Perfil"
              active={active === "perfil"}
              onClick={() => setActive("perfil")}
            />
            <MenuItem
              icon={<Clock size={18} />}
              label="Agendamentos"
              active={active === "agendamentos"}
              onClick={() => setActive("agendamentos")}
            />
            <MenuItem
              icon={<Calendar size={18} />}
              label="Agendar"
              active={active === "agendar"}
              onClick={() => setActive("agendar")}
            />
          </nav>
        </aside>

        {/* CARD CENTRAL */}
        <main className="lg:col-span-3 bg-white dark:bg-portal-secondary shadow-lg border border-slate-200 dark:border-portal-neutral overflow-hidden">
          {/* Faixa de cor dinâmica no topo do card */}
          <div className={`${contentTitles[active].color} p-5 sm:p-8 text-white transition-colors duration-500`}>
            <h2 className="text-xl sm:text-2xl font-bold">{contentTitles[active].title}</h2>
            <p className="text-white/80 text-sm">{contentTitles[active].sub}</p>
          </div>

          <div className="p-4 sm:p-8">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {active === "perfil" && (
                <CidadaoPerfil dados={cadastro} />
              )}
              {active === "agendamentos" && <CardsAgendamentos />}
              {active === "agendar" && <AgendarSolicitacao />}
            </div>
          </div>
        </main>
      </div>
      )}

      <FaleConosco />
    </div>
  );
};

export default Perfil;
