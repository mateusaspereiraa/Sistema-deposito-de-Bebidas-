const AUTH_KEY = "db_current_user";
const Auth = {
  current() { return JSON.parse(localStorage.getItem(AUTH_KEY) || "{}"); },
  login(name, role) { localStorage.setItem(AUTH_KEY, JSON.stringify({ name, role })); },
  logout() { localStorage.removeItem(AUTH_KEY); },
  can(action) {
    const role = Auth.current().role || "guest";
    if (role === "admin") return true;
    if (role === "vendedor") {
      return ["create_pedido", "create_cliente", "read"].includes(action);
    }
    return action === "read";
  },
};
const Config = {
  get(key) { return JSON.parse(localStorage.getItem(key) || "{}"); },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
};

const KEYS = {
  bebidas: "db_bebidas",
  fornecedores: "db_fornecedores",
  clientes: "db_clientes",
  movimentacoes: "db_movs",
  pedidos: "db_pedidos",
  pagConfig: "db_pag_config",
  fiscalConfig: "db_fiscal_config",
  nfes: "db_nfes",
  theme: "db_theme",
};

const Store = {
  get(key) { return JSON.parse(localStorage.getItem(key) || "[]"); },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  upsert(key, item, idField = "id") {
    const list = Store.get(key);
    const idx = list.findIndex((x) => x[idField] === item[idField]);
    if (idx >= 0) list[idx] = item; else list.push(item);
    Store.set(key, list);
    return item;
  },
  remove(key, id, idField = "id") {
    const list = Store.get(key).filter((x) => x[idField] !== id);
    Store.set(key, list);
  },
};

const Utils = {
  uid(prefix = "id") { return `${prefix}_${Math.random().toString(36).slice(2, 8)}`; },
  fmtCurrency(v) { return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); },
  fmtDate(d) { return new Date(d).toLocaleString("pt-BR"); },
  toDateInput(ts) { const d = new Date(ts || Date.now()); const z = new Date(d.getTime() - d.getTimezoneOffset()*60000); return z.toISOString().slice(0,10); },
};

function seedData() {
  if (Store.get(KEYS.bebidas).length) return;
  const fornecedores = [
    { id: Utils.uid("for"), nome: "Bebidas Brasil", contato: "vendas@bebidasbr.com", telefone: "11 99999-1111" },
    { id: Utils.uid("for"), nome: "Distribuidora Sul", contato: "comercial@distsul.com", telefone: "51 88888-2222" },
  ];
  const clientes = [
    { id: Utils.uid("cli"), nome: "Bar do Zeca", contato: "contato@bardoze.ca", telefone: "21 90909-3333" },
    { id: Utils.uid("cli"), nome: "Mercado Bom Preço", contato: "compras@bompreco.com", telefone: "31 77777-4444" },
  ];
  const bebidas = [
    { id: Utils.uid("beb"), nome: "Cerveja Pilsen", marca: "Beltrano Lager", categoria: "Cerveja", volumeML: 600, preco: 9.9, custo: 6.5, codigoBarras: "789100000001", estoque: 180, estoqueMin: 40, ativo: true, validade: Date.now() + 1000*60*60*24*120, lote: "L001", local: "Prateleira A", fornecedorId: null },
    { id: Utils.uid("beb"), nome: "Refrigerante Cola", marca: "Beltrano Cola", categoria: "Refrigerante", volumeML: 2000, preco: 11.5, custo: 7.2, codigoBarras: "789100000002", estoque: 90, estoqueMin: 30, ativo: true, validade: Date.now() + 1000*60*60*24*240, lote: "L002", local: "Prateleira B", fornecedorId: null },
    { id: Utils.uid("beb"), nome: "Água Mineral", marca: "Beltrano Springs", categoria: "Água", volumeML: 500, preco: 3.2, custo: 1.5, codigoBarras: "789100000003", estoque: 240, estoqueMin: 60, ativo: true, validade: Date.now() + 1000*60*60*24*365, lote: "L003", local: "Prateleira C", fornecedorId: null },
  ];
  const movimentacoes = [
    { id: Utils.uid("mov"), tipo: "entrada", bebidaId: bebidas[0].id, quantidade: 200, valorUnit: 6.5, data: Date.now(), origem: fornecedores[0].id, motivo: "Compra inicial" },
    { id: Utils.uid("mov"), tipo: "saida", bebidaId: bebidas[0].id, quantidade: 20, valorUnit: 9.9, data: Date.now(), destino: clientes[0].id, motivo: "Venda" },
  ];
  const pedidos = [
    { id: Utils.uid("ped"), clienteId: clientes[0].id, itens: [{ bebidaId: bebidas[0].id, nome: bebidas[0].nome, quantidade: 20, preco: 9.9 }], total: 198, status: "faturado", data: Date.now() },
  ];

  Store.set(KEYS.fornecedores, fornecedores);
  Store.set(KEYS.clientes, clientes);
  Store.set(KEYS.bebidas, bebidas);
  Store.set(KEYS.movimentacoes, movimentacoes);
  Store.set(KEYS.pedidos, pedidos);
}

 
const routes = {
  "#/dashboard": renderDashboard,
  "#/bebidas": renderBebidas,
  "#/fornecedores": renderFornecedores,
  "#/clientes": renderClientes,
  "#/estoque": renderEstoque,
  "#/pedidos": renderPedidos,
  "#/relatorios": renderRelatorios,
  "#/config": renderConfig,
  "#/nfc": renderNfc,
};

function setActiveLink() {
  document.querySelectorAll("[data-route]").forEach((a) => a.classList.remove("active"));
  const el = document.querySelector(`[href='${location.hash || "#/dashboard"}']`);
  if (el) el.classList.add("active");
}

