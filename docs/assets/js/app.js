/* 
 * ARQUIVO: app.js
 * DESCRIÇÃO: Controlador Principal (Versão 7.0 - Mestre)
 * AUTOR: Rodrigo & Dev AI
 */

console.log("🚀 Sistema Litúrgico V7 Iniciado");

// --- ESTADO GLOBAL ---
const ESTADO = {
    anoAtual: 2026,
    mesAtual: 1, 
    dadosEventos: {}, 
    isAdmin: false, 
    listaEquipes: [],
    filtrosAtivos: new Set()
};

let eventoEmEdicao = null;
let cacheEquipesLeitura = [];
let cacheEquipesCanto = [];

const ICONS = {
    leitura: '<svg class="equipe-icon" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-vinho)"><path d="M12 3v18.5c-2.3-.6-4.4-1-6.5-1-2.4 0-4.6.5-6.5 1.2V3.2C1.4 2.5 3.6 2 6 2c2.1 0 4.1.4 6 1zm10.5-.8c-1.9-.7-4.1-1.2-6.5-1.2v18.5c2.1 0 4.2.4 6.5 1V3.2z"/></svg>',
    canto: '<svg class="equipe-icon" viewBox="0 0 24 24" fill="currentColor" style="color:var(--cor-dourado)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>'
};

// ==========================================================================
// 1. INICIALIZAÇÃO
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
    // Auth
    const session = await window.api.checkSession();
    if (session) {
        ESTADO.isAdmin = true;
        console.log("👑 Admin: ", session.user.email);
        adicionarBotaoLogout();
    }
    
    // Dados Básicos e Cache
    ESTADO.listaEquipes = await window.api.listarEquipes();
    // Cache inteligente para os selects do editor
    cacheEquipesLeitura = ESTADO.listaEquipes.filter(e => e.tipo_atuacao === 'Leitura' || e.tipo_atuacao === 'Ambos');
    cacheEquipesCanto = ESTADO.listaEquipes.filter(e => e.tipo_atuacao === 'Canto' || e.tipo_atuacao === 'Ambos');
    
    // Inicia UI
    inicializarSidebar();
    renderizarMural(); // <-- Importante: Carrega o Mural
    carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
    configurarBotoesNavegacao();
});

// ==========================================================================
// 2. MURAL DE AVISOS (NOVO)
// ==========================================================================
async function renderizarMural() {
    const container = document.querySelector('.mini-calendar'); 
    if (!container) return;

    container.innerHTML = '<div style="padding:20px; color:#888; font-size:0.8rem;">Carregando avisos...</div>';
    container.className = ''; 

    try {
        const avisos = await window.api.buscarAvisos();
        
        if (avisos.length === 0) {
            container.innerHTML = '<div style="padding:15px; text-align:center; color:#999; font-style:italic; background:#fff; border-radius:8px; border:1px solid #eee;">Sem avisos recentes.</div>';
            return;
        }

        let html = `
        <div class="mural-header">
            <span class="mural-title">Mural Paroquial</span>
            <span class="mural-badge">${avisos.length}</span>
        </div>
        <div class="mural-container">`;

        avisos.forEach(aviso => {
            const dataEvento = new Date(aviso.data_evento);
            const hoje = new Date();
            const diffTime = dataEvento - hoje;
            const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let tagTexto = `Faltam ${diffDias} dias`;
            let tagClass = '';
            
            if (diffDias <= 0) { tagTexto = "HOJE"; tagClass = "tag-urgente"; }
            else if (diffDias === 1) { tagTexto = "AMANHÃ"; tagClass = "tag-urgente"; }
            
            const diaMes = dataEvento.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});

            html += `
            <div class="aviso-card prio-${aviso.prioridade}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="aviso-tag ${tagClass}">${tagTexto}</span>
                    <span style="font-size:0.7rem; color:#666;">${diaMes}</span>
                </div>
                <div class="aviso-titulo">${aviso.titulo}</div>
                <div class="aviso-meta">📍 ${aviso.local || 'Paróquia'}</div>
            </div>`;
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="color:red; font-size:0.8rem;">Erro ao carregar mural.</div>';
    }
}

