import { formatCpf } from "@/utils/cpfFormater";
import { formatPhone } from "@/utils/telefoneFormater";
import { Button } from "@/components/ui/button";
import { Field } from "./Field";
import type { TabelaCadastroDados } from "./TabelaCadastro";
import { getFortalezaDigitalEditCadastroUrl } from "@/services/portal/fortalezaDigital";

type CidadaoPerfilProps = {
  dados?: TabelaCadastroDados | null;
};

const display = (value?: string | null) => (value && String(value).trim() ? String(value) : "—");

function CidadaoPerfil({ dados }: CidadaoPerfilProps) {
  const redirectUrl = getFortalezaDigitalEditCadastroUrl();

  return (
    <div className="">
      {/* TÃTULO */}
      {/* <h2 className="text-2xl font-semibold mb-8 text-portal-muted">
        Dados pessoais e de contato
      </h2> */}

      {/* GRID PRINCIPAL */}
      <div className="gap-10">
        {/* COLUNA ESQUERDA */}

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Field label="Nome completo">{display(dados?.nome)}</Field>
            </div>
            <Field label="CPF">{formatCpf(dados?.cpf)}</Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="E-mail">{display(dados?.email)}</Field>
            <Field label="Celular">{formatPhone(dados?.telefone)}</Field>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <h3 className="text-xl font-semibold mb-2 dark:text-portal-text-strong">Endereço</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Field label="Logradouro">{display(dados?.logradouro)}</Field>
          </div>
          <Field label="Número">{display(dados?.numero)}</Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2">
            <Field label="Bairro">{display(dados?.bairro)}</Field>
          </div>
          <Field label="Complemento">{display(dados?.complemento)}</Field>
          <Field label="CEP">{display(dados?.cep)}</Field>
        </div>
      </div>
      <div className="mt-8 flex justify-end">
        <Button
          size="sm"
          className="rounded-none px-6 h-9 uppercase tracking-widest text-[10px] font-bold shadow-md transition-all"
          onClick={() => {
            window.location.href = redirectUrl;
          }}
        >
          Atualizar Cadastro
        </Button>
      </div>
    </div>
  );
}

export { CidadaoPerfil };
