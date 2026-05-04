from django.contrib import admin
from .models import FilaEspera


class FilaEsperaAdmin(admin.ModelAdmin):
    list_display = ('cidadao', 'unidade', 'servico', 'created_at')


admin.site.register(FilaEspera, FilaEsperaAdmin)

# Register your models here.
