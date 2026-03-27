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
                this.allEmployees = await this.fetchData('funcionarios');
                this.allEpis = await this.fetchData('epis');
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
                        options: this.allEmployees.map(e => ({ value: e.id, label: e.nome, sector: e.setor_id })) 
                    },
                    { name: 'tipo', label: 'Tipo de Ocorrência', type: 'select', options: ['INFRACAO', 'CONFORMIDADE'] },
                    { name: 'data_hora', label: 'Data/Hora', type: 'datetime-local' }
                ]);
                break;
            case 'gen_pdf':
                this.renderGenPDF();
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
                    <div class="tab" onclick="app.toggleTab('bulk-delete')">Remover Em Massa</div>
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
                        <div class="form-group" id="gen-count-group">
                            <label>Quantidade à Gerar</label>
                            <input type="number" id="gen-count" value="10" min="1" max="500">
                        </div>
                        ${table === 'ocorrencias' ? `
                        <div class="form-group" style="grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; margin-bottom: 1rem;">
                            <input type="checkbox" id="gen-random-mode" onchange="app.toggleRandomFields(this.checked)" style="width: auto; cursor: pointer;">
                            <label for="gen-random-mode" style="margin: 0; cursor: pointer; color: var(--accent); font-weight: 600;">Usar Parâmetros Aleatórios (Data e Quantidade)</label>
                        </div>
                        <div class="form-group gen-random-field" style="display: none;">
                            <label>Data Inicial</label>
                            <input type="date" id="gen-date-start">
                        </div>
                        <div class="form-group gen-random-field" style="display: none;">
                            <label>Data Final</label>
                            <input type="date" id="gen-date-end">
                        </div>
                        <div class="form-group gen-random-field" style="display: none;">
                            <label>Quantidade Mínima</label>
                            <input type="number" id="gen-min" value="10">
                        </div>
                        <div class="form-group gen-random-field" style="display: none;">
                            <label>Quantidade Máxima</label>
                            <input type="number" id="gen-max" value="30">
                        </div>
                        
                        ${table === 'ocorrencias' && this.allEpis ? `
                        <div class="form-group gen-random-field" style="display: none; grid-column: 1 / -1;">
                            <label style="color: var(--secondary); margin-bottom: 1rem;">Distribuição de Infrações por EPI (%)</label>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
                                ${this.allEpis.filter(e => e.status === 'ATIVO').map(e => `
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <input type="checkbox" class="gen-epi-toggle" data-id="${e.id}" style="width: auto;" onchange="this.nextElementSibling.nextElementSibling.disabled = !this.checked">
                                        <span style="font-size: 0.9rem; flex: 1;">${e.nome}</span>
                                        <input type="number" class="gen-epi-weight" data-id="${e.id}" value="0" min="0" max="100" style="width: 60px;" disabled>
                                        <span style="font-size: 0.8rem; color: var(--text-dim)">%</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="form-group gen-random-field" style="display: none;">
                            <label>Filtrar Funcionários por:</label>
                            <select id="gen-scope-sector">
                                <option value="">Toda a Empresa</option>
                                ${this.lastSectors.map(s => `<option value="${s.id}">${s.nome}</option>`).join('')}
                            </select>
                        </div>
                        ` : ''}
                        ` : ''}
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
                    <button onclick="app.generateAndSubmit('${table}', ${JSON.stringify(fields).replace(/\"/g, '&quot;')})" class="accent-btn" style="background: var(--accent); color: white;">
                        Gerar e Inserir Dados
                    </button>
                </div>

                <div id="tab-bulk-delete" class="tab-content" style="display: none;">
                    <div class="form-grid">
                        <div class="form-group" style="grid-column: 1 / -1">
                            <label>Quantidade de Registros Recentes a Remover</label>
                            <input type="number" id="bulk-delete-count" value="10" min="1">
                            <p style="color: var(--text-dim); margin-top: 0.5rem; font-size: 0.9rem;">
                                Esta ação removerá de forma irreversível os últimos N registros (do último para o primeiro).
                            </p>
                        </div>
                    </div>
                    <button onclick="app.submitBulkDelete('${table}')" class="secondary" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); margin-top: 1rem;">
                        Remover Registros
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

    toggleRandomFields(checked) {
        const fields = document.querySelectorAll('.gen-random-field');
        const countGroup = document.getElementById('gen-count-group');
        fields.forEach(f => f.style.display = checked ? 'block' : 'none');
        countGroup.style.display = checked ? 'none' : 'block';
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

    async submitBulkDelete(table) {
        const countStr = document.getElementById('bulk-delete-count').value;
        const count = parseInt(countStr);
        if (isNaN(count) || count < 1) {
            return alert('Quantidade inválida.');
        }

        if (!confirm(`Deseja realmente excluir irreversivelmente os últimos ${count} registros de ${table}?`)) return;

        try {
            const res = await fetch(`${this.apiBase}?action=bulk_delete_recent&table=${table}`, {
                method: 'POST',
                body: JSON.stringify({ count: count })
            });
            const result = await res.json();
            alert(result.message);
            if (result.status === 'success') {
                this.loadList(table);
            }
        } catch (e) {
            alert('Erro ao excluir: ' + e.message);
        }
    },

    async generateAndSubmit(table, fields) {
        const isRandom = document.getElementById('gen-random-mode')?.checked;
        let count;

        let dateStart, dateEnd;
        let epiWeights = [];
        let scopeSector = '';

        if (isRandom) {
            const minCount = parseInt(document.getElementById('gen-min').value) || 10;
            const maxCount = parseInt(document.getElementById('gen-max').value) || 30;
            count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
            
            dateStart = new Date(document.getElementById('gen-date-start').value || new Date());
            dateEnd = new Date(document.getElementById('gen-date-end').value || new Date());
            if (dateStart > dateEnd) [dateStart, dateEnd] = [dateEnd, dateStart];

            if (table === 'ocorrencias') {
                scopeSector = document.getElementById('gen-scope-sector')?.value;
                document.querySelectorAll('.gen-epi-toggle:checked').forEach(cb => {
                    const id = cb.getAttribute('data-id');
                    const weight = parseInt(document.querySelector(`.gen-epi-weight[data-id="${id}"]`).value) || 0;
                    if (weight > 0) epiWeights.push({ id, weight });
                });
            }
        } else {
            count = parseInt(document.getElementById('gen-count').value);
        }

        if (isNaN(count) || count < 1) return alert('Quantidade inválida');

        // Filter employees pool
        let employeesPool = this.allEmployees || [];
        if (isRandom && scopeSector) {
            employeesPool = employeesPool.filter(e => e.setor_id == scopeSector);
        }
        if (employeesPool.length === 0 && table === 'ocorrencias') {
            return alert('Nenhum funcionário encontrado para o filtro selecionado.');
        }

        const fixedSector = document.getElementById('gen-setor-id')?.value;

        const data = [];
        for (let i = 1; i <= count; i++) {
            const row = {};
            let selectedEpiIds = [];

            fields.forEach(f => {
                if (f.name === 'setor_filter') return;

                if (f.name === 'nome' || f.name === 'usuario') {
                    row[f.name] = `${f.label} ${i}`;
                } else if (f.name === 'setor_id' && fixedSector) {
                    row[f.name] = fixedSector;
                } else if (isRandom && f.name === 'funcionario_id' && employeesPool.length > 0) {
                    const randomEmp = employeesPool[Math.floor(Math.random() * employeesPool.length)];
                    row[f.name] = randomEmp.id;
                } else if (f.type === 'select') {
                    const firstOpt = f.options[0];
                    row[f.name] = typeof firstOpt === 'object' ? firstOpt.value : firstOpt;
                } else if (f.type === 'datetime-local') {
                    if (isRandom && dateStart && dateEnd) {
                        const randomTime = dateStart.getTime() + Math.random() * (dateEnd.getTime() - dateStart.getTime());
                        const randomDate = new Date(randomTime);
                        row[f.name] = randomDate.toISOString().slice(0, 19).replace('T', ' ');
                    } else {
                        row[f.name] = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    }
                } else if (f.name === 'senha') {
                    row[f.name] = '123456';
                } else if (f.name === 'sigla') {
                    row[f.name] = `S${i}`;
                } else {
                    row[f.name] = (f.label || f.name) + " " + i;
                }
            });

            // Handle Weighted EPI selection for Infractions
            if (isRandom && table === 'ocorrencias' && row.tipo === 'INFRACAO' && epiWeights.length > 0) {
                const totalWeight = epiWeights.reduce((sum, w) => sum + w.weight, 0);
                let random = Math.random() * totalWeight;
                for (const ew of epiWeights) {
                    if (random < ew.weight) {
                        selectedEpiIds = [ew.id];
                        break;
                    }
                    random -= ew.weight;
                }
                row.epi_ids = selectedEpiIds;
            }

            data.push(row);
        }

        const action = (table === 'ocorrencias' && isRandom) ? 'bulk_create_ocorrencias' : 'bulk_create';
        const res = await fetch(`${this.apiBase}?action=${action}&table=${table}`, {
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
    },

    // ===== PDF GENERATION =====

    _pdfFirstNames: [
        'João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Lucas', 'Fernanda',
        'Rafael', 'Camila', 'Bruno', 'Larissa', 'Diego', 'Patrícia', 'Gustavo',
        'Amanda', 'Felipe', 'Beatriz', 'Thiago', 'Letícia', 'André', 'Gabriela',
        'Rodrigo', 'Vanessa', 'Marcelo', 'Tatiana', 'Leonardo', 'Priscila',
        'Ricardo', 'Daniela', 'Eduardo', 'Renata', 'Fabio', 'Aline', 'Henrique',
        'Mariana', 'Vinícius', 'Raquel', 'Matheus', 'Carolina', 'Leandro',
        'Sandra', 'Ronaldo', 'Débora', 'Paulo', 'Isabela', 'Sérgio', 'Natália',
        'Roberto', 'Cláudia', 'Antônio', 'Cristina', 'José', 'Luciana', 'Francisco',
        'Adriana', 'Marcos', 'Simone', 'Luiz', 'Elaine'
    ],

    _pdfLastNames: [
        'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
        'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
        'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha',
        'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado',
        'Mendes', 'Freitas', 'Cardoso', 'Ramos', 'Gonçalves', 'Santana', 'Teixeira',
        'Araújo', 'Pinto', 'Correia', 'Monteiro', 'Batista'
    ],

    generateRandomName() {
        const first = this._pdfFirstNames[Math.floor(Math.random() * this._pdfFirstNames.length)];
        const last1 = this._pdfLastNames[Math.floor(Math.random() * this._pdfLastNames.length)];
        const last2 = this._pdfLastNames[Math.floor(Math.random() * this._pdfLastNames.length)];
        return `${first} ${last1} ${last2}`;
    },

    generateRandomCPF() {
        const rand = () => Math.floor(Math.random() * 10);
        const n = Array.from({ length: 9 }, rand);

        // First check digit
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += n[i] * (10 - i);
        let d1 = 11 - (sum % 11);
        if (d1 >= 10) d1 = 0;
        n.push(d1);

        // Second check digit
        sum = 0;
        for (let i = 0; i < 10; i++) sum += n[i] * (11 - i);
        let d2 = 11 - (sum % 11);
        if (d2 >= 10) d2 = 0;
        n.push(d2);

        return `${n[0]}${n[1]}${n[2]}.${n[3]}${n[4]}${n[5]}.${n[6]}${n[7]}${n[8]}-${n[9]}${n[10]}`;
    },

    renderGenPDF() {
        const container = document.getElementById('app-view');
        container.innerHTML = `
            <div class="glass-card">
                <h1>Gerador de PDF</h1>
                <p style="color: var(--text-dim); margin-bottom: 2rem;">Gere relatórios em PDF com listas de funcionários fictícios contendo ID, nome e CPF aleatórios.</p>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Quantidade de Funcionários</label>
                        <input type="number" id="pdf-count" value="50" min="1" max="1000">
                    </div>
                    <div class="form-group">
                        <label>Título do Relatório</label>
                        <input type="text" id="pdf-title" value="Relatório de Funcionários" placeholder="Título do PDF">
                    </div>
                </div>

                <button onclick="app.downloadEmployeesPDF()" style="margin-top: 1.5rem;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Gerar e Baixar PDF
                </button>

                <div id="pdf-preview" style="margin-top: 3rem;"></div>
            </div>
        `;
    },

    downloadEmployeesPDF() {
        const count = parseInt(document.getElementById('pdf-count').value) || 50;
        const title = document.getElementById('pdf-title').value || 'Relatório de Funcionários';

        if (count < 1 || count > 1000) {
            return alert('Quantidade deve ser entre 1 e 1000.');
        }

        // Generate data
        const rows = [];
        for (let i = 1; i <= count; i++) {
            rows.push([i, this.generateRandomName(), this.generateRandomCPF()]);
        }

        // Build PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text(title, 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}  |  Total: ${count} registros`, 14, 28);

        // Table
        doc.autoTable({
            startY: 35,
            head: [['ID', 'Nome Completo', 'CPF']],
            body: rows,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 45, halign: 'center' }
            }
        });

        doc.save(`funcionarios_${Date.now()}.pdf`);

        // Show preview table on screen
        const preview = document.getElementById('pdf-preview');
        preview.innerHTML = `
            <h2>Prévia dos Dados Gerados</h2>
            <table>
                <thead>
                    <tr><th>ID</th><th>Nome</th><th>CPF</th></tr>
                </thead>
                <tbody>
                    ${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
                </tbody>
            </table>
        `;
    },

    async testQuickOccurrence() {
        try {
            const employees = await this.fetchData('funcionarios');
            if (employees.length === 0) {
                alert('Nenhum funcionário cadastrado. Cadastre um funcionário primeiro.');
                return;
            }

            const emp = employees[0];
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

            const data = {
                funcionario_id: emp.id,
                tipo: 'INFRACAO',
                data_hora: now
            };

            const res = await fetch(`${this.apiBase}?action=create&table=ocorrencias`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            const result = await res.json();
            
            if (result.status === 'success') {
                alert(`Sucesso! Ocorrência registrada para ${emp.nome} às ${new Date().toLocaleTimeString()}.`);
                if (this.currentView === 'ocorrencias') {
                    this.loadList('ocorrencias');
                }
            } else {
                alert('Erro ao registrar: ' + result.message);
            }
        } catch (e) {
            alert('Erro na requisição: ' + e.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
window.app = app;