function router() {
  const hash = location.hash || "#/dashboard";
  setActiveLink();
  const view = routes[hash];
  const app = document.getElementById("app");
  if (!view) { app.innerHTML = `<div class='card'>Rota não encontrada</div>`; return; }
  app.innerHTML = view();
  bindActions();
}

 
function renderDashboard() {
  const bebidas = Store.get(KEYS.bebidas);
  const pedidos = Store.get(KEYS.pedidos);
  const movs = Store.get(KEYS.movimentacoes);
  const estoqueTotal = bebidas.reduce((acc, b) => acc + (b.estoque * b.custo), 0);
  const receitaTotal = pedidos.reduce((acc, p) => acc + (p.total || 0), 0);
  const lowStock = bebidas.filter((b) => b.estoque <= b.estoqueMin);
  const ultimasVendas = movs.filter((m) => m.tipo === "saida").slice(-5).reverse();

  return `
    <section class="grid cols-3">
      <div class="card">
        <div class="card-title"><span class="pill blue">Estoque (custo)</span></div>
        <div class="kpi">${Utils.fmtCurrency(estoqueTotal)}</div>
        <div class="muted">Valor de custo total em estoque</div>
      </div>
      <div class="card">
        <div class="card-title"><span class="pill green">Receita</span></div>
        <div class="kpi">${Utils.fmtCurrency(receitaTotal)}</div>
        <div class="muted">Receita acumulada de vendas</div>
      </div>
      <div class="card">
        <div class="card-title"><span class="pill red">Bebidas</span></div>
        <div class="kpi">${bebidas.length}</div>
        <div class="muted">Itens cadastrados</div>
      </div>
    </section>

    <section class="grid cols-2" style="margin-top: 12px">
      <div class="card">
        <div class="card-title">
          <strong>Baixo estoque</strong>
        </div>
        ${lowStock.length ? `
          <table class="table">
            <thead><tr><th>Bebida</th><th>Estoque</th><th>Mín.</th></tr></thead>
            <tbody>
              ${lowStock.map(b => `<tr><td>${b.nome}</td><td>${b.estoque}</td><td>${b.estoqueMin}</td></tr>`).join("")}
            </tbody>
          </table>
        ` : `<div class='alert'>Nenhum item em baixo estoque</div>`}
      </div>
      <div class="card">
        <div class="card-title"><strong>Últimas vendas</strong></div>
        ${ultimasVendas.length ? `
          <table class="table">
            <thead><tr><th>Data</th><th>Bebida</th><th>Qtd</th><th>Preço</th></tr></thead>
            <tbody>
              ${ultimasVendas.map(v => {
                const b = Store.get(KEYS.bebidas).find(x => x.id === v.bebidaId); 
                return `<tr><td>${Utils.fmtDate(v.data)}</td><td>${b?.nome || "-"}</td><td>${v.quantidade}</td><td>${Utils.fmtCurrency(v.valorUnit)}</td></tr>`;
              }).join("")}
            </tbody>
          </table>
        ` : `<div class='alert'>Sem vendas registradas</div>`}
      </div>
    </section>
  `;
}

 
function renderBebidas() {
  const list = Store.get(KEYS.bebidas);
  const movs = Store.get(KEYS.movimentacoes);
  return `
    <div class="card">
      <div class="card-title">
        <strong>Bebidas</strong>
        <div class="table-actions">
          <button class="btn btn-primary" id="novaBebidaBtn" ${Auth.can("read") && !Auth.can("create_bebida") ? "disabled" : ""}>Nova bebida</button>
        </div>
      </div>
      <div class="form-grid" style="margin-bottom:12px">
        <div><input id="qBebida" class="input" placeholder="Buscar por nome, marca ou categoria" /></div>
        <div><input id="qCategoria" class="input" placeholder="Filtrar por categoria" /></div>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Nome</th><th>Marca</th><th>Categoria</th><th>Volume</th><th>Preço</th><th>Margem</th><th>Validade</th><th>Entradas</th><th>Saídas</th><th>Estoque</th><th>Última mov.</th><th>Lote</th><th>Local</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${list.map(b => {
            const bm = movs.filter(m => m.bebidaId === b.id);
            const entradas = bm.filter(m => m.tipo === 'entrada').reduce((a,m)=>a+m.quantidade,0);
            const saidas = bm.filter(m => m.tipo === 'saida').reduce((a,m)=>a+m.quantidade,0);
            const last = bm.length ? new Date(bm[bm.length-1].data) : null;
            const days = b.validade ? Math.floor((b.validade - Date.now())/(1000*60*60*24)) : null;
            const valBadge = days===null ? '-' : (days < 0 ? `<span class="pill red">Vencida</span>` : days < 30 ? `<span class="pill red">${days}d</span>` : `<span class="pill green">${days}d</span>`);
            return `
            <tr>
              <td>${b.nome}</td>
              <td>${b.marca}</td>
              <td>${b.categoria}</td>
              <td>${b.volumeML} ml</td>
              <td>${Utils.fmtCurrency(b.preco)}</td>
              <td>${b.preco && b.custo ? Math.round((1 - b.custo / b.preco) * 100) + "%" : "-"}</td>
              <td>${valBadge}</td>
              <td>${entradas}</td>
              <td>${saidas}</td>
              <td>${b.estoque}</td>
              <td>${last ? Utils.fmtDate(last) : '-'}</td>
              <td>${b.lote || '-'}</td>
              <td>${b.local || '-'}</td>
              <td class="table-actions">
                <button class="btn btn-secondary" data-edit="${b.id}" ${Auth.can("read") && !Auth.can("edit_bebida") ? "disabled" : ""}>Editar</button>
                <button class="btn btn-danger" data-del="${b.id}" ${Auth.can("read") && !Auth.can("delete_bebida") ? "disabled" : ""}>Excluir</button>
              </td>
            </tr>
          `;
          }).join("")}
        </tbody>
      </table>
    </div>

    <div class="card" id="bebidaFormCard" style="display:none"></div>
  `;
}

