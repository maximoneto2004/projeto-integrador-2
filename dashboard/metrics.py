def calculate_pct_acima_esperado(tempo_medio_min, esperado_min):
    try:
        tempo_medio = float(tempo_medio_min or 0)
        esperado = float(esperado_min or 0)
    except (TypeError, ValueError):
        return 0.0

    if esperado <= 0:
        return 0.0

    return max(0.0, ((tempo_medio - esperado) / esperado) * 100)


def calculate_tempo_excedente_medio_min(tempo_medio_min, esperado_min):
    try:
        tempo_medio = float(tempo_medio_min or 0)
        esperado = float(esperado_min or 0)
    except (TypeError, ValueError):
        return 0.0

    return max(0.0, tempo_medio - esperado)
