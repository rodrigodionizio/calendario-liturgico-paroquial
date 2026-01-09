-- Tabela de Referência Litúrgica (Dados do GCatholic)
CREATE TABLE liturgia_diaria (
    id SERIAL PRIMARY KEY,
    data_calendario DATE UNIQUE NOT NULL,
    semana_ordinal INT,        -- Ex: 3 (para 3ª semana)
    dia_semana VARCHAR(20),    -- Ex: Quinta-feira
    tempo_liturgico VARCHAR(50), -- Ex: Quaresma, Comum
    cor VARCHAR(20),           -- Ex: Roxo, Verde
    santo_festa VARCHAR(150),  -- Ex: São Pedro e São Paulo
    grau VARCHAR(50)           -- Solenidade, Festa, Memória
);

-- Tabela de Escalas da Paróquia
CREATE TABLE escalas (
    id SERIAL PRIMARY KEY,
    liturgia_id INT REFERENCES liturgia_diaria(id),
    hora TIME NOT NULL,
    equipe_leitura VARCHAR(100),
    equipe_canto VARCHAR(100),
    responsavel_contato VARCHAR(50) -- Telefone/Zap
);
