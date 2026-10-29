import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQualidadeDados } from "@/hooks/sistema/useRecepcaoQualidade";
import type { QualidadeVerificacao } from "@/types/api";

const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

function Verificacao({ item }: { item: QualidadeVerificacao }) {
  const ok = item.total === 0;
  return (
    <li className="space-y-2 border-t py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Sem pendência" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="Com pendência" />
          )}
          <div className="min-w-0">
            <p className="font-medium">{item.titulo}</p>
            <p className="text-sm text-muted-foreground">{item.descricao}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={ok ? "text-sm text-muted-foreground" : "text-lg font-semibold tabular-nums"}>
            {ok ? "Tudo certo" : `${item.total.toLocaleString("pt-BR")} de ${item.base.toLocaleString("pt-BR")}`}
          </p>
          {!ok && item.pct !== null && <p className="text-xs text-muted-foreground">{item.pct.toLocaleString("pt-BR")}%</p>}
        </div>
      </div>
      {!ok && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-6 text-sm">
          {item.itens.length > 0 && (
            <details>
              <summary className="cursor-pointer text-muted-foreground">
                Ver detalhes ({item.itens.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {item.itens.map((linha) => (
                  <li key={linha.id}>
                    {linha.nome}
                    {linha.detalhe && <span className="text-muted-foreground"> · {linha.detalhe}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <Link to={item.link} className="text-primary underline-offset-4 hover:underline">
            Corrigir
          </Link>
        </div>
      )}
    </li>
  );
}

const AdminQualidadeDadosPage = () => {
  const { data: painel, isLoading, error } = useQualidadeDados();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <main className="min-w-0 flex-1 bg-muted/30">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-6 py-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Qualidade dos dados</h1>
              <p className="text-sm text-muted-foreground">
                O que falta no cadastro para os painéis mostrarem números confiáveis.
                {painel && ` Atendimentos de ${br(painel.data_inicio)} a ${br(painel.data_fim)}.`}
              </p>
            </div>
          </header>

          <div className="space-y-6 p-6">
            {error && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro ao carregar o painel."}</p>}
            {isLoading && <p className="text-sm text-muted-foreground">Verificando o cadastro...</p>}

            {painel && (
              <>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 pt-6">
                    {painel.pendencias ? (
                      <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden />
                    ) : (
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden />
                    )}
                    <p className="text-lg">
                      <span className="font-semibold">{painel.pendencias}</span> de {painel.verificacoes} verificações com pendência
                    </p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {painel.grupos.map((grupo) => (
                    <Card key={grupo.grupo}>
                      <CardHeader>
                        <CardTitle>{grupo.grupo}</CardTitle>
                        <CardDescription>
                          {grupo.verificacoes.filter((v) => v.total).length} de {grupo.verificacoes.length} com pendência
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul>
                          {/* Pendências primeiro: é o que o administrador precisa ver. */}
                          {[...grupo.verificacoes].sort((a, b) => Number(!a.total) - Number(!b.total)).map((item) => (
                            <Verificacao key={item.chave} item={item} />
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminQualidadeDadosPage;
