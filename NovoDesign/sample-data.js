// Dados de exemplo — Sacristia Digital (Paróquia Senhor Bom Jesus, Itabirinha/MG)
// Estrutura espelha o schema Supabase real (eventos, escalas, equipes, comunidades, avisos)
if (typeof window === "undefined" || !window.SACRISTIA_DADOS) {
(function () {
const CORES_LITURGICAS = {
  verde:    { hex: "#4C9E81", txt: "#2f6350", nome: "Verde" },
  roxo:     { hex: "#343069", txt: "#343069", nome: "Roxo" },
  dourado:  { hex: "#D9A441", txt: "#A9772A", nome: "Dourado" },
  vermelho: { hex: "#B53325", txt: "#7E2118", nome: "Vermelho" },
  branco:   { hex: "#9C8A7C", txt: "#6E5C50", nome: "Branco" },
  rosa:     { hex: "#C9564A", txt: "#9F2A1D", nome: "Rosa" },
};

const COMUNIDADES = [
  { id: "matriz", nome: "Matriz", endereco: "Praça da Igreja, Centro" },
  { id: "c1", nome: "N. Sra. Aparecida", endereco: "Córrego São João" },
  { id: "c2", nome: "São Sebastião", endereco: "Distrito de Itamburi" },
  { id: "c3", nome: "Santa Luzia", endereco: "Bairro Alto da Colina" },
];

const EQUIPES = [
  { id: 1, nome: "Sagrada Família", tipo: "Leitura" },
  { id: 2, nome: "São José", tipo: "Leitura" },
  { id: 3, nome: "Nossa Senhora do Carmo", tipo: "Leitura" },
  { id: 4, nome: "Santa Cecília", tipo: "Canto" },
  { id: 5, nome: "Louvor ao Rei", tipo: "Canto" },
  { id: 6, nome: "Vozes de Sião", tipo: "Canto" },
];

// ---------------------------------------------------------------------------
// Geração de eventos: junho, julho e agosto de 2026
// ---------------------------------------------------------------------------
function _iso(a, m, d) {
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

let _id = 1;
function _ev(base) {
  return Object.assign(
    {
      id: _id++,
      tipo_compromisso: "liturgia",
      tipo_celebracao: "missa",
      tempo_liturgico: "Tempo Comum",
      cor: CORES_LITURGICAS.verde,
      is_solenidade: false,
      comunidade_id: null,
      escalas: [],
    },
    base,
  );
}

function gerarEventos() {
  const eventos = [];
  const meses = [
    { a: 2026, m: 6 },
    { a: 2026, m: 7 },
    { a: 2026, m: 8 },
  ];

  const rotLeitura = [1, 2, 3];
  const rotCanto = [4, 5, 6];
  let rot = 0;

  meses.forEach(({ a, m }) => {
    const ultimo = new Date(a, m, 0).getDate();
    for (let d = 1; d <= ultimo; d++) {
      const data = _iso(a, m, d);
      const dow = new Date(a, m - 1, d).getDay();

      // Domingo — missas na Matriz (07h e 19h)
      if (dow === 0) {
        const eqL = EQUIPES.find((e) => e.id === rotLeitura[rot % 3]);
        const eqL2 = EQUIPES.find((e) => e.id === rotLeitura[(rot + 1) % 3]);
        const eqC = EQUIPES.find((e) => e.id === rotCanto[rot % 3]);
        const eqC2 = EQUIPES.find((e) => e.id === rotCanto[(rot + 1) % 3]);
        eventos.push(
          _ev({
            data,
            titulo: "Missa Dominical",
            tempo_liturgico: "Tempo Comum",
            cor: CORES_LITURGICAS.verde,
            escalas: [
              {
                hora: "07:00",
                leitura: eqL.nome,
                canto: eqC.nome,
                celebrante: "Pe. Hugo Damião Leal",
                mesce: ["Maria das Graças", "José Antônio"],
                coroinhas: ["Ana Clara", "Miguel", "Sofia"],
              },
              {
                hora: "19:00",
                leitura: eqL2.nome,
                canto: eqC2.nome,
                celebrante: "Pe. Hugo Damião Leal",
                mesce: ["Terezinha Lopes"],
                coroinhas: ["Davi", "Helena"],
              },
            ],
          }),
        );
        // Celebração da Palavra numa comunidade rural, domingos alternados
        if (d % 14 < 7) {
          eventos.push(
            _ev({
              data,
              titulo: "Celebração da Palavra",
              tipo_celebracao: "celebracao_palavra",
              comunidade_id: "c1",
              cor: CORES_LITURGICAS.verde,
              escalas: [
                {
                  hora: "09:00",
                  leitura: "Equipe local",
                  canto: "Vozes de Sião",
                  mep: "Min. Palavra — Aparecida",
                },
              ],
            }),
          );
        }
        rot++;
      }

      // Terça e quinta — missa ferial 19h
      if (dow === 2 || dow === 4) {
        eventos.push(
          _ev({
            data,
            titulo: "Missa Ferial",
            cor: CORES_LITURGICAS.verde,
            escalas: [
              {
                hora: "19:00",
                leitura: EQUIPES[(d + rot) % 3].nome,
                canto: EQUIPES[3 + ((d + rot) % 3)].nome,
                celebrante: "Pe. Hugo Damião Leal",
              },
            ],
          }),
        );
      }

      // Quarta — atendimento paroquial
      if (dow === 3) {
        eventos.push(
          _ev({
            data,
            titulo: "Atendimento Paroquial",
            tipo_compromisso: "atendimento",
            hora_inicio: "08:00",
            local: "Secretaria Paroquial",
            responsavel: "Pe. Hugo Damião Leal",
          }),
        );
      }

      // Primeira sexta — Sagrado Coração
      if (dow === 5 && d <= 7) {
        eventos.push(
          _ev({
            data,
            titulo: "Missa do Sagrado Coração",
            cor: CORES_LITURGICAS.branco,
            escalas: [
              {
                hora: "19:00",
                leitura: "Apostolado da Oração",
                canto: "Santa Cecília",
                celebrante: "Pe. Hugo Damião Leal",
              },
            ],
          }),
        );
      }
    }
  });

  // ----- Eventos pontuais -----
  eventos.push(
    _ev({
      data: "2026-07-04",
      titulo: "Reunião do Conselho Pastoral",
      tipo_compromisso: "reuniao",
      hora_inicio: "19:30",
      local: "Salão Paroquial",
      responsavel: "Coord. Marta Oliveira",
    }),
    _ev({
      data: "2026-07-11",
      titulo: "Encontro de Catequistas",
      tipo_compromisso: "reuniao",
      hora_inicio: "15:00",
      local: "Salão Paroquial",
      responsavel: "Coord. de Catequese",
    }),
    _ev({
      data: "2026-07-16",
      titulo: "N. Sra. do Carmo — Memória",
      cor: CORES_LITURGICAS.branco,
      escalas: [
        {
          hora: "19:00",
          leitura: "Nossa Senhora do Carmo",
          canto: "Santa Cecília",
          celebrante: "Pe. Hugo Damião Leal",
        },
      ],
    }),
    _ev({
      data: "2026-07-18",
      titulo: "Festa Julina Paroquial",
      tipo_compromisso: "evento",
      hora_inicio: "18:00",
      local: "Pátio da Matriz",
      responsavel: "PASCOM",
    }),
    _ev({
      data: "2026-07-25",
      titulo: "São Tiago Apóstolo — Festa",
      cor: CORES_LITURGICAS.vermelho,
      escalas: [
        {
          hora: "19:00",
          leitura: "São José",
          canto: "Louvor ao Rei",
          celebrante: "Pe. Hugo Damião Leal",
        },
      ],
    }),
    _ev({
      data: "2026-07-26",
      titulo: "Missa — SS. Joaquim e Ana",
      comunidade_id: "c3",
      cor: CORES_LITURGICAS.branco,
      escalas: [
        {
          hora: "10:00",
          leitura: "Equipe local",
          canto: "Vozes de Sião",
          celebrante: "Pe. Hugo Damião Leal",
        },
      ],
    }),
    _ev({
      data: "2026-07-28",
      titulo: "Início da Novena do Bom Jesus",
      is_solenidade: true,
      cor: CORES_LITURGICAS.dourado,
      escalas: [
        {
          hora: "19:00",
          leitura: "Sagrada Família",
          canto: "Santa Cecília",
          celebrante: "Pe. Hugo Damião Leal",
          coroinhas: ["Ana Clara", "Miguel"],
        },
      ],
    }),
    _ev({
      data: "2026-08-06",
      titulo: "Solenidade do Senhor Bom Jesus",
      is_solenidade: true,
      cor: CORES_LITURGICAS.dourado,
      escalas: [
        {
          hora: "10:00",
          leitura: "Sagrada Família",
          canto: "Santa Cecília",
          celebrante: "Dom Élio — Bispo Diocesano",
          mesce: ["Maria das Graças", "José Antônio", "Terezinha Lopes"],
          coroinhas: ["Ana Clara", "Miguel", "Sofia", "Davi"],
        },
        {
          hora: "19:00",
          leitura: "São José",
          canto: "Louvor ao Rei",
          celebrante: "Pe. Hugo Damião Leal",
        },
      ],
    }),
  );

  // Missa com escala numa segunda comunidade
  eventos.push(
    _ev({
      data: "2026-07-12",
      titulo: "Missa na Comunidade",
      comunidade_id: "c2",
      cor: CORES_LITURGICAS.verde,
      escalas: [
        {
          hora: "10:00",
          leitura: "Equipe local",
          canto: "Vozes de Sião",
          celebrante: "Pe. Hugo Damião Leal",
        },
      ],
    }),
  );

  const porData = {};
  eventos.forEach((ev) => {
    (porData[ev.data] = porData[ev.data] || []).push(ev);
  });
  // Ordena eventos do dia por hora
  Object.values(porData).forEach((list) =>
    list.sort((x, y) => {
      const hx = x.hora_inicio || x.escalas?.[0]?.hora || "23:59";
      const hy = y.hora_inicio || y.escalas?.[0]?.hora || "23:59";
      return hx.localeCompare(hy);
    }),
  );
  return porData;
}

const AVISOS = [
  {
    id: 1,
    data: "2026-07-08",
    hora_inicio: "08:00",
    titulo: "Atendimento paroquial nesta quarta",
    local: "Secretaria Paroquial",
    prioridade: 1,
    descricao:
      "O Pe. Hugo atende na secretaria a partir das 8h. Agendamentos de intenções, batizados e casamentos.",
  },
  {
    id: 2,
    data: "2026-07-18",
    hora_inicio: "18:00",
    titulo: "Festa Julina Paroquial",
    local: "Pátio da Matriz",
    prioridade: 2,
    descricao:
      "Barraquinhas, quadrilha e quentão em prol das obras da Matriz. Convide sua família!",
  },
  {
    id: 3,
    data: "2026-07-28",
    hora_inicio: "19:00",
    titulo: "Novena do Senhor Bom Jesus",
    local: "Igreja Matriz",
    prioridade: 3,
    descricao:
      "De 28/07 a 05/08, novena preparatória para a Solenidade do padroeiro no dia 6 de agosto.",
  },
];

const DADOS = {
  cores: CORES_LITURGICAS,
  comunidades: COMUNIDADES,
  equipes: EQUIPES,
  eventosPorData: gerarEventos(),
  avisos: AVISOS,
  hoje: "2026-07-07",
};

if (typeof module !== "undefined") module.exports = { DADOS };
if (typeof window !== "undefined") window.SACRISTIA_DADOS = DADOS;
})();
}
