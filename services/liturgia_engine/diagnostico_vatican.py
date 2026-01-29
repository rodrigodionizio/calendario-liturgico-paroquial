# =============================================================================
# DIAGNÓSTICO AVANÇADO - Vatican News HTML Structure
# Execute: python diagnostico_vatican.py
# =============================================================================

import requests
from bs4 import BeautifulSoup
from datetime import datetime
import json

url = "https://www.vaticannews.va/pt/palavra-do-dia/2025/01/29.html"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9',
}

print("="*70)
print("DIAGNOSTICO VATICAN NEWS - Análise de Estrutura HTML")
print("="*70)
print(f"\n[URL] {url}\n")

try:
    response = requests.get(url, headers=headers, timeout=30)
    
    if response.status_code != 200:
        print(f"[ERRO] HTTP {response.status_code}")
        exit(1)
    
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # =========================================================================
    # 1. IDENTIFICA CONTAINERS PRINCIPAIS
    # =========================================================================
    print("\n" + "="*70)
    print("1. CONTAINERS PRINCIPAIS")
    print("="*70)
    
    containers = {
        'article': soup.find('article'),
        'main': soup.find('main'),
        'div.section__content': soup.find('div', class_='section__content'),
        'div.content-body': soup.find('div', class_='content-body'),
        'div#main-content': soup.find('div', {'id': 'main-content'}),
        'div.article-body': soup.find('div', class_='article-body'),
        'div.content': soup.find('div', class_='content'),
    }
    
    container_encontrado = None
    for nome, container in containers.items():
        if container:
            print(f"\n[OK] Encontrado: {nome}")
            print(f"     Classes: {container.get('class', [])}")
            print(f"     ID: {container.get('id', 'N/A')}")
            
            # Primeira vez que encontra, marca como principal
            if not container_encontrado:
                container_encontrado = container
                print(f"     >>> USANDO ESTE COMO PRINCIPAL <<<")
        else:
            print(f"[--] Nao encontrado: {nome}")
    
    if not container_encontrado:
        print("\n[ERRO] Nenhum container conhecido encontrado!")
        print("[HINT] Salvando HTML completo...")
        with open('debug_full.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("[OK] Arquivo salvo: debug_full.html")
        exit(1)
    
    # =========================================================================
    # 2. ANALISA ESTRUTURA DE PARÁGRAFOS
    # =========================================================================
    print("\n" + "="*70)
    print("2. ESTRUTURA DE PARÁGRAFOS E HEADERS")
    print("="*70)
    
    elementos = container_encontrado.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'strong', 'div'])
    
    print(f"\n[INFO] Total de elementos encontrados: {len(elementos)}")
    
    # Mostra os primeiros 20 elementos
    print("\n[PREVIEW] Primeiros 20 elementos:\n")
    for idx, elem in enumerate(elementos[:20]):
        texto = elem.get_text().strip()
        if texto:
            tag = elem.name
            classes = ' '.join(elem.get('class', []))
            preview = texto[:80] + "..." if len(texto) > 80 else texto
            print(f"[{idx:02d}] <{tag}> {classes}")
            print(f"     {preview}\n")
    
    # =========================================================================
    # 3. IDENTIFICA MARCADORES DE LEITURA
    # =========================================================================
    print("\n" + "="*70)
    print("3. IDENTIFICAÇÃO DE MARCADORES LITÚRGICOS")
    print("="*70)
    
    marcadores = {
        'Primeira Leitura': [],
        'Segunda Leitura': [],
        'Salmo': [],
        'Evangelho': []
    }
    
    for idx, elem in enumerate(elementos):
        texto = elem.get_text().strip().lower()
        
        if 'primeira leitura' in texto or '1ª leitura' in texto:
            marcadores['Primeira Leitura'].append((idx, elem.get_text().strip()))
        elif 'segunda leitura' in texto or '2ª leitura' in texto:
            marcadores['Segunda Leitura'].append((idx, elem.get_text().strip()))
        elif 'salmo' in texto and len(texto) < 100:
            marcadores['Salmo'].append((idx, elem.get_text().strip()))
        elif 'evangelho' in texto and len(texto) < 100:
            marcadores['Evangelho'].append((idx, elem.get_text().strip()))
    
    for tipo, lista in marcadores.items():
        if lista:
            print(f"\n[OK] {tipo} encontrado:")
            for idx, texto in lista:
                print(f"     Posicao {idx}: {texto}")
        else:
            print(f"\n[--] {tipo} NAO encontrado")
    
    # =========================================================================
    # 4. EXTRAI TEXTO COMPLETO DO CONTAINER
    # =========================================================================
    print("\n" + "="*70)
    print("4. TEXTO COMPLETO DO CONTAINER")
    print("="*70)
    
    texto_completo = container_encontrado.get_text(separator="\n", strip=True)
    linhas = [l.strip() for l in texto_completo.split("\n") if l.strip()]
    
    print(f"\n[INFO] Total de linhas: {len(linhas)}")
    print(f"\n[PREVIEW] Primeiras 30 linhas:\n")
    
    for idx, linha in enumerate(linhas[:30]):
        print(f"[{idx:02d}] {linha}")
    
    # =========================================================================
    # 5. SALVA DADOS ESTRUTURADOS PARA ANÁLISE
    # =========================================================================
    print("\n" + "="*70)
    print("5. SALVANDO DADOS ESTRUTURADOS")
    print("="*70)
    
    dados_debug = {
        "url": url,
        "timestamp": datetime.now().isoformat(),
        "container_usado": str(container_encontrado.name) if container_encontrado else None,
        "total_elementos": len(elementos),
        "marcadores_encontrados": {k: len(v) for k, v in marcadores.items()},
        "linhas_texto": linhas
    }
    
    with open('debug_estrutura.json', 'w', encoding='utf-8') as f:
        json.dump(dados_debug, f, ensure_ascii=False, indent=2)
    
    print("\n[OK] Arquivo salvo: debug_estrutura.json")
    
    # =========================================================================
    # 6. RECOMENDAÇÕES
    # =========================================================================
    print("\n" + "="*70)
    print("6. RECOMENDAÇÕES")
    print("="*70)
    
    if all(len(v) > 0 for v in marcadores.values()):
        print("\n[SUCCESS] Todos os marcadores foram encontrados!")
        print("[HINT] O parser deve funcionar. Verifique a extração de texto.")
    else:
        print("\n[WARNING] Alguns marcadores não foram encontrados.")
        print("[HINT] Possíveis causas:")
        print("  1. Site mudou a estrutura HTML")
        print("  2. Palavras-chave em formato diferente")
        print("  3. Conteúdo dentro de iframes ou JavaScript")
    
    if len(linhas) < 50:
        print("\n[WARNING] Poucas linhas de texto extraídas.")
        print("[HINT] O container pode estar vazio ou escondido.")
        print("       Verifique se o conteúdo está em JavaScript/Vue/React")
    
    print("\n" + "="*70)
    print("ANÁLISE COMPLETA")
    print("="*70)
    print("\nArquivos gerados:")
    print("  - debug_full.html (se houver erro)")
    print("  - debug_estrutura.json")
    print("\n")

except Exception as e:
    print(f"\n[ERRO] {str(e)}")
    import traceback
    traceback.print_exc()
