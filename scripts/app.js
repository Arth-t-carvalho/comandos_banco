const app = {
    currentView: 'dashboard',
    apiBase: 'api/index.php',

    init() {
        this.navigate('dashboard');
        this.setupSidebar();
    },

    setupSidebar() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelector('.nav-item.active').classList.remove('active');
                e.currentTarget.classList.add('active');
            });
        });
    },

    async navigate(view) {
        this.currentView = view;
        const container = document.getElementById('app-view');
        container.innerHTML = '<div class="glass-card"><h1>Carregando...</h1></div>';

        switch (view) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'init_db':
                this.renderInitDB();
                break;
            case 'setores':
                this.renderForm('setores', [
                    { name: 'nome', label: 'Nome do Setor', type: 'text', placeholder: 'Ex: Logística' },
                    { name: 'sigla', label: 'Sigla', type: 'text', placeholder: 'Ex: LOG' },
                    { name: 'status', label: 'Status', type: 'select', options: ['ATIVO', 'INATIVO'] }
                ]);
                break;
            case 'epis':
                this.renderForm('epis', [
                    { name: 'nome', label: 'Nome do EPI', type: 'text', placeholder: 'Ex: Capacete de Segurança' },
                    { name: 'descricao', label: 'Descrição', type: 'textarea', placeholder: 'Detalhes do equipamento...' },
                    { name: 'status', label: 'Status', type: 'select', options: ['ATIVO', 'INATIVO'] }
                ]);
                break;
            case 'funcionarios':
                this.lastSectors = await this.fetchData('setores');
                this.renderForm('funcionarios', [
                    { name: 'nome', label: 'Nome Completo', type: 'text' },
                    { name: 'setor_id', label: 'Setor', type: 'select', options: this.lastSectors.map(s => ({ value: s.id, label: s.nome })) },
                    { name: 'turno', label: 'Turno', type: 'select', options: ['MANHA', 'TARDE', 'NOITE', 'INTEGRAL'] },
                    { name: 'status', label: 'Status', type: 'select', options: ['ATIVO', 'INATIVO', 'AFASTADO'] }
                ]);
                break;
            case 'usuarios':
                const uSectors = await this.fetchData('setores');
                this.renderForm('usuarios', [
                    { name: 'nome', label: 'Nome Completo', type: 'text' },
                    { name: 'usuario', label: 'Usuário', type: 'text' },
                    { name: 'senha', label: 'Senha', type: 'password' },
                    { name: 'cargo', label: 'Cargo', type: 'select', options: ['SUPER_ADMIN', 'SUPERVISOR', 'GERENTE_SEGURANCA'] },
                    { name: 'setor_id', label: 'Setor Responsável', type: 'select', options: uSectors.map(s => ({ value: s.id, label: s.nome })) },
                    { name: 'turno', label: 'Turno', type: 'select', options: ['MANHA', 'TARDE', 'NOITE', 'INTEGRAL'] },
                    { name: 'status', label: 'Status', type: 'select', options: ['ATIVO', 'INATIVO'] }
                ]);
                break;
            case 'ocorrencias':
                this.lastSectors = await this.fetchData('setores');
                const oEmployees = await this.fetchData('funcionarios');
                this.renderForm('ocorrencias', [
                    { 
                        name: 'setor_filter', 
                        label: 'Filtrar por Setor (Opcional)', 
                        type: 'select', 
                        options: [{value: '', label: 'Todos os Setores'}, ...this.lastSectors.map(s => ({ value: s.id, label: s.nome }))],
                        onchange: (val) => this.filterEmployees(val)
                    },
                    { 
                        name: 'funcionario_id', 
                        label: 'Funcionário', 
                        id: 'occ-emp-select',
                        type: 'select', 
                        options: oEmployees.map(e => ({ value: e.id, label: e.nome, sector: e.setor_id })) 
                    },
                    { name: 'tipo', label: 'Tipo de Ocorrência', type: 'select', options: ['INFRACAO', 'CONFORMIDADE'] },
                    { name: 'data_hora', label: 'Data/Hora', type: 'datetime-local' }
                ]);
                break;
            default:
                container.innerHTML = `<h1>View ${view} não implementada</h1>`;
        }
    },

    async fetchData(table) {
        try {
            const res = await fetch(`${this.apiBase}?action=list&table=${table}`);
            const data = await res.json();
            return data.status === 'success' ? data.data : [];
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    renderDashboard() {
        const container = document.getElementById('app-view');
        container.innerHTML = `
            <div class="glass-card">
                <h1>Painel de Controle</h1>
                <p style="color: var(--text-dim); margin-bottom: 2rem;">Bem-vindo ao sistema de gestão de segurança EPI Guard.</p>
                
                <div class="form-grid">
                    <div class="glass-card" style="padding: 1.5rem; text-align: center;">
                        <h2 id="count-setores" style="color: var(--primary)">--</h2>
                        <span style="font-size: 0.8rem; color: var(--text-dim)">Setores</span>
                    </div>
                    <div class="glass-card" style="padding: 1.5rem; text-align: center;">
                        <h2 id="count-funcionarios" style="color: var(--secondary)">--</h2>
                        <span style="font-size: 0.8rem; color: var(--text-dim)">Funcionários</span>
                    </div>
                    <div class="glass-card" style="padding: 1.5rem; text-align: center;">
                        <h2 id="count-epis" style="color: var(--accent)">--</h2>
                        <span style="font-size: 0.8rem; color: var(--text-dim)">EPIs</span>
                    </div>
                </div>
            </div>
        `;
        // Load counts
        ['setores', 'funcionarios', 'epis'].forEach(async table => {
            const data = await this.fetchData(table);
            document.getElementById(`count-${table}`).innerText = data.length;
        });
    },

    renderInitDB() {
        const container = document.getElementById('app-view');
        container.innerHTML = `
            <div class="glass-card">
                <h1>Configuração Inicial</h1>
                <p>Execute o script de inicialização para preparar as tabelas do banco de dados.</p>
                <div style="margin-top: 2rem;">
                    <button onclick="app.initDatabase()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                        Inicializar Banco de Dados
                    </button>
                    <p id="init-status" style="margin-top: 1rem;"></p>
                </div>
            </div>
        `;
    },

    async initDatabase() {
        const status = document.getElementById('init-status');
        status.innerText = 'Inicializando...';
        try {
            const res = await fetch(`${this.apiBase}?action=init_db`);
            const data = await res.json();
            status.innerText = data.message;
            status.style.color = data.status === 'success' ? 'var(--accent)' : '#ef4444';
        } catch (e) {
            status.innerText = 'Erro na requisição: ' + e.message;
        }
    },

    renderForm(table, fields) {
        const container = document.getElementById('app-view');

        // Form Title & Tabs
        let html = `
            <div class="glass-card">
                <h1>Gestão de ${table.charAt(0).toUpperCase() + table.slice(1)}</h1>
                
                <div class="tabs">
                    <div class="tab active" onclick="app.toggleTab('individual')">Adicionar Um</div>
                    <div class="tab" onclick="app.toggleTab('bulk')">Adicionar Vários</div>
                    <div class="tab" onclick="app.toggleTab('generate')">Gerar Sequencial</div>
                </div>

                <div id="tab-individual" class="tab-content">
                    <form id="form-add" class="form-grid">
                        ${fields.map(f => this.renderField(f)).join('')}
                    </form>
                    <button onclick="app.submitForm('${table}')">Salvar Registro</button>
                </div>

                <div id="tab-bulk" class="tab-content" style="display: none;">
                    <p style="color: var(--text-dim); margin-bottom: 1rem;">Cole um array JSON com os registros abaixo:</p>
                    <textarea id="bulk-json" class="json-input" placeholder='[{"nome": "Exemplo", "status": "ATIVO"}]'></textarea>
                    <button style="margin-top: 1rem;" onclick="app.submitBulk('${table}')" class="secondary">Processar Em Massa</button>
                </div>

                <div id="tab-generate" class="tab-content" style="display: none;">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Quantidade à Gerar</label>
                            <input type="number" id="gen-count" value="10" min="1" max="500">
                        </div>
                        ${table === 'funcionarios' ? `
                        <div class="form-group">
                            <label>Definir Setor para Todos</label>
                            <select id="gen-setor-id">
                                <option value="">Aleatório/Primeiro</option>
                                ${this.lastSectors.map(s => `<option value="${s.id}">${s.nome}</option>`).join('')}
                            </select>
                        </div>
                        ` : ''}
                    </div>
                    <button onclick="app.generateAndSubmit('${table}', ${JSON.stringify(fields).replace(/"/g, '&quot;')})" class="accent-btn" style="background: var(--accent); color: white;">
                        Gerar e Inserir Dados
                    </button>
                </div>

                <div id="records-list" style="margin-top: 3rem;">
                    <h2>Registros Recentes</h2>
                    <div id="list-container">Carregando...</div>
                </div>
            </div>
        `;
        container.innerHTML = html;
        this.loadList(table);
    },

    renderField(f) {
        const onchange = f.onchange ? `onchange="app.${f.name}_change(this.value)"` : '';
        if (f.onchange) {
            this[`${f.name}_change`] = f.onchange;
        }

        if (f.type === 'select') {
            return `
                <div class="form-group">
                    <label>${f.label}</label>
                    <select name="${f.name}" id="${f.id || ''}" ${onchange}>
                        ${f.options.map(opt => {
                            const val = typeof opt === 'object' ? opt.value : opt;
                            const lbl = typeof opt === 'object' ? opt.label : opt;
                            const sectorAttr = opt.sector ? `data-sector="${opt.sector}"` : '';
                            return `<option value="${val}" ${sectorAttr}>${lbl}</option>`;
                        }).join('')}
                    </select>
                </div>
            `;
        }
        if (f.type === 'textarea') {
            return `
                <div class="form-group" style="grid-column: 1 / -1">
                    <label>${f.label}</label>
                    <textarea name="${f.name}" placeholder="${f.placeholder || ''}"></textarea>
                </div>
            `;
        }
        return `
            <div class="form-group">
                <label>${f.label}</label>
                <input type="${f.type}" name="${f.name}" placeholder="${f.placeholder || ''}">
            </div>
        `;
    },

    toggleTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        document.getElementById(`tab-${tab}`).style.display = 'block';
    },

    async submitForm(table) {
        const formData = new FormData(document.getElementById('form-add'));
        const data = Object.fromEntries(formData.entries());
        
        // Remove UI-only fields from database submission
        delete data.setor_filter;

        try {
            const res = await fetch(`${this.apiBase}?action=create&table=${table}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            const result = await res.json();
            alert(result.message);
            if (result.status === 'success') {
                document.getElementById('form-add').reset();
                this.loadList(table);
            }
        } catch (e) {
            alert('Erro ao salvar: ' + e.message);
        }
    },

    async submitBulk(table) {
        const jsonText = document.getElementById('bulk-json').value;
        try {
            const data = JSON.parse(jsonText);
            const res = await fetch(`${this.apiBase}?action=bulk_create&table=${table}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            const result = await res.json();
            alert(result.message);
            if (result.status === 'success') {
                document.getElementById('bulk-json').value = '';
                this.loadList(table);
            }
        } catch (e) {
            alert('Erro no JSON: ' + e.message);
        }
    },

    async generateAndSubmit(table, fields) {
        const count = parseInt(document.getElementById('gen-count').value);
        if (isNaN(count) || count < 1) return alert('Quantidade inválida');

        const fixedSector = document.getElementById('gen-setor-id')?.value;

        const data = [];
        for (let i = 1; i <= count; i++) {
            const row = {};
            fields.forEach(f => {
                // Skip UI-only fields
                if (f.name === 'setor_filter') return;

                if (f.name === 'nome' || f.name === 'usuario') {
                    row[f.name] = `${f.label} ${i}`;
                } else if (f.name === 'setor_id' && fixedSector) {
                    row[f.name] = fixedSector;
                } else if (f.type === 'select') {
                    const firstOpt = f.options[0];
                    row[f.name] = typeof firstOpt === 'object' ? firstOpt.value : firstOpt;
                } else if (f.type === 'datetime-local') {
                    row[f.name] = new Date().toISOString().slice(0, 16);
                } else if (f.name === 'senha') {
                    row[f.name] = '123456';
                } else if (f.name === 'sigla') {
                    row[f.name] = `S${i}`;
                } else {
                    row[f.name] = (f.label || f.name) + " " + i;
                }
            });
            data.push(row);
        }

        const res = await fetch(`${this.apiBase}?action=bulk_create&table=${table}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        alert(result.message);
        if (result.status === 'success') {
            this.loadList(table);
        }
    },

    filterEmployees(sectorId) {
        const select = document.getElementById('occ-emp-select');
        const options = select.querySelectorAll('option');
        let firstVisible = null;

        options.forEach(opt => {
            const sector = opt.getAttribute('data-sector');
            if (!sectorId || sector === sectorId || opt.value === "") {
                opt.style.display = 'block';
                if (!firstVisible && opt.value !== "") firstVisible = opt.value;
            } else {
                opt.style.display = 'none';
            }
        });
        
        if (firstVisible) select.value = firstVisible;
    },

    async deleteRecord(table, id) {
        if (!confirm(`Deseja realmente excluir o registro #${id}? Todos os IDs subsequentes serão reorganizados.`)) return;

        try {
            const res = await fetch(`${this.apiBase}?action=delete&table=${table}&id=${id}`);
            const result = await res.json();
            alert(result.message);
            if (result.status === 'success') {
                this.loadList(table);
            }
        } catch (e) {
            alert('Erro ao excluir: ' + e.message);
        }
    },

    async loadList(table) {
        const container = document.getElementById('list-container');
        const data = await this.fetchData(table);
        if (!data.length) {
            container.innerHTML = '<p>Nenhum registro encontrado.</p>';
            return;
        }

        const keys = Object.keys(data[0]);
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        ${keys.map(k => `<th>${k}</th>`).join('')}
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            ${keys.map(k => `<td>${row[k]}</td>`).join('')}
                            <td>
                                <button class="secondary" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); padding: 0.4rem 0.8rem;" onclick="app.deleteRecord('${table}', ${row.id})">
                                    Excluir
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
window.app = app;
