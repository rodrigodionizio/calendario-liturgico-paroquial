from pathlib import Path

def create_project_structure():
    # Definição da Árvore de Diretórios
    directories = [
        "backend_automacao",     # Scripts Python
        "database",              # SQL e Backups
        "docs/assets/css",       # Frontend - Estilos
        "docs/assets/js",        # Frontend - Scripts
        "docs/assets/img",       # Frontend - Imagens
    ]

    print("🚀 Iniciando a construção do projeto na raiz do repositório")

    # 1. Criação das Pastas
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"   📂 Pasta criada: {directory}")

    # 2. Criação dos Arquivos Base com Conteúdo Profissional
    
    # 2.1 .gitignore
    gitignore_content = """# Python
__pycache__/
*.py[cod]
venv/
.env

# OS
.DS_Store
Thumbs.db

# IDEs
.vscode/
.idea/
"""

    # 2.2 README.md
    readme_content = """# Calendário Litúrgico Paroquial

Sistema WebApp para gestão e divulgação de escalas litúrgicas paroquiais.

## Arquitetura
- **Frontend:** HTML5, CSS3, JavaScript (Hospedado no GitHub Pages /docs)
- **Backend/DBA:** PostgreSQL (Supabase) + Scripts de Automação Python
- **Ano Litúrgico Base:** 2026 (Ano A / Mateus)

## Como Rodar
1. Clone o repositório.
2. Execute os scripts em `backend_automacao/` para atualizar as datas.
3. O site é servido estaticamente na pasta `docs/`.

---
*Projeto desenvolvido com respeito à Doutrina Católica e ao Sagrado Magistério.*
"""

    # 2.3 HTML Base (index.html)
    html_content = """<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendário Litúrgico Paroquial</title>
    <!-- CSS -->
    <link rel="stylesheet" href="assets/css/styles.css">
    <!-- Bootstrap CDN -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>

    <!-- Navegação -->
    <nav class="navbar navbar-dark bg-dark">
        <div class="container-fluid">
            <span class="navbar-brand mb-0 h1">Liturgia Paroquial 2026</span>
        </div>
    </nav>

    <div class="container mt-4">
        <div class="alert alert-info" role="alert">
            Carregando calendário litúrgico...
        </div>
        
        <!-- Aqui serão injetados os Cards via Javascript -->
        <div id="calendar-container" class="row"></div>
    </div>

    <!-- Scripts -->
    <script src="assets/js/api.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>
"""

    # 2.4 CSS Base (styles.css)
    css_content = """/* Cores Litúrgicas Padrão */
:root {
    --cor-verde-comum: #2e7d32;   /* Tempo Comum */
    --cor-roxo-advento: #4a148c;  /* Advento/Quaresma */
    --cor-branco-festas: #f5f5f5; /* Solenidades */
    --cor-vermelho-martires: #b71c1c;
    --cor-rosa-laetare: #ec407a;
    --cor-texto-padrao: #212529;
}

body {
    background-color: #f8f9fa;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.liturgia-card {
    border-left: 5px solid var(--cor-verde-comum); /* Padrão, muda via JS */
    margin-bottom: 15px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
"""

    # 2.5 Script SQL Inicial (schema.sql)
    sql_content = """-- Tabela de Referência Litúrgica
CREATE TABLE liturgia_diaria (
    id SERIAL PRIMARY KEY,
    data_calendario DATE UNIQUE NOT NULL,
    semana_ordinal INT,
    dia_semana VARCHAR(20),
    tempo_liturgico VARCHAR(50),
    cor VARCHAR(20),
    santo_festa VARCHAR(150),
    grau VARCHAR(50)
);

-- Tabela de Escalas da Paróquia
CREATE TABLE escalas (
    id SERIAL PRIMARY KEY,
    liturgia_id INT REFERENCES liturgia_diaria(id),
    hora TIME NOT NULL,
    equipe_leitura VARCHAR(100),
    equipe_canto VARCHAR(100),
    responsavel_contato VARCHAR(50)
);
"""

    # Dicionário de arquivos para criar
    files_to_create = {
        ".gitignore": gitignore_content,
        "README.md": readme_content,
        "docs/index.html": html_content,
        "docs/assets/css/styles.css": css_content,
        "database/schema.sql": sql_content,
        "backend_automacao/gerador_datas.py": "# Todo: Algoritmo de Datas Móveis",
        "docs/assets/js/app.js": "console.log('App iniciado');",
        "docs/assets/js/api.js": "console.log('Módulo API pronto');"
    }

    # Gravação dos arquivos
    for filepath, content in files_to_create.items():
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"   📄 Arquivo gerado: {filepath}")

    print("\n✅ Estrutura criada com sucesso!")
    print("👉 Próximo passo: Abra o repositório no VS Code.")

if __name__ == "__main__":
    create_project_structure()