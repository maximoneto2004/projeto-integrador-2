
from cidadaos.requests_fd import get_valid_token_or_none
from django import template

register = template.Library()


@register.simple_tag(takes_context=True)
def get_name_if_is_logged(context):
    request = context['request']
    token = get_valid_token_or_none(request)
    if token:
        return token['given_name']