// ==========================================================================
// 3. CALENDÁRIO & FILTROS
// ==========================================================================
async function carregarMes(ano, mes) {
    const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", { month: "long" });
    document.querySelector(".month-name").textContent = `${nomeMes} ${ano}`;

    const grid = document.querySelector(".calendar-wrapper");
    const headersMatch = grid.innerHTML.match(/<div class="day-header">.*?<\/div>/g);
    const headers = headersMatch ? headersMatch.join("") : ''; 
    
    grid.innerHTML = headers + '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;">Carregando...</div>';

    try {
        const eventos = await window.api.buscarEventos(ano, mes);
        ESTADO.dadosEventos = {};
        eventos.forEach((ev) => (ESTADO.dadosEventos[ev.data] = ev));
        renderizarGrid(ano, mes, grid, headers);
        aplicarFiltrosVisuais();
    } catch (erro) {
        console.error(erro);
        grid.innerHTML = headers + '<div style="padding:20px; color:red;">Erro de conexão.</div>';
    }
}

function renderizarGrid(ano, mes, gridElement, headersHTML) {
    let html = headersHTML;
    const primeiroDia = new Date(ano, mes - 1, 1).getDay();
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const ultimoDiaMesAnt = new Date(ano, mes - 1, 0).getDate();

    for (let i = primeiroDia - 1; i >= 0; i--) {
        const dia = ultimoDiaMesAnt - i;
        html += `<div class="day-cell other-month"><span class="day-number">${dia}</span></div>`;
    }

    for (let dia = 1; dia <= ultimoDia; dia++) {
        const dataISO = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        const evento = ESTADO.dadosEventos[dataISO];
        let conteudoHTML = "";
        let clickAttr = `onclick="abrirModal('${dataISO}')"`;

        if (evento) {
            let corHex = evento.liturgia_cores?.hex_code || "#2E7D32";
            if (corHex.toLowerCase() === "#ffffff") corHex = "#cccccc";

            const classeSolenidade = evento.is_solenidade ? "solenidade" : "";
            const estiloPill = `border-left: 3px solid ${corHex}; background-color: var(--cor-vinho);`;

            conteudoHTML = `<div class="pill ${classeSolenidade}" style="${estiloPill}">${evento.titulo}</div>`;

            if (evento.escalas && evento.escalas.length > 0) {
                evento.escalas.forEach((esc) => {
                    const hora = esc.hora_celebracao.substring(0, 5);
                    conteudoHTML += `<div class="pill" style="background-color:#f0f0f0; color:#333; border-left:3px solid #ccc">${hora} Missa</div>`;
                });
            }
        }
        html += `<div class="day-cell" data-iso="${dataISO}" ${clickAttr}><span class="day-number">${dia}</span>${conteudoHTML}</div>`;
    }

    const totalCelulas = primeiroDia + ultimoDia;
    const resto = totalCelulas % 7;
    if (resto !== 0) {
        for (let i = 1; i <= 7 - resto; i++) {
            html += `<div class="day-cell other-month"><span class="day-number">${i}</span></div>`;
        }
    }
    gridElement.innerHTML = html;
}

// --- FILTROS ---
async function inicializarSidebar() {
    const containerEquipes = document.getElementById('filtro-equipes');
    if (!containerEquipes) return;

    containerEquipes.innerHTML = `<h3>FILTRAR POR EQUIPE</h3>
        <div class="filter-item" onclick="limparFiltros()">
            <span class="checkbox-custom checked" id="check-all"></span> <strong>TODAS AS EQUIPES</strong>
        </div>`;

    ESTADO.listaEquipes.forEach(eq => {
        const div = document.createElement('div');
        div.className = 'filter-item';
        div.addEventListener('click', function() { window.toggleFiltro(eq.id, this); });
        div.innerHTML = `<span class="checkbox-custom" data-id="${eq.id}"></span> ${eq.nome_equipe}`;
        containerEquipes.appendChild(div);
    });
}

window.toggleFiltro = function(equipeId, divElement) {
    const check = divElement.querySelector('.checkbox-custom');
    const checkAll = document.getElementById('check-all');

    if (ESTADO.filtrosAtivos.has(equipeId)) {
        ESTADO.filtrosAtivos.delete(equipeId);
        check.classList.remove('checked');
    } else {
        ESTADO.filtrosAtivos.add(equipeId);
        check.classList.add('checked');
    }

    if (ESTADO.filtrosAtivos.size === 0) { checkAll.classList.add('checked'); } 
    else { checkAll.classList.remove('checked'); }
    aplicarFiltrosVisuais();
};

