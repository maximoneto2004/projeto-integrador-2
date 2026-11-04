import type { ReactNode } from "react";
import { HeartPulse, CalendarCheck, Pill, Activity } from "lucide-react";
import bgLogin from "@/assets/images/bgLogin.jpg";
import { BrandLogo } from "@/components/BrandLogo";

// Estilo dos campos de texto das telas de acesso (login, alterar senha).
export const CAMPO_AUTH =
  "h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus-visible:ring-ring transition-all";

const DESTAQUES = [
  { icon: CalendarCheck, label: "Agendamentos" },
  { icon: Pill, label: "Retirada de medicamentos" },
  { icon: Activity, label: "Indicadores da rede" },
];

type AuthLayoutProps = {
  children: ReactNode;
  rodape?: ReactNode;
};

export function AuthLayout({ children, rodape }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <aside className="relative h-56 sm:h-64 lg:h-auto lg:min-h-screen lg:w-[55%] overflow-hidden bg-marca-800 text-white">
        <img
          src={bgLogin}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-top grayscale mix-blend-luminosity opacity-90"
        />
        {/* Filtro verde da marca sobre a foto em tons de cinza */}
        <div className="absolute inset-0 bg-marca-500 mix-blend-multiply opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-marca-900/95 via-marca-900/30 to-marca-900/40" />

        <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8 lg:p-12">
          <BrandLogo size="lg" tone="light" className="drop-shadow-lg" />

          <div className="hidden lg:block max-w-lg space-y-6">
            {/* <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-marca-200 ring-1 ring-white/15 backdrop-blur">
              <HeartPulse className="h-4 w-4 text-destaque-300" />
              Rede municipal de saúde
            </span> */}
            <h2 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight">
              Cuidado que chega <span className="text-destaque-300">mais perto</span> de quem precisa.
            </h2>
            {/* <p className="text-lg text-white/75">
              Agendamentos, atendimentos e medicamentos dos postos de saúde reunidos em um só lugar.
            </p> */}
            {/* <ul className="flex flex-wrap gap-2">
              {DESTAQUES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium ring-1 ring-white/15 backdrop-blur"
                >
                  <Icon className="h-4 w-4 text-marca-200" />
                  {label}
                </li>
              ))}
            </ul> */}
          </div>
        </div>
      </aside>

      <main className="relative flex flex-1 items-start lg:items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-marca-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-destaque-500/10 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md -mt-20 lg:mt-0">
          <div className="rounded-3xl bg-white p-7 sm:p-9 shadow-2xl shadow-marca-800/10 ring-1 ring-black/5">{children}</div>
          {rodape && <p className="mt-6 text-center text-xs text-slate-500">{rodape}</p>}
        </div>
      </main>
    </div>
  );
}
