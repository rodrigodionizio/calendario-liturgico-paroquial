/* 
 * ARQUIVO: app.js
 * DESCRIÇÃO: Lógica de apresentação do Calendário Litúrgico (Modais e Dados)
 * AUTOR: RodrigoDionizio
 */

console.log("Sistema Litúrgico Iniciado");

// --- CONSTANTES DE ÍCONES (SVG) ---
const ICONS = {
    leitura: '<svg class="equipe-icon" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-vinho)"><path d="M12 3v18.5c-2.3-.6-4.4-1-6.5-1-2.4 0-4.6.5-6.5 1.2V3.2C1.4 2.5 3.6 2 6 2c2.1 0 4.1.4 6 1zm10.5-.8c-1.9-.7-4.1-1.2-6.5-1.2v18.5c2.1 0 4.2.4 6.5 1V3.2z"/></svg>',
    canto: '<svg class="equipe-icon" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-dourado)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>'
};

// --- BANCO DE DADOS LOCAL (Simulação) ---
// No futuro, isso virá do Supabase/JSON
const DADOS_CALENDARIO = {
    'dia01': {
        dia: '01', mes: 'JAN', sem: 'Quinta-feira', liturgia: 'Solenidade', titulo: 'Mãe de Deus',
        corBg: 'bg-dourado', corTxt: 'txt-dourado',
        escalas: [{hora:'19:30', leit:'Pastoral Familiar', cant:'Coral das Mães'}]
    },
    'dia04': {
        dia: '04', mes: 'JAN', sem: 'Domingo', liturgia: 'Epifania do Senhor', titulo: 'Missa Dominical',
        corBg: 'bg-branco', corTxt: 'txt-branco',
        escalas: [
            {hora:'07:30', leit:'Catequese', cant:'Anjos de Deus'},
            {hora:'19:00', leit:'Dízimo', cant:'Ministério Jovem'}
        ]
    },
    'dia18': {
        dia: '18', mes: 'JAN', sem: 'Domingo', liturgia: '2º Tempo Comum', titulo: 'Missa Dominical',
        corBg: 'bg-verde', corTxt: 'txt-verde',
        escalas: [
            {hora:'07:30', leit:'Pascom', cant:'Jovens de Cristo'},
            {hora:'19:00', leit:'Legião', cant:'Santa Cecília'}
        ]
    }
};

/**
 * Abre o Modal com os detalhes do dia
 * @param {string} idDia - ID do dia clicado (ex: 'dia01')
 */
function abrirModal(idDia) {
    const dados = DADOS_CALENDARIO[idDia];
    
    // Se não houver dados para o dia (dia vazio), não faz nada
    if (!dados) return;

    const modalContent = document.getElementById('modalContent');
    const modalOverlay = document.getElementById('modalOverlay');

    // 1. Gera HTML da lista de escalas
    let listaEscalasHTML = '';
    dados.escalas.forEach(escala => {
        listaEscalasHTML += `
        <div class="escala-item">
            <div class="escala-hora">${escala.hora}</div>
            <div class="escala-equipes">
                <div class="equipe-row">
                    ${ICONS.leitura} 
                    <span class="equipe-label">Leitura</span>
                    <span class="equipe-val">${escala.leit}</span>
                </div>
                <div class="equipe-row">
                    ${ICONS.canto} 
                    <span class="equipe-label">Canto</span>
                    <span class="equipe-val">${escala.cant}</span>
                </div>
            </div>
        </div>`;
    });

    // 2. Monta o HTML completo do Card
    const cardHTML = `
    <div class="modal-card">
        <button class="btn-close" onclick="fecharModalForce()" aria-label="Fechar">×</button>
        <div class="modal-sidebar-color ${dados.corBg}"></div>
        
        <div class="modal-body">
            <!-- Cabeçalho do Card -->
            <div class="modal-header">
                <div>
                    <span class="modal-day">${dados.dia}</span>
                    <span class="modal-month">${dados.mes}</span>
                </div>
                <div class="modal-meta">
                    <div class="modal-weekday">${dados.sem}</div>
                </div>
            </div>
            
            <!-- Títulos e Liturgia -->
            <div class="modal-liturgia ${dados.corTxt}">${dados.liturgia}</div>
            <div class="modal-titulo">${dados.titulo}</div>
            
            <!-- Lista de Escalas -->
            <div class="escala-list">${listaEscalasHTML}</div>
        </div>
    </div>`;

    // 3. Injeta no DOM e mostra
    modalContent.innerHTML = cardHTML;
    modalOverlay.classList.add('active');
}

/**
 * Fecha o Modal ao clicar no Overlay (fundo escuro)
 */
function fecharModal(event) {
    if (event.target.id === 'modalOverlay') {
        fecharModalForce();
    }
}

/**
 * Força o fechamento do Modal (botão X ou ESC)
 */
function fecharModalForce() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// Fechar com tecla ESC
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        fecharModalForce();
    }
});