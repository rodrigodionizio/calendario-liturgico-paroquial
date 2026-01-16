# =============================================================================
# SCRIPT: Liturgy Data Miner (Sacristia Digital v3.9)
# DESCRIÇÃO: Extração em massa da Liturgia via Portal Paulus.
# DATA ALVO: Janeiro 2026 até Janeiro 2027.
# REQUER: pip install requests beautifulsoup4
# =============================================================================

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import time

# =============================
# 1 - CONFIGURAÇÕES INICIAIS
# =============================
BASE_URL = "https://www.paulus.com.br/portal/liturgia-diaria/"
DATA_INICIO = datetime.now()
DATA_FIM = datetime(2027, 1, 31)

# Template HTML para o Preview
HTML_TEMPLATE_START = """
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Preview de Ingestão Litúrgica</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f9; padding: 40px; color: #333; }
        .card { background: white; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 6px solid #a41d31; }
        .field { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
        .field-name { font-weight: bold; color: #a41d31; font-size: 0.75rem; text-transform: uppercase; display: block; letter-spacing: 1px; }
        .field-value { font-size: 0.95rem; line-height: 1.6; display: block; margin-top: 5px; color: #444; }
        .date-header { background: #a41d31; color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; font-size: 1.2rem; }
        h1 { color: #a41d31; border-bottom: 3px solid #fbb558; padding-bottom: 10px; }
    </style>
</head>
<body>
<h1>Relatório de Mineração Litúrgica (Destino: liturgia_palavra)</h1>
<p>Este relatório apresenta os campos mapeados conforme o schema do banco de dados.</p>
"""

def extrair_liturgia(data_alvo):
    """
    Realiza o Webscraping de uma data específica na Paulus.
    """
    params = {
        "dia": data_alvo.day,
        "mes": data_alvo.month,
        "ano": data_alvo.year
    }
    
    try:
        # User-Agent para evitar bloqueio
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(BASE_URL, params=params, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        container = soup.find('div', class_='liturgia-diaria')
        
        if not container:
            return None

        # Função auxiliar para extrair texto por cabeçalho
        def get_content(header_name):
            # Procura o H2 que contém o nome da leitura
            h2 = container.find('h2', string=lambda t: t and header_name in t.upper())
            if h2:
                # O texto está na div .corpo que vem logo após o h2
                corpo = h2.find_next_sibling('div', class_='corpo')
                return h2.get_text(strip=True), corpo.get_text(strip=True) if corpo else ""
            return "", ""

        # Mapeamento exato para as colunas da sua tabela 'liturgia_palavra'
        p1_ref, p1_txt = get_content("1ª LEITURA")
        salmo_ref, salmo_txt = get_content("SALMO RESPONSORIAL")
        ev_ref, ev_txt = get_content("EVANGELHO")
        
        # O refrão do salmo na Paulus tem uma classe específica
        refrao_tag = container.find('div', class_='refrao')
        salmo_refrao = refrao_tag.get_text(strip=True) if refrao_tag else ""

        return {
            "data": data_alvo.strftime('%Y-%m-%d'),
            "primeira_leitura_ref": p1_ref,
            "primeira_leitura_texto": p1_txt,
            "salmo_ref": salmo_ref,
            "salmo_refrao": salmo_refrao,
            "salmo_texto": salmo_txt,
            "evangelho_ref": ev_ref,
            "evangelho_texto": ev_txt
        }
    except Exception as e:
        print(f"\n[ERRO] {data_alvo.date()}: {e}")
        return None

# =============================
# 2 - EXECUÇÃO DO LOOP MESTRE
# =============================
current_date = DATA_INICIO
dados_totais = []

print(f"🚀 Sacristia Digital: Iniciando mineração de dados...")
print(f"Período: {DATA_INICIO.date()} até {DATA_FIM.date()}")

# Abre o arquivo para escrita
with open("preview_liturgia.html", "w", encoding="utf-8") as f:
    f.write(HTML_TEMPLATE_START)
    
    while current_date <= DATA_FIM:
        # Log de progresso no terminal
        print(f"🛰️ Capturando: {current_date.strftime('%d/%m/%Y')}...", end="\r")
        
        item = extrair_liturgia(current_date)
        
        if item:
            # Injeta o bloco visual no HTML de Preview
            f.write(f'<div class="card">')
            f.write(f'<div class="date-header">TABELA: liturgia_palavra | DATA: {item["data"]}</div>')
            
            for campo, valor in item.items():
                if campo != "data":
                    # Limita a exibição no preview para não ficar gigante, mas guarda tudo na memória
                    resumo = (valor[:200] + '...') if len(valor) > 200 else valor
                    f.write(f'<div class="field">')
                    f.write(f'<span class="field-name">Coluna: {campo}</span>')
                    f.write(f'<span class="field-value">{resumo}</span>')
                    f.write(f'</div>')
            
            f.write(f'</div>')
            dados_totais.append(item)
            
        # Incrementa um dia
        current_date += timedelta(days=1)
        # Delay de cortesia para o servidor da Paulus não nos bloquear
        time.sleep(0.4)

    f.write("</body></html>")

print(f"\n\n✅ PROCESSO CONCLUÍDO!")
print(f"📊 Total de dias minerados: {len(dados_totais)}")
print(f"📄 Relatório gerado: preview_liturgia.html")
print(f"💡 Próximo passo: Importar {len(dados_totais)} registros para o Supabase.")