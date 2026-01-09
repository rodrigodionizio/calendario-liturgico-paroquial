import json

def converter_json_para_sql():
    # 1. Ler o JSON gerado
    try:
        with open("calendario_2026.json", "r", encoding="utf-8") as f:
            eventos = json.load(f)
    except FileNotFoundError:
        print("Erro: Gere o 'calendario_2026.json' primeiro (Passo 2).")
        return

    # 2. Mapeamento de Cores (Nome no JSON -> ID no Banco)
    # Baseado no INSERT do script do DBA
    mapa_cores = {
        "Verde": 1, "Branco": 2, "Vermelho": 3, 
        "Roxo": 4, "Rosa": 5, 
        "Rosa/Roxo": 5, "Dourado/Branco": 2, "Roxo/Preto": 4 # Adaptações
    }

    sql_output = "-- SEED DE EVENTOS 2026\n"
    
    # Limpar eventos antigos de 2026 para não duplicar se rodar 2x
    sql_output += "DELETE FROM eventos_base WHERE data >= '2026-01-01' AND data <= '2026-12-31';\n\n"

    print(f"Processando {len(eventos)} eventos...")

    for ev in eventos:
        # Tentar achar o ID da cor, se não achar usa 1 (Verde/Default)
        cor_nome = ev['cor_sugerida'].split('/')[0] # Pega a primeira cor se tiver barra
        cor_id = mapa_cores.get(cor_nome, 1) 
        
        is_solenidade = 'TRUE' if ev['tipo'] == 'Solenidade' else 'FALSE'
        is_festa = 'TRUE' if ev['tipo'] == 'Festa' else 'FALSE'
        
        # Tratamento de aspas simples no título (ex: D'água) para não quebrar SQL
        titulo = ev['titulo_liturgico'].replace("'", "''")
        tempo = ev['tempo']
        data = ev['data_iso']

        # Query INSERT
        sql = f"INSERT INTO eventos_base (data, titulo, tempo_liturgico, cor_id, is_solenidade, is_festa) VALUES ('{data}', '{titulo}', '{tempo}', {cor_id}, {is_solenidade}, {is_festa});\n"
        sql_output += sql

    # 3. Salvar arquivo SQL
    with open("seed_eventos_2026.sql", "w", encoding="utf-8") as f:
        f.write(sql_output)

    print("✅ Sucesso! Arquivo 'seed_eventos_2026.sql' gerado.")
    print("👉 Agora vá no Supabase > SQL Editor, abra este arquivo e rode.")

if __name__ == "__main__":
    converter_json_para_sql()