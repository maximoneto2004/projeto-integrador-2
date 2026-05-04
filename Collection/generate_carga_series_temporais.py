import argparse
import json
import math
import random
import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path


PASSWORD_HASH = (
    "pbkdf2_sha256$1000000$njCjBnVKdCYakNkeETWYQ5$"
    "mr48x9XeRmgSpdDxnzkyQbRoGDYRG6wFYREXxIJ8NCA="
)


def iso_z(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def parse_date(value: str) -> date:
    return date.fromisoformat(value)


def time_str(t: time | None) -> str | None:
    if not t:
        return None
    return t.strftime("%H:%M:%S")


def add_minutes(t: time, minutes: float) -> time:
    base = t.hour * 60 + t.minute
    total = base + int(round(minutes))
    total = max(0, min(total, (23 * 60) + 59))
    return time(total // 60, total % 60, 0)


def clamp_int(v: float, lo: int, hi: int) -> int:
    return max(lo, min(hi, int(round(v))))


def load_fixture(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


@dataclass(frozen=True)
class ServicoInfo:
    id: str
    tipo_id: str
    tempo_esperado_min: int


def build_daily_counts(start: date, end: date, total: int, seed: int) -> list[tuple[date, int]]:
    rng = random.Random(seed)

    weekly = [1.20, 1.10, 1.00, 1.00, 0.95, 0.45, 0.30]  # Mon..Sun
    monthly = {
        1: 1.15,
        2: 1.10,
        3: 1.00,
        4: 0.95,
        5: 1.05,
        6: 1.08,
        7: 0.92,
        8: 0.98,
        9: 1.00,
        10: 1.04,
        11: 1.06,
        12: 0.88,
    }

    days: list[date] = []
    weights: list[float] = []

    span = (end - start).days
    if span < 0:
        raise ValueError("Período inválido: data_fim antes de data_inicio.")

    for i in range(span + 1):
        d = start + timedelta(days=i)
        w_week = weekly[d.weekday()]
        w_month = monthly.get(d.month, 1.0)
        trend = 0.90 + 0.20 * (i / max(1, span))  # 0.90 -> 1.10
        noise = rng.uniform(0.96, 1.04)
        w = w_week * w_month * trend * noise
        days.append(d)
        weights.append(w)

    total_weight = sum(weights) or 1.0
    raw = [total * (w / total_weight) for w in weights]
    base = [int(math.floor(x)) for x in raw]

    remainder = total - sum(base)
    if remainder > 0:
        frac = sorted(((raw[i] - base[i], i) for i in range(len(raw))), reverse=True)
        for j in range(remainder):
            base[frac[j][1]] += 1
    elif remainder < 0:
        frac = sorted(((raw[i] - base[i], i) for i in range(len(raw))))
        for j in range(-remainder):
            idx = frac[j][1]
            if base[idx] > 0:
                base[idx] -= 1

    return list(zip(days, base))


def fixture_writer(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    f = path.open("w", encoding="utf-8", newline="\n")
    f.write("[\n")
    first = True

    def write_obj(obj: dict):
        nonlocal first
        if not first:
            f.write(",\n")
        json.dump(obj, f, ensure_ascii=False)
        first = False

    def close():
        f.write("\n]\n")
        f.close()

    return write_obj, close


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera fixture grande com sazonalidade (série temporal).")
    parser.add_argument("--out", default="Collection/carga_dados_series_temporais_125k.json")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--agendamentos", type=int, default=125_000)
    parser.add_argument("--cidadaos", type=int, default=30_000)
    parser.add_argument("--usuarios", type=int, default=400)
    parser.add_argument("--start", default="2025-01-01")
    parser.add_argument("--end", default=date.today().isoformat())
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parents[1]
    out_path = base_dir / args.out

    start = parse_date(args.start)
    end = parse_date(args.end)

    rng = random.Random(args.seed)

    unidades_fixture = load_fixture(base_dir / "Collection" / "unidades_cras_db.json")
    bairros_fixture = load_fixture(base_dir / "Collection" / "bairros_db.json")
    servicos_fixture = load_fixture(base_dir / "Collection" / "servicos.json")
    tipos_fixture = load_fixture(base_dir / "Collection" / "tipos_servico.json")

    unidade_ids = [str(u["pk"]) for u in unidades_fixture]
    bairro_ids = [str(b["pk"]) for b in bairros_fixture]

    tipo_tempo = {str(t["pk"]): int(t["fields"].get("tempo_atendimento") or 20) for t in tipos_fixture}

    servicos: list[ServicoInfo] = []
    for s in servicos_fixture:
        sid = str(s["pk"])
        tipo_id = str(s["fields"].get("tipo_servico") or "")
        esperado = int(tipo_tempo.get(tipo_id) or 20)
        servicos.append(ServicoInfo(id=sid, tipo_id=tipo_id, tempo_esperado_min=esperado))

    servicos_comum = [s for s in servicos if s.tempo_esperado_min <= 25]
    servicos_especial = [s for s in servicos if s.tempo_esperado_min > 25]
    if not servicos_comum:
        servicos_comum = servicos

    unit_weights = [rng.uniform(0.7, 1.6) for _ in unidade_ids]
    mean_daily = args.agendamentos / max(1, (end - start).days + 1)

    slots: list[time] = []
    for hour in range(8, 17):
        for minute in range(0, 60, 10):
            if hour == 16 and minute > 50:
                continue
            slots.append(time(hour, minute, 0))

    origem_choices = ["RECEPCAO", "SITE", "156", "FILA"]
    origem_weights = [0.45, 0.30, 0.15, 0.10]

    situacoes = ["FINALIZADO", "CANCELADO_CIDADAO", "CANCELADO_CRAS", "AUSENCIA_CIDADAO"]
    situacao_weights = [0.78, 0.07, 0.07, 0.08]

    eval_prob = 0.38

    write_obj, close = fixture_writer(out_path)

    total_written = 0
    count_users = 0
    count_cidadaos = 0
    count_agendamentos = 0
    count_avaliacoes = 0

    # Usuarios
    for i in range(args.usuarios):
        pk = str(uuid.uuid4())
        unidade = rng.choices(unidade_ids, weights=unit_weights, k=1)[0]
        joined = datetime(2025, 11, 20, 0, 16, 1, tzinfo=timezone.utc) + timedelta(days=rng.randint(0, 90))

        write_obj(
            {
                "model": "usuarios.usuario",
                "pk": pk,
                "fields": {
                    "password": PASSWORD_HASH,
                    "last_login": None,
                    "is_superuser": False,
                    "username": f"profissional{i:05d}",
                    "first_name": "",
                    "last_name": "",
                    "is_staff": False,
                    "is_active": True,
                    "date_joined": iso_z(joined),
                    "created_at": iso_z(joined),
                    "updated_at": iso_z(joined),
                    "email": f"profissional{i:05d}@example.local",
                    "nome_completo": f"Profissional {i:05d}",
                    "cpf": str(810000000001 + i),
                    "telefone": f"85{rng.randint(900000000, 999999999)}",
                    "guiche_atual": None,
                    "unidades_lotacao": [unidade],
                    "tipo_ofertados": [],
                },
            }
        )
        total_written += 1
        count_users += 1

    # Cidadaos
    cidadao_ids: list[str] = []
    for i in range(args.cidadaos):
        pk = str(uuid.uuid4())
        cidadao_ids.append(pk)
        unidade_origem = rng.choices(unidade_ids, weights=unit_weights, k=1)[0]
        bairro = rng.choice(bairro_ids) if bairro_ids else None
        created = datetime(2025, 1, 1, 9, 0, 0, tzinfo=timezone.utc) + timedelta(days=rng.randint(0, 420))

        write_obj(
            {
                "model": "cidadaos.cidadao",
                "pk": pk,
                "fields": {
                    "created_at": iso_z(created),
                    "updated_at": iso_z(created),
                    "is_active": True,
                    "nome": f"Cidadão {i:05d}",
                    "apelido": None,
                    "cpf": str(910000000001 + i),
                    "email": None,
                    "telefone": None,
                    "data_nascimento": None,
                    "nis": None,
                    "rg": None,
                    "orgao_emissor": None,
                    "data_emissao_rg": None,
                    "sexo": None,
                    "logradouro": "",
                    "numero": "",
                    "bairro": bairro,
                    "cep": "",
                    "complemento": None,
                    "origem": rng.choices(origem_choices, weights=origem_weights, k=1)[0],
                    "unidade_origem": unidade_origem,
                },
            }
        )
        total_written += 1
        count_cidadaos += 1

    # Agendamentos + Avaliacoes (inline)
    daily_counts = build_daily_counts(start, end, args.agendamentos, seed=args.seed)

    for d, qtd in daily_counts:
        if qtd <= 0:
            continue
        load_ratio = qtd / max(1.0, mean_daily)

        for _ in range(qtd):
            pk = str(uuid.uuid4())
            cidadao = rng.choice(cidadao_ids)
            unidade = rng.choices(unidade_ids, weights=unit_weights, k=1)[0]

            # 70% comum, 30% especializado (aprox)
            is_especial = rng.random() < 0.30 and bool(servicos_especial)
            servico = rng.choice(servicos_especial if is_especial else servicos_comum)

            situacao = rng.choices(situacoes, weights=situacao_weights, k=1)[0]
            origem = rng.choices(origem_choices, weights=origem_weights, k=1)[0]
            horario = rng.choice(slots)

            inicio = None
            fim = None

            if situacao == "FINALIZADO":
                # Espera aumenta em dias mais carregados + ruído
                wait_mean = 6 + max(0.0, load_ratio - 1.0) * 10
                wait = max(0.0, rng.gauss(wait_mean, 4.0))
                wait = min(wait, 90.0)

                # Duração tende ao esperado, com aumento por sobrecarga + poucos outliers
                dur_mean = servico.tempo_esperado_min + max(0.0, load_ratio - 1.0) * (6 if servico.tempo_esperado_min <= 25 else 12)
                dur = max(5.0, rng.gauss(dur_mean, 5.0 if servico.tempo_esperado_min <= 25 else 10.0))
                if rng.random() < 0.05:
                    dur += rng.uniform(15.0, 60.0)
                dur = min(dur, 180.0)

                inicio = add_minutes(horario, wait)
                fim = add_minutes(inicio, dur)

            created = datetime.combine(d, time(7, 0, 0), tzinfo=timezone.utc)

            write_obj(
                {
                    "model": "agendamentos.agendamento",
                    "pk": pk,
                    "fields": {
                        "created_at": iso_z(created),
                        "updated_at": iso_z(created),
                        "is_active": True,
                        "cidadao": cidadao,
                        "atendente": None,
                        "unidade": unidade,
                        "servico": servico.id,
                        "vaga": None,
                        "data": d.isoformat(),
                        "horario": time_str(horario),
                        "data_hora_inicio_atendimento": time_str(inicio),
                        "data_hora_fim_atendimento": time_str(fim),
                        "observacoes_gerais": None,
                        "situacao": situacao,
                        "origem": origem,
                        "motivo_territorio": None,
                        "final_atendimento": None,
                    },
                }
            )
            total_written += 1
            count_agendamentos += 1

            if situacao == "FINALIZADO" and rng.random() < eval_prob:
                score = 5.0
                if inicio:
                    wait_m = (inicio.hour * 60 + inicio.minute) - (horario.hour * 60 + horario.minute)
                    score -= 0.035 * max(0, wait_m)
                if inicio and fim:
                    dur_m = (fim.hour * 60 + fim.minute) - (inicio.hour * 60 + inicio.minute)
                    score -= 0.020 * max(0, dur_m - servico.tempo_esperado_min)
                score += rng.gauss(0.0, 0.45)
                nota = clamp_int(score, 1, 5)

                write_obj(
                    {
                        "model": "avaliacao.avaliacao",
                        "pk": str(uuid.uuid4()),
                        "fields": {
                            "created_at": iso_z(created),
                            "updated_at": iso_z(created),
                            "is_active": True,
                            "agendamento": pk,
                            "nota": nota,
                            "comentario": None,
                        },
                    }
                )
                total_written += 1
                count_avaliacoes += 1

    close()

    print("OK")
    print(f"Arquivo: {out_path}")
    print(f"Total objetos: {total_written}")
    print(f"usuarios.usuario: {count_users}")
    print(f"cidadaos.cidadao: {count_cidadaos}")
    print(f"agendamentos.agendamento: {count_agendamentos}")
    print(f"avaliacao.avaliacao: {count_avaliacoes}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

