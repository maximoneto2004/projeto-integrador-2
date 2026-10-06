from django.urls import path

from integracao import views

urlpatterns = [
    path("cidadao/sessao/", views.SessaoConsultaView.as_view(), name="integracao-sessao"),
    path("cidadao/auth/iniciar/", views.AuthIniciarView.as_view(), name="integracao-auth-iniciar"),
    path("cidadao/auth/verificar/", views.AuthVerificarView.as_view(), name="integracao-auth-verificar"),
    path("cidadao/buscar/", views.CidadaoBuscaView.as_view(), name="integracao-cidadao-buscar"),
    path("cidadao/criar/", views.CidadaoCriarView.as_view(), name="integracao-cidadao-criar"),
    path("bairros/", views.BairrosView.as_view(), name="integracao-bairros"),
    path("unidades/", views.UnidadesView.as_view(), name="integracao-unidades"),
    path("tipos-servico/", views.TiposServicoView.as_view(), name="integracao-tipos"),
    path("unidades/<uuid:unidade_id>/servicos/", views.ServicosUnidadeView.as_view(), name="integracao-servicos-unidade"),
    path("vagas/", views.VagasView.as_view(), name="integracao-vagas"),
    path("agendamentos/", views.AgendamentosView.as_view(), name="integracao-agendamentos"),
    path("agendamentos/<uuid:agendamento_id>/cancelar/", views.CancelarAgendamentoView.as_view(), name="integracao-cancelar"),
    path("receitas/", views.ReceitasView.as_view(), name="integracao-receitas"),
    path("receitas/<uuid:receita_id>/", views.ReceitaDetalheView.as_view(), name="integracao-receita-detalhe"),
    path("receitas/<uuid:receita_id>/disponibilidade/", views.DisponibilidadeReceitaView.as_view(), name="integracao-receita-disponibilidade"),
]
