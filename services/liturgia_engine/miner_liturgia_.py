# =============================================================================
# SCRIPT: Vatican Liturgy Miner (Sacristia Digital v5.0 - Enhanced)
# FONTE: Vatican News (pt/palavra-do-dia)
# DESCRIÇÃO: Captura automatizada de subsídios bíblicos
# =============================================================================

import os
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from supabase import create_client
import time
import re
from dotenv import load_dotenv

load_dotenv()

URL_SUPABASE = os.environ.get("SUPABASE_URL")
KEY_SUPABASE = os.environ.get("SUPABASE_KEY")

if not URL_SUPABASE or not KEY_SUPABASE:
    raise ValueError("❌ Variáveis SUPABASE_URL e SUPABASE_KEY não configuradas!")

supabase = create_client(URL_SUPABASE, KEY_SUPABASE)

def extrair_referencia_biblica(texto):
    """Extrai referências bíblicas (ex: Gn 1,1-5)"""
    patterns = [
        r'([1-3]?\s*[A-Za-zÃ-ú]+\.?\s+\d+[,:\s]\d+(?:-\d+)?(?:\.\d+)?)',
        r'([A-Za-zÃ-ú]+\s+\d+\s*\(\d+\)[,:\s]\d+(?:-\d+)?)',
    ]
    for pattern in patterns:
        match = re.search(pattern, texto)
        if match:
            return match.group(1).strip()
    return ""

def minerar_data(data_alvo):
    """Extrai leituras do Vatican News"""
    url = f"https://www.vaticannews.va/pt/palavra-do-dia/{data_alvo.strftime('%Y/%m/%d')}.html"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
    }
    
    try:
        print(f"   🔍 Acessando: {url}")
        response = requests.get(url, headers=headers, timeout=20)
        
        if response.status_code == 404:
            print(f"   ⚠️  Página não encontrada")
            return None
            
        if response.status_code != 200:
            print(f"   ❌ Erro HTTP {response.status_code}")
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        dados = {
            "data": data_alvo.strftime('%Y-%m-%d'),
            "primeira_leitura_ref": "", "primeira_leitura_texto": "",
            "salmo_ref": "", "salmo_refrao": "", "salmo_texto": "",
            "segunda_leitura_ref": "", "segunda_leitura_texto": "",
            "evangelho_ref": "", "evangelho_texto": ""
        }

        corpo = soup.find('div', class_='section__content') or soup.find('article')
        if not corpo:
            print("   ⚠️  Estrutura HTML não reconhecida")
            return None

        texto_completo = corpo.get_text(separator="\n", strip=True)
        linhas = [l.strip() for l in texto_completo.split("\n") if l.strip()]
        
        bloco_atual = None
        texto_temporario = []
        
        for linha in linhas:
            linha_lower = linha.lower()
            
            if "primeira leitura" in linha_lower or "1ª leitura" in linha_lower:
                if texto_temporario and bloco_atual:
                    dados[f"{bloco_atual}_texto"] = "\n".join(texto_temporario)
                bloco_atual = "primeira_leitura"
                dados["primeira_leitura_ref"] = extrair_referencia_biblica(linha)
                texto_temporario = []
                
            elif "salmo" in linha_lower and "responsorial" in linha_lower:
                if texto_temporario and bloco_atual:
                    dados[f"{bloco_atual}_texto"] = "\n".join(texto_temporario)
                bloco_atual = "salmo"
                dados["salmo_ref"] = extrair_referencia_biblica(linha)
                texto_temporario = []
                
            elif "segunda leitura" in linha_lower or "2ª leitura" in linha_lower:
                if texto_temporario and bloco_atual:
                    dados[f"{bloco_atual}_texto"] = "\n".join(texto_temporario)
                bloco_atual = "segunda_leitura"
                dados["segunda_leitura_ref"] = extrair_referencia_biblica(linha)
                texto_temporario = []
                
            elif "evangelho" in linha_lower:
                if texto_temporario and bloco_atual:
                    dados[f"{bloco_atual}_texto"] = "\n".join(texto_temporario)
                bloco_atual = "evangelho"
                dados["evangelho_ref"] = extrair_referencia_biblica(linha)
                texto_temporario = []
                
            elif bloco_atual == "salmo" and ("refrão" in linha_lower or "r." in linha_lower):
                dados["salmo_refrao"] = linha.replace("Refrão:", "").replace("R.", "").strip()
                
            elif bloco_atual and len(linha) > 20:
                texto_temporario.append(linha)
        
        if texto_temporario and bloco_atual:
            dados[f"{bloco_atual}_texto"] = "\n".join(texto_temporario)
        
        if not dados["evangelho_ref"] or not dados["evangelho_texto"]:
            print(f"   ⚠️  Dados incompletos")
            return None
            
        print(f"   ✅ Dados extraídos!")
        return dados
        
    except Exception as e:
        print(f"   ❌ Erro: {str(e)}")
        return None

def workflow_mensal():
    """Workflow principal de mineração"""
    hoje = datetime.now()
    primeiro_dia_mes = hoje.replace(day=1)
    
    print(f"\n{'='*60}")
    print(f"🔥 MINERAÇÃO LITÚRGICA - {hoje.strftime('%d/%m/%Y %H:%M')}")
    print(f"{'='*60}\n")
    
    lista_datas = []
    dias_no_mes = (primeiro_dia_mes.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    lista_datas.extend([primeiro_dia_mes + timedelta(days=x) for x in range(dias_no_mes.day)])
    
    if hoje.day >= 20:
        proximo_mes = (primeiro_dia_mes + timedelta(days=32)).replace(day=1)
        dias_proximo = (proximo_mes.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        lista_datas.extend([proximo_mes + timedelta(days=x) for x in range(dias_proximo.day)])
        print(f"📅 Incluindo {proximo_mes.strftime('%B/%Y')}\n")
    
    sucesso = pulos = erros = 0
    
    for d in lista_datas:
        print(f"📆 {d.strftime('%d/%m/%Y (%A)')}")
        resultado = minerar_data(d)
        
        if resultado:
            try:
                supabase.table("liturgia_palavra").upsert(resultado, on_conflict="data").execute()
                sucesso += 1
                print(f"   💾 Salvo!\n")
            except Exception as e:
                erros += 1
                print(f"   ❌ Erro ao salvar: {str(e)}\n")
        else:
            pulos += 1
            print()
        
        time.sleep(2)
    
    print(f"\n{'='*60}")
    print(f"✅ Sucesso: {sucesso} | ⚠️ Pulados: {pulos} | ❌ Erros: {erros}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    try:
        workflow_mensal()
    except KeyboardInterrupt:
        print("\n⚠️  Interrompido.")
    except Exception as e:
        print(f"\n❌ ERRO: {str(e)}")