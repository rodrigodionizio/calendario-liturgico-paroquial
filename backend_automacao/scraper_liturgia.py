import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import date, timedelta
import re

def limpar_texto(texto):
    if not texto: return None
    # Remove espaços extras e quebras de linha sujas
    return re.sub(r'\s+', ' ', texto).strip()

def fazer_scraping_liturgia(mes, ano):
    print(f"\n>>> Iniciando Coleta de Liturgia para {mes}/{ano}...")
    
    data_atual = date(ano, mes, 1)
    # Define o último dia do mês corretamente
    if mes == 12:
        proximo_mes = date(ano + 1, 1, 1)
    else:
        proximo_mes = date(ano, mes + 1, 1)
    data_fim = proximo_mes - timedelta(days=1)
    
    liturgia_dados = []

    while data_atual <= data_fim:
        dia_str = data_atual.strftime("%d-%m-%Y") # Formato da URL da Canção Nova
        url = f"https://liturgia.cancaonova.com/pb/liturgia/d/{dia_str}/"
        
        print(f"Lendo: {data_atual} ... ", end="")
        
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Estrutura para salvar
                dia_liturgia = {
                    "data": data_atual.isoformat(),
                    "primeira_leitura_ref": None,
                    "primeira_leitura_texto": None,
                    "salmo_ref": None,
                    "salmo_refrao": None,
                    "salmo_texto": None,
                    "segunda_leitura_ref": None,
                    "segunda_leitura_texto": None,
                    "evangelho_ref": None,
                    "evangelho_texto": None
                }

                # --- Lógica de Extração (Baseada no Layout da Canção Nova) ---
                # Eles usam abas ou seções. O código abaixo busca pelos títulos típicos.
                
                entradas = soup.find_all('div', id=re.compile('liturgia-'))
                
                # Fallback: Procura por títulos h1/h2 se a estrutura de div falhar
                # Simplificação: Vamos pegar o conteúdo bruto das seções principais
                
                conteudo_entry = soup.find('div', class_='entry-content')
                if conteudo_entry:
                    textos = conteudo_entry.get_text(" | ", strip=True)
                    
                    # Tentar extrair referências (Ex: Leitura (Is 42,1-4))
                    # Esta parte é complexa pois o site muda. 
                    # Vamos tentar pegar os títulos de cada bloco.
                    
                    titulos = conteudo_entry.find_all(['h1', 'h2', 'h3', 'strong'])
                    
                    for t in titulos:
                        texto_titulo = t.get_text().lower()
                        proximo_p = t.find_next('p')
                        conteudo = proximo_p.get_text() if proximo_p else ""
                        
                        if "leitura" in texto_titulo and "primeira" in texto_titulo:
                            dia_liturgia["primeira_leitura_ref"] = t.get_text().replace("1ª Leitura", "").strip(" –-()")
                            # Pega o texto até o próximo título (lógica simplificada)
                            dia_liturgia["primeira_leitura_texto"] = conteudo[:500] + "..." # Limitado para teste
                            
                        elif "salmo" in texto_titulo:
                            dia_liturgia["salmo_ref"] = t.get_text().replace("Salmo", "").strip(" –-()")
                            dia_liturgia["salmo_texto"] = conteudo[:300] + "..."
                            
                        elif "segunda" in texto_titulo:
                            dia_liturgia["segunda_leitura_ref"] = t.get_text().replace("2ª Leitura", "").strip(" –-()")
                            dia_liturgia["segunda_leitura_texto"] = conteudo[:500] + "..."
                            
                        elif "evangelho" in texto_titulo:
                            dia_liturgia["evangelho_ref"] = t.get_text().replace("Evangelho", "").strip(" –-()")
                            dia_liturgia["evangelho_texto"] = conteudo[:800] + "..."

                liturgia_dados.append(dia_liturgia)
                print("✅ OK")
            else:
                print(f"❌ Erro {response.status_code}")
                
        except Exception as e:
            print(f"⚠️ Falha: {e}")

        # Delay para não bloquear o IP (Ética de Scraping)
        time.sleep(1)
        data_atual += timedelta(days=1)

    # Salvar JSON
    arquivo_saida = f"liturgia_{mes}_{ano}.json"
    with open(arquivo_saida, 'w', encoding='utf-8') as f:
        json.dump(liturgia_dados, f, ensure_ascii=False, indent=2)
    
    print(f"\nArquivo '{arquivo_saida}' gerado com sucesso!")

if __name__ == "__main__":
    # Teste: Janeiro de 2026
    fazer_scraping_liturgia(1, 2026)