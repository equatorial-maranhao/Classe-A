// ============================================================
// Classe A · Equatorial Maranhão — app.js
// App completo: login/cadastro, aprovação de acesso, ciclos por
// ano, cursos com upload de diploma, feedback, RRs/PMS e um
// dashboard que recalcula tudo ao vivo a partir do Supabase.
// ============================================================

let sb = null;

const MONTHS_BY_CYCLE = {
  1: ['Janeiro', 'Fevereiro', 'Março'],
  2: ['Abril', 'Maio', 'Junho'],
  3: ['Julho', 'Agosto', 'Setembro'],
  4: ['Outubro', 'Novembro', 'Dezembro']
};
const PERIOD_BY_CYCLE = { 1: 'Jan–Mar', 2: 'Abr–Jun', 3: 'Jul–Set', 4: 'Out–Dez' };

const state = {
  session: null,
  profile: null,
  accessRequest: null,
  people: [],
  cycles: [],
  selectedCycleId: null,
  tab: 'visao',
  courses: [],
  feedbacks: [],
  rrs: [],
  pms: [],
  pendingRequests: [],
  detailPersonId: null
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function show(id) {
  ['view-loading', 'view-auth', 'view-pending', 'view-app'].forEach(v => {
    $('#' + v).style.display = v === id ? '' : 'none';
  });
}

// ------------------------------------------------------------
// BOOT / AUTH
// ------------------------------------------------------------
async function boot() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    state.session = session;
    sb.auth.onAuthStateChange((_event, newSession) => {
      state.session = newSession;
      route();
    });
    route();
  } catch (err) {
    document.getElementById('view-loading').innerHTML =
      '<div style="color:#fff;text-align:center;max-width:320px"><p>Não foi possível conectar ao banco de dados.</p><p style="font-size:13px;opacity:.8">Confira se config.js tem a URL e a chave corretas do projeto Supabase.</p></div>';
  }
}

async function route() {
  if (!state.session) {
    state.profile = null;
    show('view-auth');
    return;
  }
  show('view-loading');
  const { data: profile } = await sb.from('profiles').select('*').eq('id', state.session.user.id).maybeSingle();
  state.profile = profile;
  if (!profile) {
    const { data: reqRow } = await sb.from('access_requests').select('*').eq('user_id', state.session.user.id).maybeSingle();
    state.accessRequest = reqRow || null;
    renderPending();
    show('view-pending');
    return;
  }
  await loadCore();
  show('view-app');
}

// ------------------------------------------------------------
// AUTH FORM (login / cadastro)
// ------------------------------------------------------------
function initAuthForm() {
  const tabLogin = $('#auth-tab-login'), tabSignup = $('#auth-tab-signup');
  const formLogin = $('#form-login'), formSignup = $('#form-signup');
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active'); tabSignup.classList.remove('active');
    formLogin.style.display = ''; formSignup.style.display = 'none';
  });
  tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active'); tabLogin.classList.remove('active');
    formSignup.style.display = ''; formLogin.style.display = 'none';
  });

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const errEl = $('#login-error');
    errEl.textContent = '';
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) errEl.textContent = traduzErro(error.message);
  });

  formSignup.addEventListener('submit', async (e) => {
    e.preventDefault();
    const full_name = $('#signup-name').value.trim();
    const email = $('#signup-email').value.trim();
    const password = $('#signup-password').value;
    const message = $('#signup-message').value.trim();
    const errEl = $('#signup-error');
    errEl.textContent = '';
    if (password.length < 6) { errEl.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name } } });
    if (error) { errEl.textContent = traduzErro(error.message); return; }
    const userId = data.user && data.user.id;
    if (userId) {
      await sb.from('access_requests').insert({ user_id: userId, full_name, email, message });
    }
    if (!data.session) {
      errEl.style.color = '#1b7a3d';
      errEl.textContent = 'Solicitação enviada! Se pedirmos confirmação por e-mail, confirme e depois faça login.';
    }
  });
}

function traduzErro(msg) {
  if (/already registered/i.test(msg)) return 'Este e-mail já tem uma conta. Tente entrar.';
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.';
  return msg;
}

