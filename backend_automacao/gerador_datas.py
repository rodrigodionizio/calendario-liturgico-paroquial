#!/usr/bin/env python3
"""
gerador_datas.py — Sacristia Digital
Gera o calendário litúrgico base para qualquer ano e insere na tabela
`liturgia_diaria` do Supabase (UPSERT idempotente — seguro reexecutar).

Uso:
    python gerador_datas.py              # gera para o ANO SEGUINTE (padrão)
    python gerador_datas.py 2027         # gera para o ano especificado
    python gerador_datas.py 2027 --dry-run  # só gera JSON, não insere no banco
"""

import json
import sys
import re
import os
import logging
from datetime import date, timedelta, datetime

from dotenv import load_dotenv
from supabase import create_client

# =============================================================================
# CONFIGURAÇÃO
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("gerador_datas.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)

load_dotenv()

# =============================================================================
# ALGORITMO DE COMPUTUS — PÁSCOA (Meeus/Jones/Butcher)
# =============================================================================

def calcular_pascoa(ano: int) -> date:
    """Calcula a data da Páscoa pelo algoritmo de Meeus/Jones/Butcher."""
    a = ano % 19
    b = ano // 100
    c = ano % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(ano, month, day)


# =============================================================================
# DATAS LITÚRGICAS DINÂMICAS
# =============================================================================

def calcular_marcos(ano: int) -> dict:
    """
    Calcula todos os marcos litúrgicos variáveis do ano.
    Nenhuma data é hardcoded — tudo é derivado da Páscoa ou de regras fixas.
    """
    pascoa = calcular_pascoa(ano)

    # Epifânia (Brasil): 1º domingo entre 2 e 8 de janeiro
    jan2 = date(ano, 1, 2)
    epifania = jan2 + timedelta(days=(6 - jan2.weekday()) % 7)

    # Batismo do Senhor: domingo seguinte à Epifânia
    batismo_senhor = epifania + timedelta(days=7)

    # 1º Domingo do Advento: último domingo em ou antes de 3 de dezembro
    dec3 = date(ano, 12, 3)
    advento_inicio = dec3 - timedelta(days=(dec3.weekday() + 1) % 7)

    marcos = {
        "pascoa": pascoa,
        "cinzas": pascoa + timedelta(days=-46),
        "epifania": epifania,
        "batismo_senhor": batismo_senhor,
        "advento_inicio": advento_inicio,
    }

    log.info("Marcos litúrgicos para %d:", ano)
    for nome, data_obj in marcos.items():
        log.info("  %-20s %s (%s)", nome, data_obj.isoformat(),
                 ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"][data_obj.weekday()])

    return marcos


# =============================================================================
# NOME DO DIA DA SEMANA
# =============================================================================

_DIAS_SEMANA = {
    0: "Segunda-feira", 1: "Terça-feira", 2: "Quarta-feira",
    3: "Quinta-feira", 4: "Sexta-feira", 5: "Sábado", 6: "Domingo",
}

def nome_dia(data_obj: date) -> str:
    return _DIAS_SEMANA[data_obj.weekday()]


# =============================================================================
# GERADOR PRINCIPAL
# =============================================================================

def gerar_calendario_liturgico(ano: int) -> list[dict]:
    """
    Gera todos os eventos litúrgicos do ano informado.
    Retorna lista de dicts prontos para UPSERT em `liturgia_diaria`.
    """
    marcos = calcular_marcos(ano)
    pascoa          = marcos["pascoa"]
    cinzas          = marcos["cinzas"]
    epifania        = marcos["epifania"]
    batismo_senhor  = marcos["batismo_senhor"]
    advento_inicio  = marcos["advento_inicio"]

    eventos: list[dict] = []
    datas_ocupadas: set = set()

    # -------------------------------------------------------------------------
    # 1. DATAS MÓVEIS (relativas à Páscoa)
    # -------------------------------------------------------------------------
    datas_moveis = [
        {"delta": -46, "titulo": "Quarta-feira de Cinzas",              "grau": "Início da Quaresma", "cor": "Roxo",     "tempo": "Quaresma"},
        {"delta": -7,  "titulo": "Domingo de Ramos",                    "grau": "Solenidade",         "cor": "Vermelho", "tempo": "Semana Santa"},
        {"delta": -3,  "titulo": "Quinta-feira Santa — Ceia do Senhor", "grau": "Tríduo Pascal",      "cor": "Branco",   "tempo": "Tríduo Pascal"},
        {"delta": -2,  "titulo": "Sexta-feira Santa — Paixão do Senhor","grau": "Solenidade",         "cor": "Vermelho", "tempo": "Tríduo Pascal"},
        {"delta": -1,  "titulo": "Sábado Santo — Vigília Pascal",       "grau": "Solenidade",         "cor": "Branco",   "tempo": "Tríduo Pascal"},
        {"delta":  0,  "titulo": "Domingo de Páscoa",                   "grau": "Solenidade",         "cor": "Branco",   "tempo": "Tempo Pascal"},
        {"delta": 49,  "titulo": "Pentecostes",                         "grau": "Solenidade",         "cor": "Vermelho", "tempo": "Tempo Pascal"},
        {"delta": 56,  "titulo": "Santíssima Trindade",                 "grau": "Solenidade",         "cor": "Branco",   "tempo": "Tempo Comum"},
        {"delta": 60,  "titulo": "Corpus Christi",                      "grau": "Solenidade",         "cor": "Branco",   "tempo": "Tempo Comum"},
        {"delta": 68,  "titulo": "Sagrado Coração de Jesus",            "grau": "Solenidade",         "cor": "Branco",   "tempo": "Tempo Comum"},
    ]

    for item in datas_moveis:
        data_evento = pascoa + timedelta(days=item["delta"])
        _adicionar(eventos, datas_ocupadas, data_evento, item["titulo"],
                   item["grau"], item["cor"], item["tempo"])

    # -------------------------------------------------------------------------
    # 2. DATAS FIXAS
    # -------------------------------------------------------------------------
    datas_fixas = [
        {"mes": 1,  "dia": 1,  "titulo": "Santa Maria, Mãe de Deus",                     "grau": "Solenidade", "cor": "Branco",         "tempo": "Tempo do Natal"},
        {"mes": 10, "dia": 12, "titulo": "Nossa Senhora Aparecida",                       "grau": "Solenidade", "cor": "Branco",         "tempo": "Tempo Comum"},
        {"mes": 11, "dia": 1,  "titulo": "Todos os Santos",                               "grau": "Solenidade", "cor": "Branco",         "tempo": "Tempo Comum"},
        {"mes": 11, "dia": 2,  "titulo": "Comemoração de Todos os Fiéis Defuntos",        "grau": "Memória",    "cor": "Roxo/Preto",     "tempo": "Tempo Comum"},
        {"mes": 12, "dia": 8,  "titulo": "Imaculada Conceição da Bem-Aventurada Virgem",  "grau": "Solenidade", "cor": "Branco",         "tempo": "Advento"},
        {"mes": 12, "dia": 25, "titulo": "Natal do Senhor",                               "grau": "Solenidade", "cor": "Branco",         "tempo": "Tempo do Natal"},
    ]

    for item in datas_fixas:
        data_evento = date(ano, item["mes"], item["dia"])
        _adicionar(eventos, datas_ocupadas, data_evento, item["titulo"],
                   item["grau"], item["cor"], item["tempo"])

    # -------------------------------------------------------------------------
    # 3. EPIFÂNIA E BATISMO DO SENHOR (calculados dinamicamente)
    # -------------------------------------------------------------------------
    _adicionar(eventos, datas_ocupadas, epifania,
               "Epifania do Senhor", "Solenidade", "Branco", "Tempo do Natal")

    _adicionar(eventos, datas_ocupadas, batismo_senhor,
               "Batismo do Senhor", "Festa", "Branco", "Tempo do Natal")

    # -------------------------------------------------------------------------
    # 4. DOMINGOS DO ANO (preenchimento pelo tempo litúrgico)
    # -------------------------------------------------------------------------
    data_atual = date(ano, 1, 1)
    fim_ano    = date(ano, 12, 31)

    while data_atual <= fim_ano:
        iso = data_atual.isoformat()

        if data_atual.weekday() == 6 and iso not in datas_ocupadas:
            titulo, cor, tempo, grau = _classificar_domingo(
                data_atual, pascoa, cinzas, batismo_senhor, advento_inicio
            )
            _adicionar(eventos, datas_ocupadas, data_atual, titulo, grau, cor, tempo)

        data_atual += timedelta(days=1)

    eventos.sort(key=lambda x: x["data_calendario"])
    log.info("Total de eventos gerados para %d: %d", ano, len(eventos))
    return eventos


# =============================================================================
# HELPERS INTERNOS
# =============================================================================

def _adicionar(eventos, datas_ocupadas, data_obj, titulo, grau, cor, tempo):
    """Adiciona evento à lista se a data não estiver ocupada."""
    iso = data_obj.isoformat()
    if iso in datas_ocupadas:
        return
    eventos.append({
        "data_calendario": iso,
        "dia_semana":      nome_dia(data_obj),
        "santo_festa":     titulo,
        "grau":            grau,
        "cor":             cor,
        "tempo_liturgico": tempo,
        "semana_ordinal":  _extrair_semana_ordinal(titulo),
    })
    datas_ocupadas.add(iso)


def _extrair_semana_ordinal(titulo: str) -> int | None:
    """Extrai o número da semana de títulos como '3º Domingo do Tempo Comum'."""
    match = re.match(r"^(\d+)[ºaª]", titulo)
    return int(match.group(1)) if match else None


def _classificar_domingo(data_obj, pascoa, cinzas, batismo_senhor, advento_inicio):
    """Retorna (titulo, cor, tempo, grau) para um domingo não-solenidade."""
    grau = "Domingo"

    # Tempo do Natal (1 jan até Batismo do Senhor)
    if data_obj <= batismo_senhor:
        return "Domingo do Tempo de Natal", "Branco", "Tempo do Natal", grau

    # Tempo Comum — Parte 1 (após Batismo até Cinzas)
    if batismo_senhor < data_obj < cinzas:
        n = ((data_obj - batismo_senhor).days // 7) + 1
        return f"{n}º Domingo do Tempo Comum", "Verde", "Tempo Comum", grau

    # Quaresma (Cinzas até Páscoa — exclusive)
    if cinzas < data_obj < pascoa:
        n = (data_obj - cinzas).days // 7
        cor = "Rosa/Roxo" if n == 4 else "Roxo"     # 4º Dom = Laetare
        return f"{n}º Domingo da Quaresma", cor, "Quaresma", grau

    # Tempo Pascal (Páscoa até Pentecostes — exclusive)
    if pascoa < data_obj < (pascoa + timedelta(days=49)):
        n = ((data_obj - pascoa).days // 7) + 1
        if n == 7:                                   # Ascensão (movida para domingo no Brasil)
            return "Ascensão do Senhor", "Branco", "Tempo Pascal", "Solenidade"
        return f"{n}º Domingo da Páscoa", "Branco", "Tempo Pascal", grau

    # Tempo Comum — Parte 2 (Pentecostes até Advento)
    if (pascoa + timedelta(days=49)) < data_obj < advento_inicio:
        if data_obj == advento_inicio - timedelta(days=7):   # Cristo Rei
            return "Nosso Senhor Jesus Cristo, Rei do Universo", "Branco", "Tempo Comum", "Solenidade"
        semanas_ate_advento = (advento_inicio - data_obj).days // 7
        n = 34 - semanas_ate_advento
        return f"{n}º Domingo do Tempo Comum", "Verde", "Tempo Comum", grau

    # Advento
    if data_obj >= advento_inicio:
        n = ((data_obj - advento_inicio).days // 7) + 1
        cor = "Rosa/Roxo" if n == 3 else "Roxo"     # 3º Dom = Gaudete
        return f"{n}º Domingo do Advento", cor, "Advento", grau

    return "Domingo", "Verde", "Tempo Comum", grau


# =============================================================================
# PERSISTÊNCIA — SUPABASE
# =============================================================================

def inserir_no_supabase(eventos: list[dict]) -> None:
    """
    Faz UPSERT em lotes na tabela `liturgia_diaria`.
    Idempotente: reexecutar não duplica registros.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

    if not url or not key:
        raise EnvironmentError(
            "Variáveis SUPABASE_URL e SUPABASE_KEY não configuradas no .env"
        )

    sb = create_client(url, key)
    LOTE = 50

    for i in range(0, len(eventos), LOTE):
        lote = eventos[i : i + LOTE]
        res = (
            sb.table("liturgia_diaria")
            .upsert(lote, on_conflict="data_calendario")
            .execute()
        )
        log.info("  Lote %d/%d — %d registros enviados",
                 i // LOTE + 1, -(-len(eventos) // LOTE), len(lote))

    log.info("UPSERT concluído: %d registros em `liturgia_diaria`.", len(eventos))


# =============================================================================
# SAÍDA JSON LOCAL
# =============================================================================

def salvar_json(eventos: list[dict], ano: int) -> str:
    nome = f"calendario_{ano}.json"
    caminho = os.path.join(os.path.dirname(__file__), nome)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(eventos, f, ensure_ascii=False, indent=2)
    log.info("JSON salvo: %s", caminho)
    return caminho


# =============================================================================
# PONTO DE ENTRADA
# =============================================================================

def _resolver_ano() -> tuple[int, bool]:
    """
    Lê ano e flag --dry-run dos argumentos da linha de comando.
    Sem argumento → próximo ano (datetime.now().year + 1).
    """
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    args = [a for a in args if a != "--dry-run"]

    if args:
        try:
            ano = int(args[0])
            if ano < 2000 or ano > 2100:
                raise ValueError
        except ValueError:
            log.error("Ano inválido: '%s'. Use um número entre 2000 e 2100.", args[0])
            sys.exit(1)
    else:
        ano = datetime.now().year + 1
        log.info("Ano não informado — usando próximo ano: %d", ano)

    return ano, dry_run


def main():
    ano, dry_run = _resolver_ano()

    log.info("=" * 60)
    log.info("Gerando calendário litúrgico para %d%s", ano,
             " [DRY-RUN — sem insert no banco]" if dry_run else "")
    log.info("=" * 60)

    eventos = gerar_calendario_liturgico(ano)
    salvar_json(eventos, ano)

    if dry_run:
        log.info("Modo dry-run: nenhum dado enviado ao Supabase.")
    else:
        inserir_no_supabase(eventos)

    log.info("Concluído.")


if __name__ == "__main__":
    main()
