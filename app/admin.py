from django.contrib import admin
from django.contrib.admin.models import LogEntry

from .models import Bairro

class BairroAdmin(admin.ModelAdmin):
    search_fields = ("nome",)
    ordering = ("nome",)


admin.site.register(Bairro, BairroAdmin)
admin.site.register(LogEntry)
