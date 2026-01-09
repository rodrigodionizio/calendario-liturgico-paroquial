import os

def gerar_css_fontes_minificado():
    pasta_fonts = "docs/assets/fonts"
    # Cabeçalho do arquivo
    css_output = "/* --- FONT FACES GERADOS (AUTO) --- */\n"
    
    # Mapa de pesos (Quanto mais específico, melhor)
    mapa_pesos = {
        'thin': 100, 'hair': 100,
        'extra-light': 200, 'extralight': 200,
        'light': 300,
        'regular': 400, 'book': 400, 'normal': 400,
        'medium': 500,
        'semi-bold': 600, 'semibold': 600, 'demi': 600,
        'bold': 700,
        'extra-bold': 800, 'extrabold': 800,
        'black': 900, 'heavy': 900
    }

    print(f">>> Lendo arquivos em: {pasta_fonts}")
    
    try:
        arquivos = [f for f in os.listdir(pasta_fonts) if f.lower().endswith(('.otf', '.ttf', '.woff', '.woff2'))]
    except FileNotFoundError:
        print(f"❌ Erro: Pasta '{pasta_fonts}' não encontrada.")
        return

    # Ordenar para ficar organizado (Antenna primeiro, depois Neulis)
    arquivos.sort()

    for arquivo in arquivos:
        nome_lower = arquivo.lower()
        
        # 1. Determinar Família
        if "neulis" in nome_lower:
            familia = "Neulis"
        elif "antenna" in nome_lower:
            familia = "AntennaCond"
        else:
            # Se tiver outra fonte (ex: Humming), usa o nome do arquivo
            familia = arquivo.split('.')[0].split('-')[0]
            
        # 2. Determinar Peso
        peso = 400 # Default
        for chave, valor in mapa_pesos.items():
            if chave in nome_lower:
                peso = valor
                # Não damos break aqui porque "extra-bold" contém "bold", 
                # queremos o match mais específico se possível, mas nesse dict simples
                # a ordem de verificação importa menos se os nomes forem padrão.
                # Para garantir, assumimos o último match ou o mais específico.
        
        # Refinamento de peso para casos comuns
        if "black" in nome_lower: peso = 900
        elif "extrabold" in nome_lower: peso = 800
        elif "bold" in nome_lower: peso = 700
        elif "light" in nome_lower: peso = 300
        elif "thin" in nome_lower: peso = 100

        # 3. Determinar Estilo
        estilo = "italic" if "italic" in nome_lower else "normal"

        # GERAÇÃO INLINE (Minificada)
        linha_css = f"@font-face {{ font-family: '{familia}'; src: url('../fonts/{arquivo}') format('opentype'); font-weight: {peso}; font-style: {estilo}; font-display: swap; }}\n"
        
        css_output += linha_css
        print(f"✔ {familia} ({peso}/{estilo}) -> {arquivo}")

    # Salvar
    with open("fontes_geradas.css", "w", encoding="utf-8") as f:
        f.write(css_output)
    
    print("\n✅ ARQUIVO 'fontes_geradas.css' CRIADO!")
    print("👉 Copie o conteúdo dele e cole no início do seu 'docs/assets/css/styles.css'.")
    print("👉 DEPOIS, não esqueça de ajustar as variáveis :root no CSS.")

if __name__ == "__main__":
    gerar_css_fontes_minificado()