window.limparFiltros = function() {
    ESTADO.filtrosAtivos.clear();
    document.querySelectorAll('.filter-item .checkbox-custom').forEach(el => {
        if(el.id !== 'check-all') el.classList.remove('checked');
    });
    document.getElementById('check-all').classList.add('checked');
    aplicarFiltrosVisuais();
};

function aplicarFiltrosVisuais() {
    const celulas = document.querySelectorAll('.day-cell:not(.other-month)');
    
    if (ESTADO.filtrosAtivos.size === 0) {
        celulas.forEach(cel => cel.classList.remove('hidden-by-filter', 'highlight-filter'));
        return;
    }

    celulas.forEach(cel => {
        const dataISO = cel.getAttribute('data-iso');
        const evento = ESTADO.dadosEventos[dataISO];
        let match = false;

        if (evento && evento.escalas) {
            for (let esc of evento.escalas) {
                const idLeit = esc.equipe_leitura?.id || esc.equipe_leitura_id;
                const idCant = esc.equipe_canto?.id || esc.equipe_canto_id;
                if (ESTADO.filtrosAtivos.has(idLeit) || ESTADO.filtrosAtivos.has(idCant)) {
                    match = true;
                    break;
                }
            }
        }

        if (match) {
            cel.classList.remove('hidden-by-filter');
            cel.classList.add('highlight-filter');
        } else {
            cel.classList.add('hidden-by-filter');
            cel.classList.remove('highlight-filter');
        }
    });
}

// ==========================================================================
// 4. MODAL
// ==========================================================================
window.abrirModal = function (dataISO) {
    let evento = ESTADO.dadosEventos[dataISO];

    if (!evento) {
        evento = { id: null, data: dataISO, titulo: "Dia sem Evento", tempo_liturgico: "Paroquial", liturgia_cores: { hex_code: "#CCCCCC" }, escalas: [] };
    }

    eventoEmEdicao = JSON.parse(JSON.stringify(evento));
    const modalContent = document.getElementById("modalContent");
    const modalOverlay = document.getElementById("modalOverlay");

    const dataObj = new Date(dataISO + "T12:00:00");
    const diaNum = dataObj.getDate();
    const mesNome = dataObj.toLocaleString("pt-BR", { month: "short" }).toUpperCase().replace(".", "");
    const diaSemana = dataObj.toLocaleString("pt-BR", { weekday: "long" });

    let corHex = evento.liturgia_cores?.hex_code || "#ccc";
    let corTxt = corHex;
    if (corHex.toLowerCase() === "#ffffff") { corHex = "#ccc"; corTxt = "#666"; }

    const conteudoHTML = gerarHTMLLeitura(evento);

    let btnAdmin = "";
    if (ESTADO.isAdmin) {
        btnAdmin = `<button id="btnEditar" class="btn-admin-action">🛠️ GERENCIAR AGENDA</button>`;
    }

    modalContent.innerHTML = `
    <div class="modal-card">
        <button class="btn-close" onclick="fecharModalForce()" aria-label="Fechar">×</button>
        <div class="modal-sidebar-color" style="background-color: ${corHex}"></div>
        <div class="modal-body" id="modalBody">
            <div class="modal-header">
                <div><span class="modal-day">${diaNum}</span><span class="modal-month">${mesNome}</span></div>
                <div class="modal-meta"><div class="modal-weekday">${diaSemana}</div></div>
            </div>
            <div id="areaConteudo">
                <div class="modal-liturgia" style="color:${corTxt}">${evento.tempo_liturgico}</div>
                <div class="modal-titulo">${evento.titulo}</div>
                <div class="escala-list">${conteudoHTML}</div>
            </div>
            ${btnAdmin}
        </div>
    </div>`;

    modalOverlay.classList.add("active");
    if (ESTADO.isAdmin) { document.getElementById('btnEditar').onclick = () => ativarModoEdicao(evento); }
};

function gerarHTMLLeitura(evento) {
    if (!evento.escalas || evento.escalas.length === 0) {
        return '<div style="color:#999; font-style:italic; padding:10px;">Nenhuma celebração agendada.</div>';
    }
    return evento.escalas.map((esc) => {
        const leit = esc.equipe_leitura?.nome_equipe || "-";
        const cant = esc.equipe_canto?.nome_equipe || "-";
        const hora = esc.hora_celebracao.substring(0, 5);
        return `
        <div class="escala-item">
            <div class="escala-hora">${hora}</div>
            <div class="escala-equipes">
                <div class="equipe-row">${ICONS.leitura} <span class="equipe-label">Leitura</span> <strong>${leit}</strong></div>
                <div class="equipe-row">${ICONS.canto} <span class="equipe-label">Canto</span> <strong>${cant}</strong></div>
            </div>
        </div>`;
    }).join("");
}