function showBebidaForm(b) {
  const card = document.getElementById("bebidaFormCard");
  card.style.display = "block";
  card.innerHTML = `
    <div class="card-title"><strong>${b ? "Editar" : "Nova"} bebida</strong></div>
    <div class="form-grid">
      <div>
        <label>Nome</label>
        <input id="fNome" class="input" value="${b?.nome || ""}" />
      </div>
      <div>
        <label>Marca</label>
        <input id="fMarca" class="input" value="${b?.marca || ""}" />
      </div>
      <div>
        <label>Categoria</label>
        <input id="fCategoria" class="input" value="${b?.categoria || ""}" />
      </div>
      <div>
        <label>Volume (ml)</label>
        <input id="fVolume" type="number" class="input" value="${b?.volumeML || 0}" />
      </div>
      <div>
        <label>Preço (R$)</label>
        <input id="fPreco" type="number" step="0.01" class="input" value="${b?.preco || 0}" />
      </div>
      <div>
        <label>Custo (R$)</label>
        <input id="fCusto" type="number" step="0.01" class="input" value="${b?.custo || 0}" />
      </div>
      <div>
        <label>Código de barras</label>
        <input id="fCodigo" class="input" value="${b?.codigoBarras || ""}" />
      </div>
      <div>
        <label>Estoque</label>
        <input id="fEstoque" type="number" class="input" value="${b?.estoque || 0}" />
      </div>
      <div>
        <label>Estoque mínimo</label>
        <input id="fEstoqueMin" type="number" class="input" value="${b?.estoqueMin || 0}" />
      </div>
      <div>
        <label>Validade</label>
        <input id="fValidade" type="date" class="input" value="${b?.validade ? Utils.toDateInput(b.validade) : Utils.toDateInput(Date.now())}" />
      </div>
      <div>
        <label>Lote</label>
        <input id="fLote" class="input" value="${b?.lote || ""}" />
      </div>
      <div>
        <label>Local</label>
        <input id="fLocal" class="input" value="${b?.local || ""}" />
      </div>
      <div>
        <label>Ativo</label>
        <select id="fAtivo" class="select">
          <option value="true" ${b?.ativo ? "selected" : ""}>Sim</option>
          <option value="false" ${b && !b.ativo ? "selected" : ""}>Não</option>
        </select>
      </div>
    </div>
    <div style="margin-top:12px; display:flex; gap:8px">
      <button class="btn btn-success" id="salvarBebidaBtn">Salvar</button>
      <button class="btn" id="cancelarBebidaBtn">Cancelar</button>
    </div>
  `;

  document.getElementById("salvarBebidaBtn").onclick = () => {
    if (!Auth.can("edit_bebida") && !Auth.can("create_bebida")) { alert("Sem permissão"); return; }
    const payload = {
      id: b?.id || Utils.uid("beb"),
      nome: document.getElementById("fNome").value.trim(),
      marca: document.getElementById("fMarca").value.trim(),
      categoria: document.getElementById("fCategoria").value.trim(),
      volumeML: +document.getElementById("fVolume").value,
      preco: +document.getElementById("fPreco").value,
      custo: +document.getElementById("fCusto").value,
      codigoBarras: document.getElementById("fCodigo").value.trim(),
      estoque: +document.getElementById("fEstoque").value,
      estoqueMin: +document.getElementById("fEstoqueMin").value,
      validade: new Date(document.getElementById("fValidade").value).getTime(),
      lote: document.getElementById("fLote").value.trim(),
      local: document.getElementById("fLocal").value.trim(),
      ativo: document.getElementById("fAtivo").value === "true",
    };
    if (!payload.nome || !payload.marca) { alert("Informe nome e marca"); return; }
    Store.upsert(KEYS.bebidas, payload);
    router();
  };
  document.getElementById("cancelarBebidaBtn").onclick = () => { card.style.display = "none"; };
}

 
function renderFornecedores() {
  const list = Store.get(KEYS.fornecedores);
  return `
    <div class="card">
      <div class="card-title">
        <strong>Fornecedores</strong>
        <div class="table-actions">
          <button class="btn btn-primary" id="novoFornecedorBtn" ${Auth.can("read") && !Auth.can("edit_bebida") ? "disabled" : ""}>Novo</button>
        </div>
      </div>
      <table class="table">
        <thead><tr><th>Nome</th><th>Contato</th><th>Telefone</th><th></th></tr></thead>
        <tbody>
          ${list.map(f => `
            <tr>
              <td>${f.nome}</td><td>${f.contato}</td><td>${f.telefone}</td>
              <td class="table-actions">
                <button class="btn btn-secondary" data-edit-for="${f.id}" ${Auth.can("read") && !Auth.can("edit_bebida") ? "disabled" : ""}>Editar</button>
                <button class="btn btn-danger" data-del-for="${f.id}" ${Auth.can("read") && !Auth.can("delete_bebida") ? "disabled" : ""}>Excluir</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="card" id="fornecedorFormCard" style="display:none"></div>
  `;
}

function showFornecedorForm(f) {
  const card = document.getElementById("fornecedorFormCard");
  card.style.display = "block";
  card.innerHTML = `
    <div class="card-title"><strong>${f ? "Editar" : "Novo"} fornecedor</strong></div>
    <div class="form-grid">
      <div><label>Nome</label><input id="fnNome" class="input" value="${f?.nome || ""}" /></div>
      <div><label>Contato</label><input id="fnContato" class="input" value="${f?.contato || ""}" /></div>
      <div><label>Telefone</label><input id="fnTel" class="input" value="${f?.telefone || ""}" /></div>
    </div>
    <div style="margin-top:12px; display:flex; gap:8px">
      <button class="btn btn-success" id="salvarFornecedorBtn">Salvar</button>
      <button class="btn" id="cancelarFornecedorBtn">Cancelar</button>
    </div>
  `;
  document.getElementById("salvarFornecedorBtn").onclick = () => {
    if (!Auth.can("edit_bebida")) { alert("Sem permissão"); return; }
    const payload = { id: f?.id || Utils.uid("for"), nome: fnNome.value.trim(), contato: fnContato.value.trim(), telefone: fnTel.value.trim() };
    if (!payload.nome) { alert("Informe o nome"); return; }
    Store.upsert(KEYS.fornecedores, payload);
    router();
  };
  document.getElementById("cancelarFornecedorBtn").onclick = () => { card.style.display = "none"; };
}

 
function renderClientes() {
  const list = Store.get(KEYS.clientes);
  return `
    <div class="card">
      <div class="card-title">
        <strong>Clientes</strong>
        <div class="table-actions">
          <button class="btn btn-primary" id="novoClienteBtn" ${Auth.can("read") && !Auth.can("create_cliente") ? "disabled" : ""}>Novo</button>
        </div>
      </div>
      <table class="table">
        <thead><tr><th>Nome</th><th>Contato</th><th>Telefone</th><th></th></tr></thead>
        <tbody>
          ${list.map(c => `
            <tr>
              <td>${c.nome}</td><td>${c.contato}</td><td>${c.telefone}</td>
              <td class="table-actions">
                <button class="btn btn-secondary" data-edit-cli="${c.id}" ${Auth.can("read") && !Auth.can("create_cliente") ? "disabled" : ""}>Editar</button>
                <button class="btn btn-danger" data-del-cli="${c.id}" ${Auth.can("read") && !Auth.can("delete_bebida") ? "disabled" : ""}>Excluir</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="card" id="clienteFormCard" style="display:none"></div>
  `;
}

function showClienteForm(c) {
  const card = document.getElementById("clienteFormCard");
  card.style.display = "block";
  card.innerHTML = `
    <div class="card-title"><strong>${c ? "Editar" : "Novo"} cliente</strong></div>
    <div class="form-grid">
      <div><label>Nome</label><input id="cnNome" class="input" value="${c?.nome || ""}" /></div>
      <div><label>Contato</label><input id="cnContato" class="input" value="${c?.contato || ""}" /></div>
      <div><label>Telefone</label><input id="cnTel" class="input" value="${c?.telefone || ""}" /></div>
    </div>
    <div style="margin-top:12px; display:flex; gap:8px">
      <button class="btn btn-success" id="salvarClienteBtn">Salvar</button>
      <button class="btn" id="cancelarClienteBtn">Cancelar</button>
    </div>
  `;
  document.getElementById("salvarClienteBtn").onclick = () => {
    if (!Auth.can("create_cliente")) { alert("Sem permissão"); return; }
    const payload = { id: c?.id || Utils.uid("cli"), nome: cnNome.value.trim(), contato: cnContato.value.trim(), telefone: cnTel.value.trim() };
    if (!payload.nome) { alert("Informe o nome"); return; }
    Store.upsert(KEYS.clientes, payload);
    router();
  };
  document.getElementById("cancelarClienteBtn").onclick = () => { card.style.display = "none"; };
}

 
function renderEstoque() {
  const list = Store.get(KEYS.movimentacoes).slice().reverse();
  const bebidas = Store.get(KEYS.bebidas);
  return `
    <div class="card">
      <div class="card-title">
        <strong>Movimentações</strong>
        <div class="table-actions">
          <button class="btn btn-primary" id="novaMovBtn" ${Auth.can("read") ? "" : "disabled"}>Nova movimentação</button>
        </div>
      </div>
      <table class="table">
        <thead><tr><th>Data</th><th>Tipo</th><th>Bebida</th><th>Qtd</th><th>Valor</th><th>Motivo</th></tr></thead>
        <tbody>
          ${list.map(m => {
            const b = bebidas.find(x => x.id === m.bebidaId);
            return `
              <tr>
                <td>${Utils.fmtDate(m.data)}</td>
                <td>${m.tipo}</td>
                <td>${b?.nome || "-"}</td>
                <td>${m.quantidade}</td>
                <td>${Utils.fmtCurrency(m.valorUnit)}</td>
                <td>${m.motivo || "-"}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
    <div class="card" id="movFormCard" style="display:none"></div>
  `;
}

function showMovForm() {
  const bebidas = Store.get(KEYS.bebidas);
  const card = document.getElementById("movFormCard");
  card.style.display = "block";
  card.innerHTML = `
    <div class="card-title"><strong>Nova movimentação</strong></div>
    <div class="form-grid">
      <div>
        <label>Tipo</label>
        <select id="mvTipo" class="select">
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </div>
      <div>
        <label>Bebida</label>
        <select id="mvBebida" class="select">
          ${bebidas.map(b => `<option value='${b.id}'>${b.nome}</option>`).join("")}
        </select>
      </div>
      <div>
        <label>Quantidade</label>
        <input id="mvQtd" type="number" class="input" value="1" />
      </div>
      <div>
        <label>Valor unitário</label>
        <input id="mvValor" type="number" step="0.01" class="input" value="0" />
      </div>
      <div>
        <label>Motivo</label>
        <input id="mvMotivo" class="input" />
      </div>
    </div>
    <div style="margin-top:12px; display:flex; gap:8px">
      <button class="btn btn-success" id="salvarMovBtn">Salvar</button>
      <button class="btn" id="cancelarMovBtn">Cancelar</button>
    </div>
  `;
  document.getElementById("salvarMovBtn").onclick = () => {
    if (!Auth.can("read")) { alert("Sem permissão"); return; }
    const tipo = mvTipo.value;
    const bebidaId = mvBebida.value;
    const qtd = +mvQtd.value;
    const valorUnit = +mvValor.value;
    if (!bebidaId || !qtd || qtd <= 0) { alert("Informe bebida e quantidade"); return; }
    const mov = { id: Utils.uid("mov"), tipo, bebidaId, quantidade: qtd, valorUnit, motivo: mvMotivo.value.trim(), data: Date.now() };
    Store.upsert(KEYS.movimentacoes, mov);
    const bebidas = Store.get(KEYS.bebidas);
    const b = bebidas.find(x => x.id === bebidaId);
    if (b) {
      b.estoque = Math.max(0, b.estoque + (tipo === "entrada" ? qtd : -qtd));
      Store.upsert(KEYS.bebidas, b);
    }
    router();
  };
  document.getElementById("cancelarMovBtn").onclick = () => { card.style.display = "none"; };
}

 
function renderPedidos() {
  const pedidos = Store.get(KEYS.pedidos).slice().reverse();
  return `
    <div class="card">
      <div class="card-title">
        <strong>Pedidos / Vendas</strong>
        <div class="table-actions">
          <button class="btn btn-primary" id="novoPedidoBtn" ${Auth.can("create_pedido") ? "" : "disabled"}>Novo pedido</button>
        </div>
      </div>
      <table class="table">
        <thead><tr><th>Data</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          ${pedidos.map(p => `
            <tr>
              <td>${Utils.fmtDate(p.data)}</td>
              <td>${Store.get(KEYS.clientes).find(c => c.id === p.clienteId)?.nome || "-"}</td>
              <td>${p.itens.map(i => `${i.nome} x${i.quantidade}`).join(", ")}</td>
              <td>${Utils.fmtCurrency(p.total)}</td>
              <td>${p.status}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="card" id="pedidoFormCard" style="display:none"></div>
  `;
}

function showPedidoForm() {
  const clientes = Store.get(KEYS.clientes);
  const bebidas = Store.get(KEYS.bebidas).filter(b => b.ativo);
  const card = document.getElementById("pedidoFormCard");
  card.style.display = "block";
  card.innerHTML = `
    <div class="card-title"><strong>Novo pedido</strong></div>
    <div class="form-grid">
      <div>
        <label>Cliente</label>
        <select id="pdCliente" class="select">${clientes.map(c => `<option value='${c.id}'>${c.nome}</option>`).join("")}</select>
      </div>
      <div>
        <label>Bebida</label>
        <select id="pdBebida" class="select">${bebidas.map(b => `<option value='${b.id}'>${b.nome}</option>`).join("")}</select>
      </div>
      <div>
        <label>Quantidade</label>
        <input id="pdQtd" type="number" class="input" value="1" />
      </div>
      <div>
        <label>Preço</label>
        <input id="pdPreco" type="number" step="0.01" class="input" value="0" />
      </div>
    </div>
    <div style="margin-top:12px; display:flex; gap:8px">
      <button class="btn btn-success" id="adicionarItemBtn">Adicionar item</button>
      <button class="btn" id="finalizarPedidoBtn">Finalizar e faturar</button>
    </div>
    <div style="margin-top:12px">
      <table class="table" id="pdItensTable">
        <thead><tr><th>Bebida</th><th>Qtd</th><th>Preço</th><th>Total</th><th></th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  const itens = [];
  const tbody = card.querySelector("#pdItensTable tbody");

  function redraw() {
    tbody.innerHTML = itens.map((i, idx) => `
      <tr>
        <td>${i.nome}</td>
        <td>${i.quantidade}</td>
        <td>${Utils.fmtCurrency(i.preco)}</td>
        <td>${Utils.fmtCurrency(i.preco * i.quantidade)}</td>
        <td><button class="btn btn-danger" data-del-item="${idx}">Remover</button></td>
      </tr>
    `).join("");
    tbody.querySelectorAll("[data-del-item]").forEach(btn => btn.onclick = () => { itens.splice(+btn.dataset.delItem, 1); redraw(); });
  }

  document.getElementById("adicionarItemBtn").onclick = () => {
    const b = Store.get(KEYS.bebidas).find(x => x.id === pdBebida.value);
    const qtd = +pdQtd.value;
    const preco = +pdPreco.value || b?.preco || 0;
    if (!b || !qtd || qtd <= 0) { alert("Informe bebida e quantidade válidas"); return; }
    if (b.estoque < qtd) { alert(`Estoque insuficiente de ${b.nome}`); return; }
    itens.push({ bebidaId: b.id, nome: b.nome, quantidade: qtd, preco });
    redraw();
  };

  document.getElementById("finalizarPedidoBtn").onclick = async () => {
    if (!Auth.can("create_pedido")) { alert("Sem permissão"); return; }
    if (!itens.length) { alert("Adicione ao menos um item"); return; }
    const total = itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
    const ped = { id: Utils.uid("ped"), clienteId: pdCliente.value, itens, total, status: "faturado", data: Date.now() };
    const pc = Config.get(KEYS.pagConfig);
    if (pc.auto) {
      const ok = await Payment.charge(total);
      if (!ok) { alert('Pagamento não aprovado'); return; }
      ped.pagamento = 'aprovado';
    }
    // Atualiza estoque e registra movimentações
    const bebidas = Store.get(KEYS.bebidas);
    itens.forEach(i => {
      const b = bebidas.find(x => x.id === i.bebidaId);
      if (b) {
        b.estoque = Math.max(0, b.estoque - i.quantidade);
        Store.upsert(KEYS.bebidas, b);
        const mov = { id: Utils.uid("mov"), tipo: "saida", bebidaId: b.id, quantidade: i.quantidade, valorUnit: i.preco, motivo: "Venda", data: Date.now(), destino: pdCliente.value };
        Store.upsert(KEYS.movimentacoes, mov);
      }
    });
    Store.upsert(KEYS.pedidos, ped);
    const fc = Config.get(KEYS.fiscalConfig);
    if (fc.auto) { Fiscal.emitPedido(ped); }
    alert("Pedido faturado com sucesso!");
    if (navigator.share) { const resumo = `Pedido ${ped.id} — Total ${Utils.fmtCurrency(total)} — Itens: ${itens.map(i => i.nome + ' x' + i.quantidade).join(', ')}`; navigator.share({ title: 'Recibo de venda', text: resumo }).catch(() => {}); }
    router();
  };
}

 
function renderRelatorios() {
  const pedidos = Store.get(KEYS.pedidos);
  const bebidas = Store.get(KEYS.bebidas);
  const produtoResumo = bebidas.map(b => {
    const vendidos = pedidos.flatMap(p => p.itens).filter(i => i.bebidaId === b.id);
    const qtd = vendidos.reduce((acc, i) => acc + i.quantidade, 0);
    const receita = vendidos.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
    const custo = b.custo * qtd;
    const lucro = receita - custo;
    return { nome: b.nome, qtd, receita, lucro };
  }).sort((a, b) => b.receita - a.receita);

  return `
    <div class="card">
      <div class="card-title">
        <strong>Resumo por produto</strong>
        <div class="table-actions">
          <button class="btn btn-secondary" id="exportCsvBtn">Exportar CSV</button>
        </div>
      </div>
      <table class="table">
        <thead><tr><th>Bebida</th><th>Vendidos</th><th>Receita</th><th>Lucro estimado</th></tr></thead>
        <tbody>
          ${produtoResumo.map(r => `<tr><td>${r.nome}</td><td>${r.qtd}</td><td>${Utils.fmtCurrency(r.receita)}</td><td>${Utils.fmtCurrency(r.lucro)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function bindActions() {
  const hash = location.hash || "#/dashboard";
  const authArea = document.getElementById("authArea");
  const loginBtn = document.getElementById("loginBtn");
  if (authArea && loginBtn) {
    const user = Auth.current();
    if (user.name) {
      authArea.style.display = "inline-flex";
      authArea.textContent = `${user.name} (${user.role})`;
      loginBtn.textContent = "Sair";
      loginBtn.onclick = () => { Auth.logout(); location.reload(); };
    } else {
      authArea.style.display = "none";
      loginBtn.textContent = "Entrar";
      loginBtn.onclick = () => showLogin();
    }
  }
  if (hash === "#/bebidas") {
    const list = Store.get(KEYS.bebidas);
    document.getElementById("novaBebidaBtn").onclick = () => showBebidaForm();
    document.querySelectorAll("[data-edit]").forEach(btn => btn.onclick = () => {
      const b = list.find(x => x.id === btn.dataset.edit);
      showBebidaForm(b);
    });
    document.querySelectorAll("[data-del]").forEach(btn => btn.onclick = () => { if (confirm("Excluir bebida?")) { Store.remove(KEYS.bebidas, btn.dataset.del); router(); } });
  }
  if (hash === "#/fornecedores") {
    const list = Store.get(KEYS.fornecedores);
    document.getElementById("novoFornecedorBtn").onclick = () => showFornecedorForm();
    document.querySelectorAll("[data-edit-for]").forEach(btn => btn.onclick = () => {
      const f = list.find(x => x.id === btn.dataset.editFor);
      showFornecedorForm(f);
    });
    document.querySelectorAll("[data-del-for]").forEach(btn => btn.onclick = () => { if (confirm("Excluir fornecedor?")) { Store.remove(KEYS.fornecedores, btn.dataset.delFor); router(); } });
  }
  if (hash === "#/clientes") {
    const list = Store.get(KEYS.clientes);
    document.getElementById("novoClienteBtn").onclick = () => showClienteForm();
    document.querySelectorAll("[data-edit-cli]").forEach(btn => btn.onclick = () => {
      const c = list.find(x => x.id === btn.dataset.editCli);
      showClienteForm(c);
    });
    document.querySelectorAll("[data-del-cli]").forEach(btn => btn.onclick = () => { if (confirm("Excluir cliente?")) { Store.remove(KEYS.clientes, btn.dataset.delCli); router(); } });
  }
  if (hash === "#/estoque") {
    document.getElementById("novaMovBtn").onclick = () => showMovForm();
  }
  if (hash === "#/pedidos") {
    document.getElementById("novoPedidoBtn").onclick = () => showPedidoForm();
  }
  if (hash === "#/relatorios") {
    const btn = document.getElementById("exportCsvBtn");
    if (btn) btn.onclick = () => exportRelatorioCsv();
  }
  if (hash === "#/config") {
    const accentSel = document.getElementById("cfgAccent");
    const modeSel = document.getElementById("cfgMode");
    const exportBtn = document.getElementById("exportJsonBtn");
    const importBtn = document.getElementById("importJsonBtn");
    const importInput = document.getElementById("importJsonInput");
    const importCsvBtn = document.getElementById("importCsvBtn");
    const importCsvInput = document.getElementById("importCsvInput");
    const adminBtn = document.getElementById("loginAdminBtn");
    const vendBtn = document.getElementById("loginVendBtn");
    const payProvider = document.getElementById("payProvider");
    const payEndpoint = document.getElementById("payEndpoint");
    const payAuto = document.getElementById("payAuto");
    const payTestBtn = document.getElementById("payTestBtn");
    const fCnpj = document.getElementById("fCnpj");
    const fIE = document.getElementById("fIE");
    const fRazao = document.getElementById("fRazao");
    const fAuto = document.getElementById("fAuto");
    const fiscalSaveBtn = document.getElementById("fiscalSaveBtn");
    const emitTestBtn = document.getElementById("emitTestBtn");
    const exportNfeBtn = document.getElementById("exportNfeBtn");

    if (accentSel) {
      accentSel.onchange = () => {
        const v = accentSel.value;
        const root = document.documentElement;
        if (v === "red") root.style.setProperty('--accent', getComputedStyle(root).getPropertyValue('--red-600'));
        else if (v === "green") root.style.setProperty('--accent', getComputedStyle(root).getPropertyValue('--green-600'));
        else root.style.setProperty('--accent', getComputedStyle(root).getPropertyValue('--blue-600'));
      };
    }
    if (modeSel) {
      const saved = Config.get(KEYS.theme).mode || 'escuro';
      modeSel.value = saved;
      const apply = (m) => {
        const root = document.documentElement;
        if (m === 'claro') root.classList.add('theme-light'); else root.classList.remove('theme-light');
        const conf = Config.get(KEYS.theme); conf.mode = m; Config.set(KEYS.theme, conf);
      };
      apply(saved);
      modeSel.onchange = () => apply(modeSel.value);
    }
    if (exportBtn) exportBtn.onclick = () => {
      const db = {
        bebidas: Store.get(KEYS.bebidas),
        fornecedores: Store.get(KEYS.fornecedores),
        clientes: Store.get(KEYS.clientes),
        movimentacoes: Store.get(KEYS.movimentacoes),
        pedidos: Store.get(KEYS.pedidos),
      };
      const blob = new Blob([JSON.stringify(db)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'backup_beltrano.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
    if (importBtn && importInput) {
      importBtn.onclick = () => importInput.click();
      importInput.onchange = async () => {
        const file = importInput.files[0];
        if (!file) return;
        const text = await file.text();
        try {
          const db = JSON.parse(text);
          if (Array.isArray(db.bebidas)) Store.set(KEYS.bebidas, db.bebidas);
          if (Array.isArray(db.fornecedores)) Store.set(KEYS.fornecedores, db.fornecedores);
          if (Array.isArray(db.clientes)) Store.set(KEYS.clientes, db.clientes);
          if (Array.isArray(db.movimentacoes)) Store.set(KEYS.movimentacoes, db.movimentacoes);
          if (Array.isArray(db.pedidos)) Store.set(KEYS.pedidos, db.pedidos);
          alert('Backup importado'); router();
        } catch { alert('Arquivo inválido'); }
      };
    }
    if (importCsvBtn && importCsvInput) {
      importCsvBtn.onclick = () => importCsvInput.click();
      importCsvInput.onchange = async () => {
        const file = importCsvInput.files[0];
        if (!file) return;
        const text = await file.text();
        try {
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          if (!lines.length) { alert('CSV vazio'); return; }
          let headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          let rows = lines.slice(1);
          if (!(headers.includes('produto') || headers.includes('volume_ml'))) {
            headers = ['produto','volume_ml','categoria','marca','preco','custo'];
            rows = lines;
          }
          const idx = {
            produto: headers.indexOf('produto'),
            volume_ml: headers.indexOf('volume_ml'),
            categoria: headers.indexOf('categoria'),
            marca: headers.indexOf('marca'),
            preco: headers.indexOf('preco'),
            custo: headers.indexOf('custo'),
            codigo_barras: headers.indexOf('codigo_barras'),
            estoque: headers.indexOf('estoque'),
            estoque_min: headers.indexOf('estoque_min'),
            validade: headers.indexOf('validade'),
            lote: headers.indexOf('lote'),
            local: headers.indexOf('local'),
            fornecedorid: headers.indexOf('fornecedorid'),
            ativo: headers.indexOf('ativo'),
          };
          const refriSizes = [200,237,250,300,310,350,355,600,1000,1500,2000,2250,3000];
          const beerSizes = [269,300,350,355,473,600,1000];
          const waterSizes = [300,500,1000,1500,2000,5000,20000];
          const infer = (p) => {
            const nome = p.trim();
            let categoria = 'Refrigerante';
            let marca = nome;
            if (/^Cerveja/i.test(nome)) { categoria = 'Cerveja'; marca = nome.replace(/^Cerveja\s+/i, '').trim(); }
            else if (/^Água/i.test(nome) || /^Agua/i.test(nome)) { categoria = 'Água'; marca = 'Mineral'; }
            return { nome, categoria, marca };
          };
          const bebidas = Store.get(KEYS.bebidas);
          const upsertBebida = (data) => {
            const existing = bebidas.find(b => b.nome === data.nome && b.marca === data.marca && b.volumeML === data.volumeML);
            const item = existing ? existing : { id: Utils.uid('beb') };
            item.nome = data.nome;
            item.marca = data.marca;
            item.categoria = data.categoria;
            item.volumeML = data.volumeML || 0;
            item.preco = data.preco || 0;
            item.custo = data.custo || 0;
            item.codigoBarras = data.codigoBarras || '';
            item.estoque = data.estoque ?? (existing ? existing.estoque : 0);
            item.estoqueMin = data.estoqueMin ?? (existing ? existing.estoqueMin : 10);
            item.ativo = data.ativo ?? true;
            if (data.validade) item.validade = data.validade;
            if (data.lote) item.lote = data.lote;
            if (data.local) item.local = data.local;
            if (data.fornecedorId) item.fornecedorId = data.fornecedorId;
            Store.upsert(KEYS.bebidas, item);
          };
          rows.forEach(line => {
            const cols = line.split(',').map(c => c.trim());
            const produto = idx.produto >= 0 ? cols[idx.produto] : cols[0];
            const volume = idx.volume_ml >= 0 ? cols[idx.volume_ml] : cols[1];
            const cat = idx.categoria >= 0 ? cols[idx.categoria] : '';
            const marca = idx.marca >= 0 ? cols[idx.marca] : '';
            const preco = idx.preco >= 0 ? parseFloat(cols[idx.preco] || '0') : 0;
            const custo = idx.custo >= 0 ? parseFloat(cols[idx.custo] || '0') : 0;
            const codigo = idx.codigo_barras >= 0 ? cols[idx.codigo_barras] : '';
            const estoque = idx.estoque >= 0 ? parseInt(cols[idx.estoque] || '0') : undefined;
            const estoqueMin = idx.estoque_min >= 0 ? parseInt(cols[idx.estoque_min] || '10') : undefined;
            const validade = idx.validade >= 0 ? Date.parse(cols[idx.validade]) : undefined;
            const lote = idx.lote >= 0 ? cols[idx.lote] : undefined;
            const local = idx.local >= 0 ? cols[idx.local] : undefined;
            const fornecedorId = idx.fornecedorid >= 0 ? cols[idx.fornecedorid] : undefined;
            const ativo = idx.ativo >= 0 ? (/^(true|1|sim)$/i).test(cols[idx.ativo]) : undefined;
            if (!produto) return;
            const base = infer(produto);
            if (cat) base.categoria = cat;
            if (marca) base.marca = marca;
            const sizes = (volume === '*' || /^todas$/i.test(volume) || /^all$/i.test(volume) || !volume)
              ? (base.categoria === 'Cerveja' ? beerSizes : base.categoria === 'Água' ? waterSizes : refriSizes)
              : [parseInt(String(volume).replace(/[^0-9]/g,''))];
            sizes.forEach(vml => {
              upsertBebida({
                nome: base.nome,
                marca: base.marca,
                categoria: base.categoria,
                volumeML: vml,
                preco,
                custo,
                codigoBarras: codigo,
                estoque,
                estoqueMin,
                validade,
                lote,
                local,
                fornecedorId,
                ativo,
              });
            });
          });
          alert('CSV importado'); router();
        } catch { alert('CSV inválido'); }
      };
    }
    if (adminBtn) adminBtn.onclick = () => { const n = prompt('Nome'); if (!n) return; Auth.login(n, 'admin'); location.reload(); };
    if (vendBtn) vendBtn.onclick = () => { const n = prompt('Nome'); if (!n) return; Auth.login(n, 'vendedor'); location.reload(); };
    const pc = Config.get(KEYS.pagConfig);
    if (payProvider) payProvider.value = pc.provider || 'simulado';
    if (payEndpoint) payEndpoint.value = pc.endpoint || '';
    if (payAuto) payAuto.checked = !!pc.auto;
    if (payProvider) payProvider.onchange = () => { const c = Config.get(KEYS.pagConfig); c.provider = payProvider.value; Config.set(KEYS.pagConfig, c); };
    if (payEndpoint) payEndpoint.onchange = () => { const c = Config.get(KEYS.pagConfig); c.endpoint = payEndpoint.value.trim(); Config.set(KEYS.pagConfig, c); };
    if (payAuto) payAuto.onchange = () => { const c = Config.get(KEYS.pagConfig); c.auto = payAuto.checked; Config.set(KEYS.pagConfig, c); };
    if (payTestBtn) payTestBtn.onclick = async () => { const ok = await Payment.charge(1); alert(ok ? 'Cobrança aprovada' : 'Cobrança falhou'); };
    const fc = Config.get(KEYS.fiscalConfig);
    if (fCnpj) fCnpj.value = fc.cnpj || '';
    if (fIE) fIE.value = fc.ie || '';
    if (fRazao) fRazao.value = fc.razao || '';
    if (fAuto) fAuto.checked = !!fc.auto;
    if (fiscalSaveBtn) fiscalSaveBtn.onclick = () => { Config.set(KEYS.fiscalConfig, { cnpj: fCnpj.value.trim(), ie: fIE.value.trim(), razao: fRazao.value.trim(), auto: fAuto.checked }); alert('Configuração fiscal salva'); };
    if (emitTestBtn) emitTestBtn.onclick = () => {
      const pedidos = Store.get(KEYS.pedidos);
      const ped = pedidos[pedidos.length - 1];
      if (!ped) { alert('Sem pedidos para emitir'); return; }
      const nfe = Fiscal.emitPedido(ped);
      const blob = new Blob([JSON.stringify(nfe, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `nfe_${nfe.chave}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
    if (exportNfeBtn) exportNfeBtn.onclick = () => {
      const nfes = JSON.parse(localStorage.getItem(KEYS.nfes) || '[]');
      if (!nfes.length) { alert('Nenhuma NF-e emitida'); return; }
      const nfe = nfes[nfes.length - 1];
      const blob = new Blob([JSON.stringify(nfe, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `nfe_${nfe.chave}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
  }
  if (hash === "#/nfc") {
    initNfcPage();
  }

  const seedBtn = document.getElementById("seedDataBtn");
  if (seedBtn) seedBtn.onclick = () => { seedData(); router(); };
}

function exportRelatorioCsv() {
  const pedidos = Store.get(KEYS.pedidos);
  const linhas = ["Data,Cliente,Bebida,Quantidade,Preco,Total"];
  pedidos.forEach(p => {
    const cliente = Store.get(KEYS.clientes).find(c => c.id === p.clienteId)?.nome || "-";
    p.itens.forEach(i => {
      const total = i.preco * i.quantidade;
      const linha = `${new Date(p.data).toISOString()},${cliente},${i.nome},${i.quantidade},${i.preco},${total}`;
      linhas.push(linha);
    });
  });
  const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "relatorio_pedidos.csv"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const Payment = {
  config() { return Config.get(KEYS.pagConfig); },
  async charge(total) {
    const cfg = Payment.config();
    if ((cfg.provider || 'simulado') === 'simulado') {
      await new Promise(r => setTimeout(r, 800));
      return true;
    }
    if (cfg.provider === 'webhook' && cfg.endpoint) {
      try {
        const res = await fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ total }) });
        if (!res.ok) return false;
        const data = await res.json().catch(() => ({}));
        return !!(data.aprovado ?? true);
      } catch { return false; }
    }
    return false;
  }
};

const Fiscal = {
  config() { return Config.get(KEYS.fiscalConfig); },
  emitPedido(ped) {
    const fc = Fiscal.config();
    const chave = Utils.uid('nfe').replace('nfe_', '').toUpperCase();
    const nfe = {
      chave,
      emitente: { cnpj: fc.cnpj || '-', ie: fc.ie || '-', razao: fc.razao || '-' },
      destinatario: { id: ped.clienteId },
      itens: ped.itens.map(i => ({ nome: i.nome, quantidade: i.quantidade, preco: i.preco })),
      total: ped.total,
      data: ped.data,
    };
    const list = JSON.parse(localStorage.getItem(KEYS.nfes) || '[]');
    list.push(nfe);
    localStorage.setItem(KEYS.nfes, JSON.stringify(list));
    return nfe;
  }
};

function renderConfig() {
  const db = {
    bebidas: Store.get(KEYS.bebidas),
    fornecedores: Store.get(KEYS.fornecedores),
    clientes: Store.get(KEYS.clientes),
    movimentacoes: Store.get(KEYS.movimentacoes),
    pedidos: Store.get(KEYS.pedidos),
  };
  return `
    <div class="config-wrapper">
    <div class="card config-card">
      <div class="card-title"><strong>Configurações</strong></div>
      <div class="form-grid">
        <div>
          <label>Modo</label>
          <select id="cfgMode" class="select">
            <option value="escuro">Escuro</option>
            <option value="claro">Claro</option>
          </select>
        </div>
        <div>
          <label>Tema/acento</label>
          <select id="cfgAccent" class="select">
            <option value="blue">Azul</option>
            <option value="red">Vermelho</option>
            <option value="green">Verde</option>
          </select>
        </div>
        <div>
          <label>Backup de dados</label>
          <div class="table-actions">
            <button class="btn btn-secondary" id="exportJsonBtn">Exportar JSON</button>
            <input type="file" id="importJsonInput" style="display:none" accept="application/json" />
            <button class="btn btn-primary" id="importJsonBtn">Importar JSON</button>
          </div>
        </div>
        <div>
          <label>Importar CSV de produtos</label>
          <div class="table-actions">
            <input type="file" id="importCsvInput" style="display:none" accept=".csv,text/csv" />
            <button class="btn btn-primary" id="importCsvBtn">Importar CSV</button>
          </div>
          <div class="muted">Campos: produto, volume_ml, categoria, marca, preco, custo</div>
        </div>
        <div>
          <label>Terminal de pagamento</label>
          <div class="form-grid">
            <div>
              <select id="payProvider" class="select">
                <option value="simulado">Simulado</option>
                <option value="webhook">Webhook HTTP</option>
              </select>
            </div>
            <div>
              <input id="payEndpoint" class="input" placeholder="URL do webhook" />
            </div>
            <div>
              <label><input type="checkbox" id="payAuto" /> Cobrar automaticamente ao faturar</label>
            </div>
            <div>
              <button class="btn btn-success" id="payTestBtn">Testar cobrança</button>
            </div>
          </div>
        </div>
        <div>
          <label>Notas fiscais</label>
          <div class="form-grid">
            <div><input id="fCnpj" class="input" placeholder="CNPJ do emitente" /></div>
            <div><input id="fIE" class="input" placeholder="IE do emitente" /></div>
            <div><input id="fRazao" class="input" placeholder="Razão social" /></div>
            <div><label><input type="checkbox" id="fAuto" /> Emitir NF-e ao faturar</label></div>
            <div class="table-actions">
              <button class="btn btn-primary" id="fiscalSaveBtn">Salvar</button>
              <button class="btn btn-secondary" id="emitTestBtn">Emitir NF-e de teste</button>
              <button class="btn" id="exportNfeBtn">Exportar última NF-e</button>
            </div>
          </div>
        </div>
        <div>
          <label>Acesso</label>
          <div class="table-actions">
            <button class="btn btn-success" id="loginAdminBtn">Entrar como Admin</button>
            <button class="btn" id="loginVendBtn">Entrar como Vendedor</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card config-card" style="margin-top:12px">
      <div class="card-title"><strong>O que esta aba abrange</strong></div>
      <ul class="muted">
        <li>Troca entre modo escuro e claro</li>
        <li>Cor de acento (azul, vermelho, verde)</li>
        <li>Backup e restauração de dados (JSON)</li>
        <li>Configuração de terminal de pagamento (simulado/webhook)</li>
        <li>Emissão de NF-e simulada e exportação</li>
        <li>Atalhos de acesso (Admin/Vendedor)</li>
      </ul>
    </div>
    </div>
  `;
}

function showLogin() {
  const name = prompt("Seu nome");
  if (!name) return;
  const role = prompt("Papel (admin/vendedor)") || "vendedor";
  Auth.login(name, role === "admin" ? "admin" : "vendedor");
  location.reload();
}

// NFC
const Nfc = {
  supported() { return typeof NDEFReader !== 'undefined'; },
  async scan(onReading) {
    try {
      const reader = new NDEFReader();
      await reader.scan();
      reader.onreading = (event) => {
        const dec = new TextDecoder();
        let payload = null;
        for (const rec of event.message.records) {
          if (rec.recordType === 'text' || rec.recordType === 'mime') {
            try { payload = JSON.parse(dec.decode(rec.data)); } catch { payload = dec.decode(rec.data); }
          }
        }
        onReading(payload);
      };
      return true;
    } catch (e) {
      alert('Falha ao iniciar leitura NFC: ' + (e?.message || e));
      return false;
    }
  },
  async write(data) {
    try {
      const reader = new NDEFReader();
      const enc = new TextEncoder();
      await reader.write({ records: [{ recordType: 'text', data: enc.encode(JSON.stringify(data)) }] });
      alert('Tag gravada com sucesso');
      return true;
    } catch (e) {
      alert('Falha ao gravar tag: ' + (e?.message || e));
      return false;
    }
  }
};

function renderNfc() {
  return `
    <div class="card">
      <div class="card-title"><strong>NFC</strong><span class="pill ${Nfc.supported() ? 'green' : 'red'}">${Nfc.supported() ? 'Suportado' : 'Não suportado'}</span></div>
      <div class="form-grid">
        <div>
          <label>Modo</label>
          <select id="nfcMode" class="select">
            <option value="entrada">Entrada em estoque</option>
            <option value="pedido">Carrinho (venda)</option>
          </select>
        </div>
        <div>
          <label>Cliente (para venda)</label>
          <select id="nfcCliente" class="select">${Store.get(KEYS.clientes).map(c => `<option value='${c.id}'>${c.nome}</option>`).join('')}</select>
        </div>
      </div>
      <div class="table-actions" style="margin:12px 0">
        <button class="btn btn-primary" id="startScanBtn">Ler Tag</button>
        <button class="btn" id="stopScanBtn">Parar</button>
      </div>
      <div class="grid cols-2" style="margin-top:12px">
        <div class="card">
          <div class="card-title"><strong>Gravar Tag de Bebida</strong></div>
          <div class="form-grid">
            <div><select id="nfcBebidaSel" class="select">${Store.get(KEYS.bebidas).map(b => `<option value='${b.id}'>${b.nome}</option>`).join('')}</select></div>
            <div><button class="btn btn-success" id="writeBebidaBtn">Gravar</button></div>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><strong>Gravar Tag de Cliente</strong></div>
          <div class="form-grid">
            <div><select id="nfcClienteSel" class="select">${Store.get(KEYS.clientes).map(c => `<option value='${c.id}'>${c.nome}</option>`).join('')}</select></div>
            <div><button class="btn btn-success" id="writeClienteBtn">Gravar</button></div>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:12px">
        <div class="card-title"><strong>Carrinho NFC</strong></div>
        <table class="table" id="nfcCartTable">
          <thead><tr><th>Bebida</th><th>Qtd</th><th>Preço</th><th>Total</th></tr></thead>
          <tbody></tbody>
        </table>
        <div class="table-actions" style="margin-top:12px">
          <button class="btn btn-primary" id="finalizarNfcBtn">Finalizar venda</button>
        </div>
      </div>
    </div>
  `;
}

function initNfcPage() {
  const cart = [];
  const tbody = document.querySelector('#nfcCartTable tbody');
  function redrawCart() {
    tbody.innerHTML = cart.map(i => `<tr><td>${i.nome}</td><td>${i.quantidade}</td><td>${Utils.fmtCurrency(i.preco)}</td><td>${Utils.fmtCurrency(i.quantidade * i.preco)}</td></tr>`).join('');
  }
  function handlePayload(payload) {
    if (!payload) return;
    // Espera JSON: { type: 'bebida', id: '...', preco?: number, quantidade?: number } ou { type: 'cliente', id: '...' }
    try {
      if (typeof payload === 'string') payload = JSON.parse(payload);
    } catch {}
    const mode = document.getElementById('nfcMode').value;
    if (payload.type === 'cliente') {
      const c = Store.get(KEYS.clientes).find(x => x.id === payload.id);
      if (c) document.getElementById('nfcCliente').value = c.id;
      return;
    }
    if (payload.type === 'bebida') {
      const b = Store.get(KEYS.bebidas).find(x => x.id === payload.id);
      if (!b) { alert('Bebida não encontrada'); return; }
      const quantidade = payload.quantidade || 1;
      const preco = payload.preco || b.preco || 0;
      if (mode === 'entrada') {
        const mov = { id: Utils.uid('mov'), tipo: 'entrada', bebidaId: b.id, quantidade, valorUnit: b.custo || 0, motivo: 'Entrada via NFC', data: Date.now() };
        Store.upsert(KEYS.movimentacoes, mov);
        b.estoque = (b.estoque || 0) + quantidade;
        Store.upsert(KEYS.bebidas, b);
        alert(`Entrada registrada: ${b.nome} +${quantidade}`);
      } else {
        if (b.estoque < quantidade) { alert(`Estoque insuficiente de ${b.nome}`); return; }
        cart.push({ bebidaId: b.id, nome: b.nome, quantidade, preco });
        redrawCart();
      }
    }
  }
  document.getElementById('startScanBtn').onclick = async () => {
    if (!Nfc.supported()) { alert('Web NFC não suportado'); return; }
    await Nfc.scan(handlePayload);
  };
  document.getElementById('stopScanBtn').onclick = () => { alert('Para parar a leitura, interrompa o gesto de aproximação.'); };
  document.getElementById('writeBebidaBtn').onclick = async () => {
    const id = document.getElementById('nfcBebidaSel').value;
    await Nfc.write({ type: 'bebida', id });
  };
  document.getElementById('writeClienteBtn').onclick = async () => {
    const id = document.getElementById('nfcClienteSel').value;
    await Nfc.write({ type: 'cliente', id });
  };
  document.getElementById('finalizarNfcBtn').onclick = () => {
    if (!cart.length) { alert('Carrinho vazio'); return; }
    const clienteId = document.getElementById('nfcCliente').value;
    const total = cart.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
    const ped = { id: Utils.uid('ped'), clienteId, itens: cart.slice(), total, status: 'faturado', data: Date.now() };
    const pc = Config.get(KEYS.pagConfig);
    const proceed = () => {
      const bebidas = Store.get(KEYS.bebidas);
      cart.forEach(i => {
        const b = bebidas.find(x => x.id === i.bebidaId);
        if (b) {
          b.estoque = Math.max(0, b.estoque - i.quantidade);
          Store.upsert(KEYS.bebidas, b);
          const mov = { id: Utils.uid('mov'), tipo: 'saida', bebidaId: b.id, quantidade: i.quantidade, valorUnit: i.preco, motivo: 'Venda NFC', data: Date.now(), destino: clienteId };
          Store.upsert(KEYS.movimentacoes, mov);
        }
      });
      Store.upsert(KEYS.pedidos, ped);
      const fc = Config.get(KEYS.fiscalConfig);
      if (fc.auto) { Fiscal.emitPedido(ped); }
      const resumo = `Pedido ${ped.id} — Total ${Utils.fmtCurrency(total)} — Itens: ${cart.map(i => i.nome + ' x' + i.quantidade).join(', ')}`;
      if (navigator.share) { navigator.share({ title: 'Recibo de venda', text: resumo }).catch(() => {}); }
      alert('Venda concluída');
      location.hash = '#/pedidos';
    };
    if (pc.auto) {
      Payment.charge(total).then(ok => { if (!ok) { alert('Pagamento não aprovado'); return; } ped.pagamento = 'aprovado'; proceed(); });
    } else {
      proceed();
    }
  };
}

 
window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", () => {
  const saved = (Config.get(KEYS.theme).mode) || 'escuro';
  const root = document.documentElement;
  if (saved === 'claro') root.classList.add('theme-light'); else root.classList.remove('theme-light');
  if (!location.hash) location.hash = "#/dashboard";
  router();
});
