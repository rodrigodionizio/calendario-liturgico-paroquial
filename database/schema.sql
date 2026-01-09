-- Tabela de Referência Litúrgica
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