// ==========================================================================
// 5. EDITOR (ADMIN)
// ==========================================================================
function ativarModoEdicao(evento) {
    const area = document.getElementById("areaConteudo");
    const btnEditar = document.getElementById("btnEditar");
    if (btnEditar) btnEditar.style.display = "none";

    // Valores Iniciais
    const tituloVal = evento.titulo || "";
    const tipoCompromisso = evento.tipo_compromisso || "liturgia";
    const localVal = evento.local || "";
    const respVal = evento.responsavel || "";
    
    // HTML do Formulário
    let html = `
        <h3 style="color:var(--cor-vinho); margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:5px;">Editar Agenda</h3>
        
        <div style="background:#fff; padding:15px; border-radius:8px; border:1px solid #e0e0e0; margin-bottom:15px;">
            <!-- SELETOR DE TIPO -->
            <label style="font-size:0.7rem; font-weight:bold; color:#888;">TIPO DE COMPROMISSO</label>
            <select id="editTipoComp" onchange="toggleCamposEditor()" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px; margin-bottom:15px; background:#f9f9f9; font-weight:bold;">
                <option value="liturgia" ${tipoCompromisso==='liturgia'?'selected':''}>✝️ Celebração Litúrgica / Missa</option>
                <option value="reuniao" ${tipoCompromisso==='reuniao'?'selected':''}>👥 Reunião / Encontro</option>
                <option value="evento" ${tipoCompromisso==='evento'?'selected':''}>🎉 Evento / Festa</option>
                <option value="atendimento" ${tipoCompromisso==='atendimento'?'selected':''}>🗣️ Atendimento do Padre</option>
            </select>

            <label style="font-size:0.7rem; font-weight:bold; color:#888;">TÍTULO</label>
            <input type="text" id="editTitulo" value="${tituloVal}" placeholder="Ex: Missa ou Reunião do CPP" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px; font-weight:bold; font-size:1rem; margin-bottom:10px;">

            <!-- CAMPOS EXCLUSIVOS DE REUNIÃO/EVENTO (Inicialmente ocultos se for liturgia) -->
            <div id="campos-extras" style="display:none; grid-template-columns: 1fr 1fr; gap:10px;">
                <div>
                    <label style="font-size:0.7rem; font-weight:bold; color:#888;">LOCAL</label>
                    <input type="text" id="editLocal" value="${localVal}" placeholder="Ex: Salão" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                </div>
                <div>
                    <label style="font-size:0.7rem; font-weight:bold; color:#888;">RESPONSÁVEL</label>
                    <input type="text" id="editResp" value="${respVal}" placeholder="Ex: Coord. Maria" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                </div>
            </div>

            <!-- CAMPOS EXCLUSIVOS DE LITURGIA -->
            <div id="campos-liturgia">
                <!-- (Aqui vem os selects de Cor, Tempo, Solenidade que já tínhamos) -->
                ${gerarCamposLiturgia(evento)}
            </div>
        </div>

        <!-- ÁREA DE ESCALAS (Só aparece se for Liturgia) -->
        <div id="area-escalas">
            <h4 style="color:#666; font-size:0.9rem; margin-bottom:10px;">Escalas e Horários</h4>
            <div id="listaEditor" style="display:flex; flex-direction:column; gap:15px;">
                ${gerarListaEscalasIniciais(evento)}
            </div>
            <button onclick="adicionarNovaEscala()" style="margin-top:15px; background:#f0f0f0; border:1px dashed #ccc; padding:10px; width:100%; border-radius:6px; cursor:pointer; font-weight:bold; color:#555;">➕ Adicionar Horário</button>
        </div>

        <!-- BOTÕES -->
        <div style="margin-top:25px; display:flex; gap:10px;">
            <button onclick="salvarEdicoes()" style="flex:1; background:var(--cor-verde); color:#fff; border:none; padding:12px; border-radius:6px; font-weight:bold; cursor:pointer;">💾 SALVAR</button>
            <button onclick="fecharModalForce()" style="background:#eee; border:none; padding:12px 20px; border-radius:6px; cursor:pointer; color:#555;">Cancelar</button>
        </div>
    `;

    area.innerHTML = htmlEditor;
    
    // Ativa a lógica visual inicial
    window.toggleCamposEditor();
}

