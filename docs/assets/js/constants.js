/*
 * SACRISTIA DIGITAL - Sistema de Gestão Paroquial
 *
 * © 2026 TODOS OS DIREITOS RESERVADOS
 * Desenvolvido EXCLUSIVAMENTE por Rodrigo Dionízio
 *
 * ARQUIVO: constants.js
 * DESCRIÇÃO: Constantes de negócio centralizadas (CODE-001)
 * VERSÃO: 1.0
 *
 * Deve ser carregado ANTES de api.js, app.js e dashboard.js.
 */

window.SDS = {

  // Valores de tipo_atuacao da tabela equipes (espelham o enum do banco)
  TIPOS_EQUIPE: {
    LEITURA: 'Leitura',
    CANTO:   'Canto',
    MEP:     'MEP',
    AMBOS:   'Ambos',
  },

  // Valores de mural_prioridade (1 = urgente, 2 = normal, 3 = info)
  // Usados em class CSS "prio-urgente", "prio-normal" etc.
  PRIORIDADES: {
    URGENTE:    1,
    NORMAL:     2,
    INFO:       3,
  },

  // Rótulos CSS das prioridades (para classes e labels)
  PRIORIDADE_LABELS: {
    1: 'urgente',
    2: 'normal',
    3: 'info',
  },

  // Cores litúrgicas padrão (fallback — valores definitivos vêm do banco)
  CORES_LITURGICAS: {
    VERDE:    '#2e7d32',
    ROXO:     '#6a1b9a',
    BRANCO:   '#f5f5f5',
    VERMELHO: '#c62828',
    ROSA:     '#e91e63',
    DOURADO:  '#bfa15f',
    FALLBACK: '#888888',
  },

  // TTLs de cache em milissegundos (usados em api.js)
  TTL: {
    EVENTOS_MES:  2 * 60 * 1000,       // 2 min — revalida frequentemente
    EQUIPES:      10 * 60 * 1000,      // 10 min — muda raramente
    COMUNIDADES:  30 * 60 * 1000,      // 30 min — muda muito raramente
    STALE_MAX:    24 * 60 * 60 * 1000, // 24h   — fallback offline máximo
  },

  // Tipos de compromisso (espelham o enum do banco)
  TIPOS_COMPROMISSO: {
    LITURGIA:    'liturgia',
    REUNIAO:     'reuniao',
    EVENTO:      'evento',
    ATENDIMENTO: 'atendimento',
  },
};
