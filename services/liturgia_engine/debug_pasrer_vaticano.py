import requests
from bs4 import BeautifulSoup

# Testa com data de hoje (que sabemos que existe)
url = "https://www.vaticannews.va/pt/palavra-do-dia/2025/01/29.html"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9',
}

print(f"🔍 Acessando: {url}\n")

try:
    response = requests.get(url, headers=headers, timeout=20)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        
        print("\n" + "="*60)
        print("📋 ESTRUTURA DO HTML")
        print("="*60)
        
        # Testa diferentes seletores
        print("\n1️⃣ Tentando: div.section__content")
        section_content = soup.find('div', class_='section__content')
        if section_content:
            print(f"   ✅ Encontrado! Preview:")
            print(f"   {section_content.get_text()[:200]}...")
        else:
            print("   ❌ Não encontrado")
        
        print("\n2️⃣ Tentando: article")
        article = soup.find('article')
        if article:
            print(f"   ✅ Encontrado! Preview:")
            print(f"   {article.get_text()[:200]}...")
        else:
            print("   ❌ Não encontrado")
        
        print("\n3️⃣ Tentando: div.content")
        content = soup.find('div', class_='content')
        if content:
            print(f"   ✅ Encontrado! Preview:")
            print(f"   {content.get_text()[:200]}...")
        else:
            print("   ❌ Não encontrado")
        
        print("\n4️⃣ Tentando: main")
        main = soup.find('main')
        if main:
            print(f"   ✅ Encontrado! Preview:")
            print(f"   {main.get_text()[:200]}...")
        else:
            print("   ❌ Não encontrado")
        
        print("\n5️⃣ Todas as classes CSS disponíveis:")
        all_classes = set()
        for tag in soup.find_all(class_=True):
            all_classes.update(tag.get('class'))
        print(f"   {sorted(list(all_classes))[:20]}")
        
        # Salva HTML completo para análise
        print("\n💾 Salvando HTML completo em 'debug_vatican.html'...")
        with open('debug_vatican.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("   ✅ Salvo!")
        
except Exception as e:
    print(f"❌ Erro: {e}")