// Helpers para limpar o código principal
function gerarCamposLiturgia(evento) {
    const tempoVal = evento.tempo_liturgico || "Paroquial";
    const corAtualId = evento.cor_id || 1;
    const tempos = ["Tempo Comum", "Advento", "Tempo do Natal", "Quaresma", "Semana Santa", "Tríduo Pascal", "Tempo Pascal", "Paroquial"];
    const optionsTempo = tempos.map(t => `<option value="${t}" ${t===tempoVal?'selected':''}>${t}</option>`).join('');

    return `
    <div style="display:flex; gap:10px; margin-bottom:10px;">
        <div style="flex:1;">
            <label style="font-size:0.7rem; font-weight:bold; color:#888;">TEMPO LITÚRGICO</label>
            <select id="editTempo" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">${optionsTempo}</select>
        </div>
        <div style="flex:1;">
            <label style="font-size:0.7rem; font-weight:bold; color:#888;">TIPO</label>
            <select id="editTipo" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                <option value="comum" ${!evento.is_solenidade?'selected':''}>Comum</option>
                <option value="solenidade" ${evento.is_solenidade?'selected':''}>Solenidade</option>
            </select>
        </div>
    </div>
    <div>
        <label style="font-size:0.7rem; font-weight:bold; color:#888;">COR</label>
        <select id="editCor" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            <option value="1" ${corAtualId==1?'selected':''}>Verde</option>
            <option value="2" ${corAtualId==2?'selected':''}>Branco</option>
            <option value="3" ${corAtualId==3?'selected':''}>Vermelho</option>
            <option value="4" ${corAtualId==4?'selected':''}>Roxo</option>
            <option value="5" ${corAtualId==5?'selected':''}>Rosa</option>
        </select>
    </div>`;
}

function gerarListaEscalasIniciais(evento) {
    if (!evento.escalas) return '';
    let html = '';
    evento.escalas.forEach((esc, index) => {
        html += gerarLinhaEditor(esc, index);
    });
    return html;
}

// Lógica de Toggle (Show/Hide)
window.toggleCamposEditor = function() {
    const tipo = document.getElementById('editTipoComp').value;
    const divLiturgia = document.getElementById('campos-liturgia');
    const divExtras = document.getElementById('campos-extras');
    const divEscalas = document.getElementById('area-escalas');

    if (tipo === 'liturgia') {
        divLiturgia.style.display = 'block';
        divEscalas.style.display = 'block';
        divExtras.style.display = 'none';
    } else {
        // Modo Reunião/Evento
        divLiturgia.style.display = 'none';
        divEscalas.style.display = 'none'; // Esconde escalas pois reunião não tem canto/leitura
        divExtras.style.display = 'grid'; // Mostra Local/Responsável
    }
};
window.salvarEdicoes = async function () {
    const tipoComp = document.getElementById("editTipoComp").value;
    const novoTitulo = document.getElementById("editTitulo").value;
    
    if (!novoTitulo) { alert("Informe o Título!"); return; }

    // Objeto Base
    const dadosEvento = {
        id: eventoEmEdicao.id,
        data: eventoEmEdicao.data,
        titulo: novoTitulo,
        tipo_compromisso: tipoComp,
        // Campos Extras (só salva se não for liturgia, ou salva vazio)
        local: tipoComp !== 'liturgia' ? document.getElementById("editLocal").value : null,
        responsavel: tipoComp !== 'liturgia' ? document.getElementById("editResp").value : null,
        
        // Campos Litúrgicos (Default se for reunião)
        tempo_liturgico: tipoComp === 'liturgia' ? document.getElementById("editTempo").value : 'Paroquial',
        cor_id: tipoComp === 'liturgia' ? parseInt(document.getElementById("editCor").value) : 1, // 1=Verde (neutro)
        is_solenidade: tipoComp === 'liturgia' ? (document.getElementById("editTipo").value === "solenidade") : false,
        is_festa: false,
    };

    // Escalas (Só coleta se for Liturgia)
    const novasEscalas = [];
    if (tipoComp === 'liturgia') {
        const linhas = document.querySelectorAll(".editor-row");
        linhas.forEach((row) => {
            const hora = row.querySelector(".edit-hora").value;
            const leit = row.querySelector(".edit-leitura").value || null;
            const cant = row.querySelector(".edit-canto").value || null;
            if (hora) novasEscalas.push({ hora_celebracao: hora, equipe_leitura_id: leit, equipe_canto_id: cant });
        });
    }

    try {
        document.getElementById("areaConteudo").innerHTML = '<div style="text-align:center; padding:40px;">💾 Salvando...</div>';
        
        // Reusa a mesma função da API (ela já está pronta para receber campos extras se o objeto tiver)
        await window.api.salvarEventoCompleto(dadosEvento, novasEscalas);
        
        alert("✅ Salvo com sucesso!");
        fecharModalForce();
        carregarMes(ESTADO.anoAtual, ESTADO.mesAtual);
    } catch (err) {
        alert("Erro: " + err.message);
        console.error(err);
        fecharModalForce();
    }
};

