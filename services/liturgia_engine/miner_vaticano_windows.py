# =============================================================================
# SCRIPT: Vatican Liturgy Miner (Sacristia Digital v8.0 - Windows Compatible)
# FONTE: Vatican News (pt/palavra-do-dia)
# AUTOR: Sistema Sacristia Digital
# =============================================================================

import os
import sys
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from supabase import create_client
import time
import re
from dotenv import load_dotenv
import logging

# =============================================================================
# FIX: Windows Console Encoding
# =============================================================================
if sys.platform == "win32":
    # Force UTF-8 encoding on Windows
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    # Configuração para Windows PowerShell/CMD
    os.system('chcp 65001 > nul')

# Configuração de Logging (SEM EMOJIS para Windows)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('miner_liturgia.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

load_dotenv()

URL_SUPABASE = os.environ.get("SUPABASE_URL")
KEY_SUPABASE = os.environ.get("SUPABASE_KEY")

if not URL_SUPABASE or not KEY_SUPABASE:
    raise ValueError("[ERRO] Variaveis SUPABASE_URL e SUPABASE_KEY nao configuradas!")

supabase = create_client(URL_SUPABASE, KEY_SUPABASE)

# =============================================================================
# REGEX E UTILITÁRIOS
# =============================================================================

def extrair_referencia_biblica(texto):
    """
    Extrai referências bíblicas de diferentes formatos:
    - Gn 1,1-5
    - 1Cor 12,4-11
    - Sl 22 (23), 1-6
    - Mt 5,1-12a
    """
    patterns = [
        r'([1-3]?\s*[A-Za-zÀ-ú]+\.?\s+\d+[,:]\s*\d+(?:-\d+)?(?:[a-z])?)',
        r'([A-Za-zÀ-ú]+\s+\d+\s*\(\d+\)[,:]\s*\d+(?:-\d+)?)',
        r'([A-Za-zÀ-ú]+\s+\d+[,:]\s*\d+(?:-\d+)?)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, texto)
        if match:
            return match.group(1).strip()
    
    return ""

def limpar_texto(texto):
    """Remove espaços extras e normaliza texto"""
    texto = re.sub(r'\s+', ' ', texto)
    texto = texto.replace('\xa0', ' ')
    return texto.strip()

def identificar_tipo_leitura(linha):
    """Identifica qual tipo de leitura baseado em palavras-chave"""
    linha_lower = linha.lower()
    
    if any(x in linha_lower for x in ["primeira leitura", "1ª leitura", "1.ª leitura"]):
        return "primeira_leitura"
    elif any(x in linha_lower for x in ["segunda leitura", "2ª leitura", "2.ª leitura"]):
        return "segunda_leitura"
    elif any(x in linha_lower for x in ["salmo responsorial", "salmo", "sl "]):
        return "salmo"
    elif "evangelho" in linha_lower:
        return "evangelho"
    elif any(x in linha_lower for x in ["refrão", "r.", "resp."]):
        return "refrao"
    
    return None

# =============================================================================
# MINERADOR PRINCIPAL
# =============================================================================

def minerar_data(data_alvo):
    """
    Extrai leituras litúrgicas do Vatican News para uma data específica.
    
    Estratégia:
    1. Busca pelo container principal (<article>, <main>, ou div.section__content)
    2. Extrai todos os parágrafos e títulos
    3. Identifica blocos por palavras-chave
    4. Captura texto até o próximo marcador
    """
    url = f"https://www.vaticannews.va/pt/palavra-do-dia/{data_alvo.strftime('%Y/%m/%d')}.html"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    try:
        logging.info(f"[WEB] Acessando: {url}")
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 404:
            logging.warning(f"[404] Pagina nao encontrada")
            return None
            
        if response.status_code != 200:
            logging.error(f"[HTTP] Erro {response.status_code}")
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Estrutura de dados
        dados = {
            "data": data_alvo.strftime('%Y-%m-%d'),
            "primeira_leitura_ref": "",
            "primeira_leitura_texto": "",
            "salmo_ref": "",
            "salmo_refrao": "",
            "salmo_texto": "",
            "segunda_leitura_ref": "",
            "segunda_leitura_texto": "",
            "evangelho_ref": "",
            "evangelho_texto": ""
        }

        # Tenta múltiplos seletores (robustez)
        containers = [
            soup.find('article'),
            soup.find('main'),
            soup.find('div', class_='section__content'),
            soup.find('div', class_='content-body'),
            soup.find('div', {'id': 'main-content'})
        ]
        
        corpo = next((c for c in containers if c), None)
        
        if not corpo:
            logging.warning("[HTML] Nenhum container de conteudo encontrado")
            return None

        # Extração de elementos
        elementos = []
        for elem in corpo.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'strong', 'div']):
            texto = limpar_texto(elem.get_text())
            if texto and len(texto) > 3:
                elementos.append(texto)
        
        if not elementos:
            logging.warning("[PARSE] Nenhum elemento textual extraido")
            
            # DEBUG: Salva HTML para análise
            debug_path = f"debug_{data_alvo.strftime('%Y%m%d')}.html"
            with open(debug_path, 'w', encoding='utf-8') as f:
                f.write(response.text)
            logging.info(f"[DEBUG] HTML salvo em: {debug_path}")
            
            return None
        
        # Processamento sequencial
        bloco_atual = None
        buffer_texto = []
        
        for idx, texto in enumerate(elementos):
            tipo = identificar_tipo_leitura(texto)
            
            if tipo == "refrao" and bloco_atual == "salmo":
                # Captura refrão do salmo
                dados["salmo_refrao"] = texto.replace("Refrão:", "").replace("R.", "").replace("Resp.", "").strip()
                continue
            
            if tipo in ["primeira_leitura", "segunda_leitura", "salmo", "evangelho"]:
                # Salva bloco anterior
                if bloco_atual and buffer_texto:
                    dados[f"{bloco_atual}_texto"] = "\n".join(buffer_texto)
                
                # Inicia novo bloco
                bloco_atual = tipo
                buffer_texto = []
                
                # Extrai referência
                ref = extrair_referencia_biblica(texto)
                dados[f"{bloco_atual}_ref"] = ref
                
                logging.info(f"   [BLOCK] {tipo.replace('_', ' ').title()}: {ref}")
                continue
            
            # Acumula texto do bloco atual
            if bloco_atual:
                # Ignora linhas muito curtas ou de navegação
                if len(texto) > 30 and not any(x in texto.lower() for x in ["compartilhar", "imprimir", "palavra do papa", "mais lidas"]):
                    buffer_texto.append(texto)
        
        # Salva último bloco
        if bloco_atual and buffer_texto:
            dados[f"{bloco_atual}_texto"] = "\n".join(buffer_texto)
        
        # Validação de qualidade
        campos_obrigatorios = ["evangelho_ref", "evangelho_texto"]
        if not all(dados[campo] for campo in campos_obrigatorios):
            logging.warning(f"[VALID] Dados incompletos (falta Evangelho)")
            
            # DEBUG: Mostra o que foi extraído
            logging.info(f"[DEBUG] Blocos encontrados:")
            for campo, valor in dados.items():
                if valor and not campo.endswith('_texto'):
                    logging.info(f"  - {campo}: {valor[:50]}")
            
            return None
        
        # Estatísticas
        total_chars = sum(len(dados[k]) for k in dados if k.endswith('_texto'))
        logging.info(f"   [OK] Extraido {total_chars} caracteres de texto liturgico")
        
        return dados
        
    except requests.exceptions.Timeout:
        logging.error(f"   [TIMEOUT] Ao acessar {url}")
        return None
    except requests.exceptions.RequestException as e:
        logging.error(f"   [REDE] Erro de rede: {str(e)}")
        return None
    except Exception as e:
        logging.error(f"   [ERRO] Erro inesperado: {str(e)}", exc_info=True)
        return None

