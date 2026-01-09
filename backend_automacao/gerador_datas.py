import json
import datetime
from datetime import date, timedelta

def calcular_pascoa(ano):
    """
    Calcula a data da Páscoa usando o algoritmo de Meeus/Jones/Butcher (Computus).
    Retorna um objeto datetime.date.
    """
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

def obter_nome_dia_semana(data_obj):
    dias = {
        0: "Segunda-feira", 1: "Terça-feira", 2: "Quarta-feira",
        3: "Quinta-feira", 4: "Sexta-feira", 5: "Sábado", 6: "Domingo"
    }
    return dias[data_obj.weekday()]

def gerar_calendario_liturgico_2026():
    ano = 2026
    eventos = []

    # --- 1. Datas Móveis (Baseadas na Páscoa) ---
    pascoa = calcular_pascoa(ano)
    
    # Definição das datas relativas
    datas_moveis = [
        {"delta": -46, "titulo": "Quarta-feira de Cinzas", "tipo": "Início da Quaresma", "cor": "Roxo", "tempo": "Quaresma"},
        {"delta": -7,  "titulo": "Domingo de Ramos", "tipo": "Solenidade", "cor": "Vermelho", "tempo": "Semana Santa"},
        {"delta": -3,  "titulo": "Quinta-feira Santa (Ceia do Senhor)", "tipo": "Tríduo Pascal", "cor": "Branco", "tempo": "Tríduo Pascal"},
        {"delta": -2,  "titulo": "Sexta-feira Santa (Paixão do Senhor)", "tipo": "Solenidade", "cor": "Vermelho", "tempo": "Tríduo Pascal"},
        {"delta": -1,  "titulo": "Sábado Santo (Vigília Pascal)", "tipo": "Solenidade", "cor": "Branco", "tempo": "Tríduo Pascal"},
        {"delta": 0,   "titulo": "Domingo de Páscoa", "tipo": "Solenidade", "cor": "Branco", "tempo": "Tempo Pascal"},
        {"delta": 49,  "titulo": "Pentecostes", "tipo": "Solenidade", "cor": "Vermelho", "tempo": "Tempo Pascal"},
        {"delta": 56,  "titulo": "Santíssima Trindade", "tipo": "Solenidade", "cor": "Branco", "tempo": "Tempo Comum"},
        {"delta": 60,  "titulo": "Corpus Christi", "tipo": "Solenidade", "cor": "Branco", "tempo": "Tempo Comum"},
        {"delta": 68,  "titulo": "Sagrado Coração de Jesus", "tipo": "Solenidade", "cor": "Branco", "tempo": "Tempo Comum"},
    ]

    # Lista auxiliar de datas ISO para evitar duplicatas ao gerar domingos comuns
    datas_ocupadas = set()

    # Adicionar Móveis à lista
    for item in datas_moveis:
        data_evento = pascoa + timedelta(days=item["delta"])
        eventos.append({
            "data_iso": data_evento.isoformat(),
            "dia_semana": obter_nome_dia_semana(data_evento),
            "titulo_liturgico": item["titulo"],
            "tipo": item["tipo"],
            "cor_sugerida": item["cor"],
            "tempo": item["tempo"]
        })
        datas_ocupadas.add(data_evento.isoformat())

    # --- 2. Datas Fixas Importantes ---
    # Nota: Se cair no domingo, a precedência litúrgica pode alterar, 
    # mas mantemos a data fixa para este script base.
    datas_fixas = [
        {"mes": 1, "dia": 1, "titulo": "Santa Maria, Mãe de Deus", "tipo": "Solenidade", "cor": "Branco", "tempo": "Tempo do Natal"},
        {"mes": 10, "dia": 12, "titulo": "Nossa Senhora Aparecida", "tipo": "Solenidade", "cor": "Dourado/Branco", "tempo": "Tempo Comum"},
        {"mes": 11, "dia": 2, "titulo": "Comemoração de Todos os Fiéis Defuntos", "tipo": "Memória", "cor": "Roxo/Preto", "tempo": "Tempo Comum"},
        {"mes": 12, "dia": 25, "titulo": "Natal do Senhor", "tipo": "Solenidade", "cor": "Branco", "tempo": "Tempo do Natal"},
    ]

    for item in datas_fixas:
        data_evento = date(ano, item["mes"], item["dia"])
        data_iso = data_evento.isoformat()
        
        # Simples verificação se já existe (prioridade para Móveis Solenes em caso de choque, mas aqui adicionamos se não houver)
        if data_iso not in datas_ocupadas:
            eventos.append({
                "data_iso": data_iso,
                "dia_semana": obter_nome_dia_semana(data_evento),
                "titulo_liturgico": item["titulo"],
                "tipo": item["tipo"],
                "cor_sugerida": item["cor"],
                "tempo": item["tempo"]
            })
            datas_ocupadas.add(data_iso)

    # --- 3. Lógica dos Tempos Litúrgicos e Domingos ---
    
    # Marcos temporais
    cinzas = pascoa + timedelta(days=-46)
    advento_inicio = date(ano, 11, 29) # Em 2026, 1º Dom Advento é 29/11 (4 domingos antes do Natal)
    natal = date(ano, 12, 25)
    batismo_senhor = date(ano, 1, 11) # Domingo após a Epifania (que no BR é movida pro domingo mais próximo, dia 04/01)

    data_atual = date(ano, 1, 1)
    fim_ano = date(ano, 12, 31)

    while data_atual <= fim_ano:
        iso = data_atual.isoformat()
        dia_sem = data_atual.weekday() # 6 = Domingo
        
        if dia_sem == 6 and iso not in datas_ocupadas:
            # Determinar Tempo Litúrgico e Título
            
            titulo = ""
            cor = "Verde"
            tempo = "Tempo Comum"
            tipo = "Domingo"

            # Tempo do Natal (até Batismo)
            if data_atual <= batismo_senhor:
                tempo = "Tempo do Natal"
                cor = "Branco"
                if data_atual == date(ano, 1, 4): # Epifania no Brasil (Domingo entre 2 e 8 jan)
                    titulo = "Epifania do Senhor"
                    tipo = "Solenidade"
                elif data_atual == batismo_senhor:
                    titulo = "Batismo do Senhor"
                    tipo = "Festa"
                else:
                    titulo = "Domingo do Tempo de Natal"

            # Tempo Comum (Parte 1)
            elif batismo_senhor < data_atual < cinzas:
                tempo = "Tempo Comum"
                # Calculo do número da semana
                # Semana 1 começa após batismo
                delta_semanas = ((data_atual - batismo_senhor).days // 7) + 1
                titulo = f"{delta_semanas}º Domingo do Tempo Comum"

            # Quaresma
            elif cinzas < data_atual < pascoa:
                tempo = "Quaresma"
                cor = "Roxo"
                # Contagem de domingos da Quaresma
                delta_semanas = ((data_atual - cinzas).days // 7)
                if delta_semanas == 4: # Laetare
                    cor = "Rosa/Roxo"
                titulo = f"{delta_semanas}º Domingo da Quaresma"

            # Tempo Pascal (já coberto pelos eventos móveis, mas preenchendo lacunas se houver)
            elif pascoa < data_atual < (pascoa + timedelta(days=49)):
                tempo = "Tempo Pascal"
                cor = "Branco"
                delta_semanas = ((data_atual - pascoa).days // 7) + 1
                titulo = f"{delta_semanas}º Domingo da Páscoa"
                if delta_semanas == 7: # Ascensão no Brasil
                   titulo = "Ascensão do Senhor"
                   tipo = "Solenidade"

            # Tempo Comum (Parte 2)
            elif (pascoa + timedelta(days=49)) < data_atual < advento_inicio:
                tempo = "Tempo Comum"
                cor = "Verde"
                
                # Solenidade de Cristo Rei é o último domingo antes do Advento
                if data_atual == advento_inicio - timedelta(days=7):
                    titulo = "Nosso Senhor Jesus Cristo, Rei do Universo"
                    cor = "Branco"
                    tipo = "Solenidade"
                else:
                    # Cálculo reverso do Tempo Comum para acertar a numeração final (34ª semana)
                    semanas_ate_advento = ((advento_inicio - data_atual).days // 7)
                    num_semana = 34 - semanas_ate_advento
                    titulo = f"{num_semana}º Domingo do Tempo Comum"

            # Advento
            elif data_atual >= advento_inicio:
                tempo = "Advento"
                cor = "Roxo"
                delta_semanas = ((data_atual - advento_inicio).days // 7) + 1
                if delta_semanas == 3: # Gaudete
                    cor = "Rosa/Roxo"
                titulo = f"{delta_semanas}º Domingo do Advento"

            # Adiciona o domingo calculado
            eventos.append({
                "data_iso": iso,
                "dia_semana": "Domingo",
                "titulo_liturgico": titulo,
                "tipo": tipo,
                "cor_sugerida": cor,
                "tempo": tempo
            })

        data_atual += timedelta(days=1)

    # Ordenar por data
    eventos.sort(key=lambda x: x["data_iso"])

    # Gerar JSON
    nome_arquivo = "calendario_2026.json"
    with open(nome_arquivo, "w", encoding="utf-8") as f:
        json.dump(eventos, f, ensure_ascii=False, indent=2)
    
    print(f"Arquivo '{nome_arquivo}' gerado com sucesso contendo {len(eventos)} eventos.")

if __name__ == "__main__":
    gerar_calendario_liturgico_2026()