// ==========================================================================
// 6. RELATÓRIO DE IMPRESSÃO
// ==========================================================================
window.prepararImpressao = function() {
    const tbody = document.getElementById('print-table-body');
    const title = document.getElementById('print-month-title');
    title.textContent = document.querySelector('.month-name').textContent;
    tbody.innerHTML = ''; 

    const listaEventos = Object.values(ESTADO.dadosEventos).sort((a, b) => a.data.localeCompare(b.data));
    let html = '';
    listaEventos.forEach(ev => {
        if ((!ev.escalas || ev.escalas.length === 0) && !ev.is_solenidade) return;
        const dateObj = new Date(ev.data + 'T12:00:00');
        const dia = dateObj.getDate().toString().padStart(2, '0');
        const sem = dateObj.toLocaleString('pt-BR', { weekday: 'short' }).toUpperCase();

        let escalasHTML = '';
        if (ev.escalas && ev.escalas.length > 0) {
            ev.escalas.forEach(esc => {
                const hora = esc.hora_celebracao.substring(0, 5);
                const leit = esc.equipe_leitura?.nome_equipe || '-';
                const cant = esc.equipe_canto?.nome_equipe || '-';
                escalasHTML += `
                <div class="print-escala-row">
                    <span class="print-hora">${hora}</span>
                    <span class="print-equipes"><strong>📖 ${leit}</strong> • 🎵 ${cant}</span>
                </div>`;
            });
        } else {
            escalasHTML = '<span style="color:#999; font-style:italic">Sem escalas</span>';
        }
        const rowClass = ev.is_solenidade ? 'row-solenidade' : '';
        html += `
        <tr class="${rowClass}">
            <td class="col-data"><span class="dia-grande">${dia}</span><span class="dia-sem">${sem}</span></td>
            <td class="col-evento"><div class="print-titulo">${ev.titulo}</div><div class="print-liturgia">${ev.tempo_liturgico}</div></td>
            <td class="col-escalas">${escalasHTML}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
    setTimeout(() => window.print(), 300); 
};

// ==========================================================================
// 7. UTILS
// ==========================================================================
function adicionarBotaoLogout() {
    const header = document.querySelector("header");
    const div = document.createElement("div");
    div.style.position = "absolute"; div.style.right = "20px";
    div.innerHTML = `<button onclick="window.api.logout()" style="background:rgba(255,255,255,0.2); border:1px solid #fff; color:#fff; padding:5px 12px; border-radius:20px; cursor:pointer; font-size:0.8rem;">Sair</button>`;
    header.appendChild(div);
}

function configurarBotoesNavegacao() {
    const btns = document.querySelectorAll(".btn-nav");
    btns[0].onclick = () => { ESTADO.mesAtual--; if (ESTADO.mesAtual < 1) { ESTADO.mesAtual = 12; ESTADO.anoAtual--; } carregarMes(ESTADO.anoAtual, ESTADO.mesAtual); };
    btns[1].onclick = () => { ESTADO.anoAtual = 2026; ESTADO.mesAtual = 1; carregarMes(ESTADO.anoAtual, ESTADO.mesAtual); };
    btns[2].onclick = () => { ESTADO.mesAtual++; if (ESTADO.mesAtual > 12) { ESTADO.mesAtual = 1; ESTADO.anoAtual++; } carregarMes(ESTADO.anoAtual, ESTADO.mesAtual); };
}

window.fecharModal = (e) => { if (e.target.id === "modalOverlay") fecharModalForce(); };
window.fecharModalForce = () => { document.getElementById("modalOverlay").classList.remove("active"); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharModalForce(); });

// Menu Mobile
window.toggleSidebarMobile = function() {
    document.querySelector('.sidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
};