# =============================================================================
# WORKFLOW DE MINERAÇÃO
# =============================================================================

def workflow_mensal(modo="atual"):
    """
    Workflow de mineração com diferentes modos:
    - 'atual': Mês atual
    - 'proximo': Mês atual + próximo (se dia >= 20)
    - 'range': Período customizado
    """
    hoje = datetime.now()
    primeiro_dia_mes = hoje.replace(day=1)
    
    logging.info(f"\n{'='*70}")
    logging.info(f"[INIT] MINERACAO LITURGICA - {hoje.strftime('%d/%m/%Y %H:%M')}")
    logging.info(f"{'='*70}\n")
    
    # Cálculo de datas
    lista_datas = []
    
    # Mês atual
    ultimo_dia_mes = (primeiro_dia_mes.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    dias_mes_atual = ultimo_dia_mes.day
    
    lista_datas.extend([primeiro_dia_mes + timedelta(days=x) for x in range(dias_mes_atual)])
    logging.info(f"[PLAN] Processando {dias_mes_atual} dias de {primeiro_dia_mes.strftime('%B/%Y')}")
    
    # Próximo mês (se dia >= 20)
    if modo == "proximo" or (modo == "atual" and hoje.day >= 20):
        proximo_mes = (primeiro_dia_mes + timedelta(days=32)).replace(day=1)
        ultimo_dia_proximo = (proximo_mes.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        dias_proximo_mes = ultimo_dia_proximo.day
        
        lista_datas.extend([proximo_mes + timedelta(days=x) for x in range(dias_proximo_mes)])
        logging.info(f"[PLAN] Incluindo {dias_proximo_mes} dias de {proximo_mes.strftime('%B/%Y')}")
    
    logging.info(f"\n[TARGET] Total de {len(lista_datas)} datas a processar\n")
    
    # Contadores
    sucesso = pulos = erros = 0
    
    for d in lista_datas:
        logging.info(f"[DATA] {d.strftime('%d/%m/%Y (%A)')}")
        resultado = minerar_data(d)
        
        if resultado:
            try:
                # Upsert no Supabase
                response = supabase.table("liturgia_palavra").upsert(
                    resultado, 
                    on_conflict="data"
                ).execute()
                
                sucesso += 1
                logging.info(f"   [DB] Salvo no banco!\n")
                
            except Exception as e:
                erros += 1
                logging.error(f"   [DB] Erro ao salvar no Supabase: {str(e)}\n")
        else:
            pulos += 1
        
        # Rate limiting (respeito ao servidor)
        time.sleep(2)
    
    # Relatório final
    logging.info(f"\n{'='*70}")
    logging.info(f"[REPORT] RELATORIO FINAL")
    logging.info(f"{'='*70}")
    logging.info(f"[OK] Sucesso: {sucesso}")
    logging.info(f"[SKIP] Pulados: {pulos}")
    logging.info(f"[FAIL] Erros: {erros}")
    logging.info(f"[RATE] Taxa de sucesso: {(sucesso/(sucesso+pulos+erros)*100):.1f}%")
    logging.info(f"{'='*70}\n")

# =============================================================================
# MODO TESTE
# =============================================================================

def testar_data_especifica(data_str):
    """
    Testa mineração de uma data específica (formato: YYYY-MM-DD)
    Útil para debug
    """
    data = datetime.strptime(data_str, "%Y-%m-%d")
    logging.info(f"\n[TEST] MODO TESTE - Data: {data.strftime('%d/%m/%Y')}\n")
    
    resultado = minerar_data(data)
    
    if resultado:
        print("\n" + "="*70)
        print("[SUCCESS] DADOS EXTRAIDOS:")
        print("="*70)
        for campo, valor in resultado.items():
            if valor:
                print(f"\n[FIELD] {campo.upper()}:")
                preview = valor[:200] + "..." if len(valor) > 200 else valor
                print(f"   {preview}")
        print("="*70)
        
        # Tenta salvar no banco
        try:
            logging.info("\n[DB] Tentando salvar no banco...")
            response = supabase.table("liturgia_palavra").upsert(
                resultado, 
                on_conflict="data"
            ).execute()
            logging.info("[DB] Dados salvos com sucesso!")
        except Exception as e:
            logging.error(f"[DB] Erro ao salvar: {str(e)}")
            
    else:
        print("[FAIL] Nenhum dado extraido")
        print("[HINT] Verifique o arquivo debug_YYYYMMDD.html para ver a estrutura HTML")

# =============================================================================
# EXECUÇÃO
# =============================================================================

if __name__ == "__main__":
    import sys
    
    try:
        # Modo CLI
        if len(sys.argv) > 1:
            if sys.argv[1] == "test":
                # python miner_vaticano_v8_windows.py test 2025-01-29
                data_teste = sys.argv[2] if len(sys.argv) > 2 else datetime.now().strftime("%Y-%m-%d")
                testar_data_especifica(data_teste)
            elif sys.argv[1] == "proximo":
                workflow_mensal(modo="proximo")
            else:
                logging.error("[CLI] Modo invalido. Use: test, atual, ou proximo")
        else:
            # Modo padrão: mês atual
            workflow_mensal(modo="atual")
            
    except KeyboardInterrupt:
        logging.warning("\n[STOP] Interrompido pelo usuario.")
    except Exception as e:
        logging.error(f"\n[FATAL] ERRO FATAL: {str(e)}", exc_info=True)
