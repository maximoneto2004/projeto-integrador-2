from drf_spectacular.extensions import OpenApiAuthenticationExtension


class CitizenSessionAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "integracao.authentication.CitizenSessionAuthentication"
    name = "CitizenSession"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "header",
            "name": "X-Citizen-Session",
            "description": "Token opaco retornado pela verificação do desafio do cidadão.",
        }


class IntegrationKeyAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "integracao.authentication.IntegrationKeyAuthentication"
    name = "IntegrationKey"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "header",
            "name": "X-Integration-Key",
            "description": "Credencial dedicada ao agente de login, configurada por ambiente.",
        }
