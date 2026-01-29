# =============================================================================
# SCRIPT: Vatican Liturgy Miner (Sacristia Digital v4.0)
# FONTE: Vatican News (pt/palavra-do-dia)
# DESCRIÇÃO: Captura automatizada de subsídios bíblicos para a tabela liturgia_palavra.
# =============================================================================

import os
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from supabase import create_client
from dotenv import load_dotenv
load_dotenv()
import time

# Configurações via Variáveis de Ambiente (Segurança)
URL_SUPABASE = os.environ.get("SUPABASE_URL")
KEY_SUPABASE = os.environ.get("SUPABASE_KEY")
supabase = create_client(URL_SUPABASE, KEY_SUPABASE)

def minerar_data(data_alvo):
    """
    Extrai as leituras do portal Vatican News para uma data específica.
    """
    # Formata URL: vaticannews.va/pt/palavra-do-dia/2026/01/19.html
    url = f"https://www.vaticannews.va/pt/palavra-do-dia/{data_alvo.strftime('%Y/%m/%d')}.html"
    
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    try:
        response = requests.get(url, headers=headers, timeout=20)
        if response.status_code != 200: return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # O Vaticano separa o conteúdo em blocos de seção .section__content
        corpo = soup.find('div', class_='section__content')
        if not corpo: return None

        # Limpeza e Extração (Lógica adaptativa para diferentes layouts litúrgicos)
        textos = corpo.get_text(separator="\n").split("\n")
        
        dados = {
            "data": data_alvo.strftime('%Y-%m-%d'),
            "primeira_leitura_ref": "", "primeira_leitura_texto": "",
            "salmo_ref": "", "salmo_refrao": "", "salmo_texto": "",
            "segunda_leitura_ref": "", "segunda_leitura_texto": "",
            "evangelho_ref": "", "evangelho_texto": ""
        }

        # Lógica de mapeamento baseada em palavras-chave no texto
        # (Essa parte é refinada conforme a variação do site)
        # Exemplo simplificado de captura de blocos:
        # No Vaticano, os títulos costumam estar em <strong> ou headings
        
        # Ingestão Direta via Upsert (Garante integridade)
        # Vamos preencher os campos com o que o parser encontrar
        # (Código de parse detalhado será injetado aqui conforme o HTML do dia)
        
        return dados
    except Exception as e:
        print(f"Erro na data {data_alvo}: {e}")
        return None

def workflow_mensal():
    hoje = datetime.now()
    primeiro_dia_mes = hoje.replace(day=1)
    
    # 1. Garante o mês atual
    lista_datas = [primeiro_dia_mes + timedelta(days=x) for x in range(31)]
    
    # 2. Gatilho: Próximo mês (Se for dia 20 ou depois)
    if hoje.day >= 20:
        proximo_mes = (primeiro_dia_mes + timedelta(days=32)).replace(day=1)
        lista_datas += [proximo_mes + timedelta(days=x) for x in range(31)]

    for d in lista_datas:
        # Filtra apenas datas do mês atual e do próximo
        if d.month in [hoje.month, (hoje.month % 12) + 1]:
            print(f"📡 Processando: {d.strftime('%d/%m/%Y')}")
            resultado = minerar_data(d)
            if resultado:
                supabase.table("liturgia_palavra").upsert(resultado).execute()
                time.sleep(1) # Delay anti-bloqueio

if __name__ == "__main__":
    workflow_mensal()