function renderPending() {
  const box = $('#pending-box');
  const req = state.accessRequest;
  if (!req) {
    box.innerHTML = `<p>Sua conta existe, mas ainda não há uma solicitação de acesso registrada. Fale com um administrador.</p>`;
  } else if (req.status === 'pendente') {
    box.innerHTML = `<p>Olá, <b>${escapeHtml(req.full_name)}</b>. Sua solicitação de acesso está <b>pendente</b> de aprovação por um administrador.</p>`;
  } else if (req.status === 'rejeitado') {
    box.innerHTML = `<p>Sua solicitação de acesso foi <b>recusada</b>. Fale com um administrador se acha que isso é um engano.</p>`;
  } else {
    box.innerHTML = `<p>Solicitação aprovada — atualize a página.</p>`;
  }
}

// ------------------------------------------------------------
// CORE DATA
// ------------------------------------------------------------
async function loadCore() {
  const [{ data: people }, { data: cycles }] = await Promise.all([
    sb.from('people').select('*').order('name'),
    sb.from('cycles').select('*').order('year', { ascending: true }).order('cycle_number', { ascending: true })
  ]);
  state.people = people || [];
  state.cycles = cycles || [];
  if (!state.selectedCycleId) {
    const ativo = state.cycles.find(c => c.status === 'ativo');
    state.selectedCycleId = (ativo || state.cycles[state.cycles.length - 1] || {}).id || null;
  }
  renderTopBar();
  renderCycleTabs();
  await loadCycleData();
  if (state.profile.role === 'master') await loadPendingRequests();
  renderTabs();
}

async function loadCycleData() {
  if (!state.selectedCycleId) { state.courses = []; state.feedbacks = []; state.rrs = []; state.pms = []; return; }
  const cid = state.selectedCycleId;
  const [{ data: courses }, { data: feedbacks }, { data: rrs }, { data: pms }] = await Promise.all([
    sb.from('courses').select('*').eq('cycle_id', cid),
    sb.from('feedbacks').select('*').eq('cycle_id', cid),
    sb.from('rrs').select('*').eq('cycle_id', cid).order('month_order'),
    sb.from('pms').select('*').eq('cycle_id', cid).order('month_order')
  ]);
  state.courses = courses || [];
  state.feedbacks = feedbacks || [];
  state.rrs = rrs || [];
  state.pms = pms || [];
}

async function loadPendingRequests() {
  const { data } = await sb.from('access_requests').select('*').eq('status', 'pendente').order('created_at');
  state.pendingRequests = data || [];
}

async function refreshAndRender() {
  await loadCycleData();
  if (state.profile.role === 'master') await loadPendingRequests();
  renderTabs();
}

// ------------------------------------------------------------
// TOP BAR
// ------------------------------------------------------------
function renderTopBar() {
  $('#user-name').textContent = state.profile.full_name;
  $('#user-role').textContent = state.profile.role === 'master' ? 'Administrador' : 'Colaborador';
  $('#user-role').className = 'role-badge ' + (state.profile.role === 'master' ? 'role-master' : 'role-colab');
  $('#tab-admin-btn').style.display = state.profile.role === 'master' ? '' : 'none';
}

// ------------------------------------------------------------
// CYCLE TABS (agrupados por ano)
// ------------------------------------------------------------
function renderCycleTabs() {
  const wrap = $('#cycle-tabs');
  const byYear = {};
  state.cycles.forEach(c => { (byYear[c.year] = byYear[c.year] || []).push(c); });
  const years = Object.keys(byYear).sort();
  wrap.innerHTML = years.map(year => `
    <div class="cycle-year-group">
      <span class="cycle-year-label">${year}</span>
      ${byYear[year].map(c => `
        <button type="button" class="cycle-pill ${c.id === state.selectedCycleId ? 'active' : ''} status-${c.status}" data-cycle="${c.id}">
          ${c.label}<small>${c.period_label}</small>
        </button>
      `).join('')}
    </div>
  `).join('') + (state.profile.role === 'master' ? `<button type="button" id="add-cycle-btn" class="cycle-pill add">+ Novo ciclo</button>` : '');

  $$('.cycle-pill[data-cycle]', wrap).forEach(btn => {
    btn.addEventListener('click', async () => {
      state.selectedCycleId = btn.dataset.cycle;
      renderCycleTabs();
      await loadCycleData();
      renderTabs();
    });
  });
  const addBtn = $('#add-cycle-btn', wrap);
  if (addBtn) addBtn.addEventListener('click', openNewCycleModal);
}

function currentCycle() {
  return state.cycles.find(c => c.id === state.selectedCycleId) || null;
}

// ------------------------------------------------------------
// MAIN TABS
// ------------------------------------------------------------
function initMainTabs() {
  $$('.main-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      renderTabs();
    });
  });
}

