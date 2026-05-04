import { Field } from "./Field";

export type TabelaCadastroDados = {
    nome?: string | null;
    cpf?: string | null;
    email?: string | null;
    telefone?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    complemento?: string | null;
    cep?: string | null;
};

type TabelaCadastroProps = {
    dados?: TabelaCadastroDados | null;
};

const display = (value?: string | null) =>
    value && String(value).trim() ? String(value) : "—";

export const TabelaCadastro = ({ dados }: TabelaCadastroProps) => {
    return (
        // Container principal com bordas quadradas e fundo sutil
        <div className="border border-slate-200 bg-white p-8 space-y-10 shadow-sm">
            
            {/* SEÇÃO: DADOS PESSOAIS */}
            <section>
                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-sm uppercase tracking-widest font-bold text-slate-500">
                        Dados pessoais e de contato
                    </h2>
                    <div className="h-px flex-1 bg-slate-200"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l border-slate-200">
                    <div className="md:col-span-2 border-r border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                        <Field label="Nome completo">{display(dados?.nome)}</Field>
                    </div>
                    <div className="border-r border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                        <Field label="CPF">{display(dados?.cpf)}</Field>
                    </div>
                    <div className="md:col-span-2 border-r border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                        <Field label="E-mail">{display(dados?.email)}</Field>
                    </div>
                    <div className="border-r border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                        <Field label="Celular">{display(dados?.telefone)}</Field>
                    </div>
                </div>
            </section>

            {/* SEÇÃO: ENDEREÇO */}
            <section>
                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-sm uppercase tracking-widest font-bold text-slate-500">
                        Localização
                    </h2>
                    <div className="h-px flex-1 bg-slate-200"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 border-t border-l border-slate-200">
                    <div className="md:col-span-3 border-r border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                        <Field label="Logradouro">{display(dados?.logradouro)}</Field>
                    </div>
                    <div className="border-r border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                        <Field label="Número">{display(dados?.numero)}</Field>
                    </div>
                    <div className="md:col-span-2 border-r border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                        <Field label="Bairro">{display(dados?.bairro)}</Field>
                    </div>
                    <div className="border-r border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                        <Field label="Complemento">{display(dados?.complemento)}</Field>
                    </div>
                    <div className="border-r border-b border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                        <Field label="CEP">{display(dados?.cep)}</Field>
                    </div>
                </div>
            </section>
        </div>
    );
};