function renderTabs() {
  $$('.main-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab));
  $$('.tab-panel').forEach(p => p.style.display = p.id === 'panel-' + state.tab ? '' : 'none');
  renderOverview();
  renderPeople();
  renderMonths();
  renderAbout();
  if (state.profile.role === 'master') renderAdmin();
}

// ------------------------------------------------------------
// VISÃO GERAL (dashboard)
// ------------------------------------------------------------
function renderOverview() {
  const cycle = currentCycle();
  const el = $('#panel-visao');
  if (!cycle) { el.innerHTML = '<p class="empty">Nenhum ciclo cadastrado ainda.</p>'; return; }

  const totalCourses = state.people.length, doneCourses = state.courses.filter(c => c.status === 'concluido').length;
  const totalFeedbacks = state.people.length, doneFeedbacks = state.feedbacks.filter(f => f.status === 'concluido').length;
  const totalRRs = state.rrs.length, doneRRs = state.rrs.filter(r => r.status === 'concluido').length;
  const totalPMS = state.pms.length, donePMS = state.pms.filter(p => p.status === 'concluido').length;

  const totalAll = totalCourses + totalFeedbacks + totalRRs + totalPMS;
  const doneAll = doneCourses + doneFeedbacks + doneRRs + donePMS;
  const pct = totalAll ? Math.round((doneAll / totalAll) * 100) : 0;
  const pctExact = totalAll ? (doneAll / totalAll) * 100 : 0;

  const pend = [];
  const feedbackPend = state.people.filter(p => !state.feedbacks.find(f => f.person_id === p.id && f.status === 'concluido'));
  if (feedbackPend.length) pend.push({ label: 'Feedbacks', detail: feedbackPend.map(p => p.name).join(' e '), count: feedbackPend.length });
  const rrPend = state.rrs.filter(r => r.status !== 'concluido');
  if (rrPend.length) pend.push({ label: 'RRs', detail: rrPend.map(r => r.month_label).join(', '), count: rrPend.length });
  const pmsPend = state.pms.filter(r => r.status !== 'concluido');
  if (pmsPend.length) pend.push({ label: 'PMS', detail: pmsPend.map(r => r.month_label).join(', '), count: pmsPend.length });
  const coursePend = state.people.filter(p => !state.courses.find(c => c.person_id === p.id && c.status === 'concluido'));
  if (coursePend.length) pend.push({ label: 'Cursos', detail: coursePend.map(p => p.name).join(' e '), count: coursePend.length });

  el.innerHTML = `
    <div class="section-head"><h2>Visão geral</h2><p>${cycle.label} · ${cycle.period_label}</p></div>
    <div class="overview">
      <div class="surface progress">
        <span class="kicker">Andamento do ciclo</span>
        <div class="progress-main"><strong>${doneAll} de ${totalAll}</strong><span>entregas concluídas<br>${pct}% do planejado</span></div>
        <div class="track"><span style="width:${pctExact}%;background:${progressColor(pctExact)}"></span></div>
        <div class="progress-foot"><span>${doneAll} concluídas</span><span>${totalAll - doneAll} pendentes</span></div>
      </div>
      <div class="surface priority">
        <h3>Foco até o fim do ciclo</h3>
        ${pend.length ? pend.map(p => `
          <div class="priority-row"><div><strong>${p.label}</strong><small>${escapeHtml(p.detail)}</small></div><span class="badge">${p.count} pendente${p.count > 1 ? 's' : ''}</span></div>
        `).join('') : '<p class="empty">Tudo em dia por aqui 🎉</p>'}
      </div>
    </div>
    <div class="surface chart" style="margin-top:16px">
      <div class="chart-head"><h3>Como está cada frente</h3><p>Percentual concluído</p></div>
      <div class="chart-lines">
        ${chartLine('Cursos', doneCourses, totalCourses)}
        ${chartLine('Feedbacks', doneFeedbacks, totalFeedbacks)}
        ${chartLine('RRs', doneRRs, totalRRs)}
        ${chartLine('PMS', donePMS, totalPMS)}
      </div>
    </div>
  `;
}

function chartLine(label, done, total) {
  const pct = total ? (done / total) * 100 : 0;
  return `<div class="chart-line"><b>${label}</b><div class="bar"><span style="width:${pct}%;background:${progressColor(pct)}"></span></div><span class="value">${Math.round(pct)}%</span></div>`;
}

// Retorna uma cor num degrade de vermelho (0%) até verde (100%), passando por
// amarelo/laranja no meio, para indicar visualmente o nível de andamento.
function progressColor(pct) {
  const p = Math.max(0, Math.min(100, pct));
  const hue = (p / 100) * 120; // 0 = vermelho, 60 = amarelo, 120 = verde
  return `hsl(${hue}, 72%, 45%)`;
}

// ------------------------------------------------------------
// COLABORADORES (cursos + feedback + diploma)
// ------------------------------------------------------------
function renderPeople() {
  const el = $('#panel-pessoas');
  const cycle = currentCycle();
  if (!cycle) { el.innerHTML = '<p class="empty">Nenhum ciclo cadastrado ainda.</p>'; return; }
  const isMaster = state.profile.role === 'master';

  el.innerHTML = `
    <div class="section-head"><h2>Acompanhamento por colaborador</h2><p>Cursos e feedbacks · ${cycle.label}</p></div>
    <div class="people">
      ${state.people.map(p => {
        const course = state.courses.find(c => c.person_id === p.id);
        const feedback = state.feedbacks.find(f => f.person_id === p.id);
        const isSelf = state.profile.person_id === p.id;
        const canEditCourse = isMaster || isSelf;
        return `
        <article class="surface person" data-person="${p.id}">
          <div class="person-top"><div class="avatar">${p.name[0]}</div>
            ${isMaster ? `<button class="icon-btn feedback-toggle" data-person="${p.id}" data-status="${feedback ? feedback.status : 'pendente'}">${feedback && feedback.status === 'concluido' ? '✓ Feedback ok' : 'Marcar feedback'}</button>` : ''}
          </div>
          <h3>${escapeHtml(p.name)}</h3>
          <div class="person-line"><span>Curso</span><b class="${course && course.status === 'concluido' ? '' : 'todo'}">${course && course.status === 'concluido' ? 'Concluído' : 'Pendente'}</b></div>
          <div class="person-line"><span>Feedback</span><b class="${feedback && feedback.status === 'concluido' ? '' : 'todo'}">${feedback && feedback.status === 'concluido' ? 'Concluído' : 'Pendente'}</b></div>
          ${course && course.course_name ? `<div class="course-name">📘 ${escapeHtml(course.course_name)}</div>` : ''}
          ${course && course.diploma_path ? `<button class="link-btn diploma-view" data-path="${course.diploma_path}">Ver diploma anexado</button>` : ''}
          ${canEditCourse ? `<button class="btn-small edit-course" data-person="${p.id}">${course && course.diploma_path ? 'Atualizar curso' : 'Registrar curso'}</button>` : ''}
        </article>`;
      }).join('')}
    </div>
  `;

  $$('.edit-course', el).forEach(b => b.addEventListener('click', () => openCourseModal(b.dataset.person)));
  $$('.diploma-view', el).forEach(b => b.addEventListener('click', () => viewDiploma(b.dataset.path)));
  $$('.feedback-toggle', el).forEach(b => b.addEventListener('click', () => toggleFeedback(b.dataset.person)));
}

async function toggleFeedback(personId) {
  const cycle = currentCycle();
  const existing = state.feedbacks.find(f => f.person_id === personId);
  const newStatus = existing && existing.status === 'concluido' ? 'pendente' : 'concluido';
  const payload = { cycle_id: cycle.id, person_id: personId, status: newStatus, completed_at: newStatus === 'concluido' ? new Date().toISOString() : null, updated_by: state.profile.id, updated_at: new Date().toISOString() };
  await sb.from('feedbacks').upsert(payload, { onConflict: 'cycle_id,person_id' });
  await refreshAndRender();
}

function openCourseModal(personId) {
  const person = state.people.find(p => p.id === personId);
  const course = state.courses.find(c => c.person_id === personId);
  const body = `
    <h3>Curso · ${escapeHtml(person.name)}</h3>
    <label>Nome do curso</label>
    <input type="text" id="modal-course-name" value="${course ? escapeAttr(course.course_name || '') : ''}" placeholder="Ex: Atendimento ao cliente">
    <label>Diploma (PDF ou imagem)</label>
    <input type="file" id="modal-course-file" accept=".pdf,.png,.jpg,.jpeg">
    ${course && course.diploma_filename ? `<p class="hint">Arquivo atual: ${escapeHtml(course.diploma_filename)}</p>` : ''}
    <p id="modal-course-error" class="form-error"></p>
    <div class="modal-actions">
      <button type="button" class="btn-secondary" id="modal-cancel">Cancelar</button>
      <button type="button" class="btn-primary" id="modal-save">Salvar</button>
    </div>
  `;
  openModal(body);
  $('#modal-cancel').addEventListener('click', closeModal);
  $('#modal-save').addEventListener('click', async () => {
    const btn = $('#modal-save'); btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      await saveCourse(personId, course);
      closeModal();
      await refreshAndRender();
    } catch (err) {
      $('#modal-course-error').textContent = err.message || 'Erro ao salvar.';
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  });
}

async function saveCourse(personId, existing) {
  const cycle = currentCycle();
  const name = $('#modal-course-name').value.trim();
  const file = $('#modal-course-file').files[0];
  let diploma_path = existing ? existing.diploma_path : null;
  let diploma_filename = existing ? existing.diploma_filename : null;
  let status = existing ? existing.status : 'pendente';
  let completed_at = existing ? existing.completed_at : null;

  if (file) {
    const path = `${personId}/${cycle.id}-${Date.now()}-${file.name}`;
    const { error: upErr } = await sb.storage.from('diplomas').upload(path, file, { upsert: true });
    if (upErr) throw new Error('Falha no upload do diploma: ' + upErr.message);
    diploma_path = path; diploma_filename = file.name;
    status = 'concluido'; completed_at = new Date().toISOString();
  }

  const payload = {
    cycle_id: cycle.id, person_id: personId, course_name: name || null,
    diploma_path, diploma_filename, status, completed_at,
    updated_by: state.profile.id, updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('courses').upsert(payload, { onConflict: 'cycle_id,person_id' });
  if (error) throw new Error(error.message);
}

async function viewDiploma(path) {
  const { data, error } = await sb.storage.from('diplomas').createSignedUrl(path, 120);
  if (error) { alert('Não foi possível abrir o diploma: ' + error.message); return; }
  window.open(data.signedUrl, '_blank');
}

// ------------------------------------------------------------
// POR MÊS (RRs e PMS)
// ------------------------------------------------------------
function renderMonths() {
  const el = $('#panel-meses');
  const cycle = currentCycle();
  if (!cycle) { el.innerHTML = '<p class="empty">Nenhum ciclo cadastrado ainda.</p>'; return; }
  const isMaster = state.profile.role === 'master';
  const months = MONTHS_BY_CYCLE[cycle.cycle_number] || [];

  el.innerHTML = `
    <div class="section-head"><h2>O trimestre, mês a mês</h2><p>RRs e PMS · ${cycle.label}</p></div>
    <div class="months">
      ${months.map((label, i) => {
        const order = i + 1;
        const rr = state.rrs.find(r => r.month_order === order);
        const pm = state.pms.find(r => r.month_order === order);
        return `
        <article class="surface month">
          <h3>${label}</h3>
          <div class="month-row"><span>RR</span>${monthBadge('rrs', order, rr, isMaster)}</div>
          <div class="month-row"><span>PMS</span>${monthBadge('pms', order, pm, isMaster)}</div>
        </article>`;
      }).join('')}
    </div>
  `;
  $$('.month-toggle', el).forEach(b => b.addEventListener('click', () => toggleMonth(b.dataset.table, Number(b.dataset.order), b.dataset.label)));
}

function monthBadge(table, order, row, isMaster) {
  const done = row && row.status === 'concluido';
  const text = done ? (table === 'rrs' ? 'Realizada' : 'Concluído') : 'Pendente';
  if (!isMaster) return `<b class="${done ? '' : 'todo'}">${text}</b>`;
  return `<button type="button" class="month-toggle btn-tiny ${done ? '' : 'todo'}" data-table="${table}" data-order="${order}">${text}</button>`;
}

async function toggleMonth(table, order, label) {
  const cycle = currentCycle();
  const months = MONTHS_BY_CYCLE[cycle.cycle_number];
  const existing = (table === 'rrs' ? state.rrs : state.pms).find(r => r.month_order === order);
  const newStatus = existing && existing.status === 'concluido' ? 'pendente' : 'concluido';
  const payload = {
    cycle_id: cycle.id, month_order: order, month_label: months[order - 1],
    status: newStatus, completed_at: newStatus === 'concluido' ? new Date().toISOString() : null,
    updated_by: state.profile.id, updated_at: new Date().toISOString()
  };
  await sb.from(table).upsert(payload, { onConflict: 'cycle_id,month_order' });
  await refreshAndRender();
}

// ------------------------------------------------------------
// SOBRE O CICLO
// ------------------------------------------------------------
function renderAbout() {
  const el = $('#panel-sobre');
  el.innerHTML = `
    <div class="section-head"><h2>Sobre o Classe A</h2></div>
    <div class="explainer">
      <article class="surface explain-card">
        <h3>O que este acompanhamento mostra</h3>
        <p>O Classe A é acompanhado em ciclos trimestrais. Cada ciclo reúne cursos da Universidade do Saber, feedbacks com os colaboradores, RRs e PMS. A visão reúne o status dessas frentes em um só lugar para facilitar o acompanhamento da equipe.</p>
      </article>
      <article class="surface explain-card">
        <h3>O que entra em cada ciclo</h3>
        <ul>
          <li>1 curso obrigatório por colaborador.</li>
          <li>1 feedback por colaborador, realizado pelo gestor.</li>
          <li>3 RRs, uma em cada mês do trimestre.</li>
          <li>3 registros de PMS, um em cada mês do trimestre.</li>
        </ul>
      </article>
    </div>
    <div class="note">Este painel mostra apenas o andamento informado pela equipe. Critérios de avaliação, pontuação e regras oficiais do Classe A devem ser consultados nos materiais internos do programa.</div>
  `;
}

// ------------------------------------------------------------
// ADMINISTRAÇÃO (somente master)
// ------------------------------------------------------------
function renderAdmin() {
  const el = $('#panel-admin');
  if (!el) return;
  el.innerHTML = `
    <div class="section-head"><h2>Administração</h2><p>Aprovações, colaboradores e ciclos</p></div>

    <div class="surface admin-block">
      <h3>Solicitações de acesso pendentes</h3>
      ${state.pendingRequests.length ? state.pendingRequests.map(r => `
        <div class="request-row" data-req="${r.id}">
          <div><strong>${escapeHtml(r.full_name)}</strong><small>${escapeHtml(r.email)}</small>${r.message ? `<small class="msg">"${escapeHtml(r.message)}"</small>` : ''}</div>
          <div class="request-selects">
            <select class="req-role">
              <option value="colaborador">Colaborador (aparece no acompanhamento)</option>
              <option value="master">Máster (acesso total, não aparece no acompanhamento)</option>
            </select>
            <select class="req-person">
              <option value="">— vincular a colaborador existente —</option>
              ${state.people.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
              <option value="__new__">+ criar novo colaborador com este nome</option>
            </select>
          </div>
          <div class="request-actions">
            <button type="button" class="btn-small approve-req">Aprovar</button>
            <button type="button" class="btn-small btn-danger reject-req">Recusar</button>
          </div>
        </div>
      `).join('') : '<p class="empty">Nenhuma solicitação pendente.</p>'}
    </div>

    <div class="surface admin-block">
      <h3>Colaboradores</h3>
      <div class="admin-list">
        ${state.people.map(p => `<span class="chip">${escapeHtml(p.name)}</span>`).join('')}
      </div>
      <form id="add-person-form" class="inline-form">
        <input type="text" id="new-person-name" placeholder="Nome do novo colaborador" required>
        <button type="submit" class="btn-small">Adicionar</button>
      </form>
    </div>

    <div class="surface admin-block">
      <h3>Usuários e permissões</h3>
      <div id="profiles-list">Carregando...</div>
    </div>
  `;

  $$('.approve-req', el).forEach(b => b.addEventListener('click', (e) => approveRequest(e.target.closest('.request-row'))));
  $$('.reject-req', el).forEach(b => b.addEventListener('click', (e) => rejectRequest(e.target.closest('.request-row').dataset.req)));
  $$('.req-role', el).forEach(sel => {
    const row = sel.closest('.request-row');
    const personSelect = $('.req-person', row);
    const syncPersonVisibility = () => { personSelect.style.display = sel.value === 'master' ? 'none' : ''; };
    syncPersonVisibility();
    sel.addEventListener('change', syncPersonVisibility);
  });
  $('#add-person-form', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#new-person-name').value.trim();
    if (!name) return;
    const { data: newPerson, error } = await sb.from('people').insert({ name }).select().single();
    if (error) { alert('Erro ao adicionar colaborador: ' + error.message); return; }
    // Garante que já exista um "slot" de curso e de feedback em todos os ciclos
    // existentes, para essa pessoa poder editar seu próprio curso depois (a
    // política de segurança só permite UPDATE, não criar linha nova).
    if (state.cycles.length) {
      await sb.from('courses').insert(state.cycles.map(c => ({ cycle_id: c.id, person_id: newPerson.id })));
      await sb.from('feedbacks').insert(state.cycles.map(c => ({ cycle_id: c.id, person_id: newPerson.id })));
    }
    await loadCore();
  });

  loadProfilesList();
}

async function approveRequest(row) {
  const reqId = row.dataset.req;
  const req = state.pendingRequests.find(r => r.id === reqId);
  const roleSelect = $('.req-role', row);
  const role = roleSelect ? roleSelect.value : 'colaborador';
  let personId = null;
  if (role === 'colaborador') {
    const select = $('.req-person', row);
    personId = select.value;
    if (!personId) { alert('Escolha a quem esta pessoa corresponde (ou crie um novo colaborador).'); return; }
    if (personId === '__new__') {
      const { data, error } = await sb.from('people').insert({ name: req.full_name }).select().single();
      if (error) { alert('Erro ao criar colaborador: ' + error.message); return; }
      personId = data.id;
      if (state.cycles.length) {
        await sb.from('courses').insert(state.cycles.map(c => ({ cycle_id: c.id, person_id: personId })));
        await sb.from('feedbacks').insert(state.cycles.map(c => ({ cycle_id: c.id, person_id: personId })));
      }
    }
  }
  const { error: profErr } = await sb.from('profiles').insert({ id: req.user_id, full_name: req.full_name, role, person_id: personId });
  if (profErr) { alert('Erro ao aprovar: ' + profErr.message); return; }
  await sb.from('access_requests').update({ status: 'aprovado', reviewed_by: state.profile.id, reviewed_at: new Date().toISOString() }).eq('id', reqId);
  await loadCore();
}

async function rejectRequest(reqId) {
  if (!confirm('Recusar esta solicitação de acesso?')) return;
  await sb.from('access_requests').update({ status: 'rejeitado', reviewed_by: state.profile.id, reviewed_at: new Date().toISOString() }).eq('id', reqId);
  await loadPendingRequests();
  renderAdmin();
}

async function loadProfilesList() {
  const { data: profiles } = await sb.from('profiles').select('*, people:person_id(name)').order('full_name');
  const masters = (profiles || []).filter(p => p.role === 'master').length;
  const el = $('#profiles-list');
  if (!el) return;
  el.innerHTML = (profiles || []).map(p => `
    <div class="profile-row">
      <div><strong>${escapeHtml(p.full_name)}</strong>${p.people ? `<small> · ${escapeHtml(p.people.name)}</small>` : ''}</div>
      <select class="role-select" data-id="${p.id}" ${p.id === state.profile.id ? 'disabled title="Você não pode alterar seu próprio nível"' : ''}>
        <option value="colaborador" ${p.role === 'colaborador' ? 'selected' : ''}>Colaborador</option>
        <option value="master" ${p.role === 'master' ? 'selected' : ''}>Máster</option>
      </select>
    </div>
  `).join('') + `<p class="hint">${masters} usuário(s) máster no momento. O combinado é até 3.</p>`;

  $$('.role-select', el).forEach(sel => sel.addEventListener('change', async () => {
    const newRole = sel.value;
    if (newRole === 'master') {
      const masterCount = (profiles || []).filter(p => p.role === 'master').length;
      if (masterCount >= 3 && !confirm('Já existem 3 usuários máster. Tem certeza que quer adicionar mais um?')) { sel.value = 'colaborador'; return; }
    }
    await sb.from('profiles').update({ role: newRole }).eq('id', sel.dataset.id);
    await loadProfilesList();
  }));
}

// ------------------------------------------------------------
// NOVO CICLO (modal, master)
// ------------------------------------------------------------
function openNewCycleModal() {
  const nextYear = state.cycles.length ? state.cycles[state.cycles.length - 1].year : new Date().getFullYear();
  const usedThisYear = state.cycles.filter(c => c.year === nextYear).map(c => c.cycle_number);
  const suggestedNumber = [1, 2, 3, 4].find(n => !usedThisYear.includes(n)) || 1;
  const body = `
    <h3>Novo ciclo</h3>
    <label>Ano</label>
    <input type="number" id="modal-cycle-year" value="${nextYear}">
    <label>Número do ciclo (1 a 4)</label>
    <select id="modal-cycle-number">
      ${[1, 2, 3, 4].map(n => `<option value="${n}" ${n === suggestedNumber ? 'selected' : ''}>${n}º ciclo (${PERIOD_BY_CYCLE[n]})</option>`).join('')}
    </select>
    <label>Status inicial</label>
    <select id="modal-cycle-status">
      <option value="planejado">Planejado (futuro)</option>
      <option value="ativo">Ativo (em andamento)</option>
    </select>
    <p id="modal-cycle-error" class="form-error"></p>
    <div class="modal-actions">
      <button type="button" class="btn-secondary" id="modal-cancel">Cancelar</button>
      <button type="button" class="btn-primary" id="modal-save">Criar ciclo</button>
    </div>
  `;
  openModal(body);
  $('#modal-cancel').addEventListener('click', closeModal);
  $('#modal-save').addEventListener('click', async () => {
    const year = Number($('#modal-cycle-year').value);
    const cycle_number = Number($('#modal-cycle-number').value);
    const status = $('#modal-cycle-status').value;
    const btn = $('#modal-save'); btn.disabled = true; btn.textContent = 'Criando...';
    try {
      const { data: newCycle, error } = await sb.from('cycles').insert({
        year, cycle_number, label: `${cycle_number}º ciclo`, period_label: `${PERIOD_BY_CYCLE[cycle_number]} ${year}`, status
      }).select().single();
      if (error) throw new Error(error.message === 'duplicate key value violates unique constraint "cycles_year_cycle_number_key"' ? 'Já existe esse ciclo nesse ano.' : error.message);

      if (status === 'ativo') await sb.from('cycles').update({ status: 'encerrado' }).neq('id', newCycle.id).eq('status', 'ativo');

      const months = MONTHS_BY_CYCLE[cycle_number];
      await sb.from('rrs').insert(months.map((label, i) => ({ cycle_id: newCycle.id, month_label: label, month_order: i + 1 })));
      await sb.from('pms').insert(months.map((label, i) => ({ cycle_id: newCycle.id, month_label: label, month_order: i + 1 })));
      if (state.people.length) {
        await sb.from('courses').insert(state.people.map(p => ({ cycle_id: newCycle.id, person_id: p.id })));
        await sb.from('feedbacks').insert(state.people.map(p => ({ cycle_id: newCycle.id, person_id: p.id })));
      }
      state.selectedCycleId = newCycle.id;
      closeModal();
      await loadCore();
    } catch (err) {
      $('#modal-cycle-error').textContent = err.message;
      btn.disabled = false; btn.textContent = 'Criar ciclo';
    }
  });
}

// ------------------------------------------------------------
// MODAL genérico
// ------------------------------------------------------------
function openModal(html) {
  $('#modal-body').innerHTML = html;
  $('#modal-backdrop').style.display = 'flex';
}
function closeModal() { $('#modal-backdrop').style.display = 'none'; }

// ------------------------------------------------------------
// REALTIME (atualiza para todo mundo quando alguém muda algo)
// ------------------------------------------------------------
function initRealtime() {
  const tables = ['courses', 'feedbacks', 'rrs', 'pms', 'cycles', 'people', 'access_requests'];
  sb.channel('classe-a-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cycles' }, () => { if (state.profile) loadCore(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, () => { if (state.profile) loadCore(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => { if (state.profile) refreshAndRender(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, () => { if (state.profile) refreshAndRender(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rrs' }, () => { if (state.profile) refreshAndRender(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pms' }, () => { if (state.profile) refreshAndRender(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'access_requests' }, () => { if (state.profile && state.profile.role === 'master') { loadPendingRequests().then(renderAdmin); } })
    .subscribe();
}

// ------------------------------------------------------------
// UTIL
// ------------------------------------------------------------
function escapeHtml(str) { return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function escapeAttr(str) { return escapeHtml(str).replace(/`/g, '&#96;'); }

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  if (!window.supabase || !window.SUPABASE_CONFIG || window.SUPABASE_CONFIG.url.includes('COLE_AQUI')) {
    document.getElementById('view-loading').innerHTML =
      '<div style="color:#fff;text-align:center;max-width:320px"><p>Não foi possível carregar a conexão com o banco de dados.</p>' +
      '<p style="font-size:13px;opacity:.8">Verifique sua internet e se o arquivo config.js tem a URL e a chave do projeto Supabase preenchidas.</p></div>';
    return;
  }
  sb = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
  initAuthForm();
  initMainTabs();
  $('#logout-btn').addEventListener('click', () => sb.auth.signOut());
  $('#pending-logout').addEventListener('click', () => sb.auth.signOut());
  $('#modal-backdrop').addEventListener('click', (e) => { if (e.target.id === 'modal-backdrop') closeModal(); });
  initRealtime();
  boot();
});
