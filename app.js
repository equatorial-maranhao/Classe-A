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

// Ícone + cor de cada frente de acompanhamento, usados em "Visão geral", "Foco
// até o fim do ciclo" e nos anéis de progresso dos colaboradores.
const TYPE_META = {
  Cursos: { variant: 'amber', svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3 2 8l10 5 8-4.3V15" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 10.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>', color: '#b8780a' },
  Feedbacks: { variant: 'blue', svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>', color: '#2862c4' },
  RRs: { variant: 'green', svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.35.68-2.46 1.76-3.32C10.5 13.16 9.14 13 8 13Zm8 0c-.29 0-.62.02-.97.05C16.2 13.84 17 14.84 17 16v2h7v-2c0-2.66-5.33-4-8-4Z" fill="currentColor"/></svg>', color: '#1b9e4e' },
  PMS: { variant: 'purple', svg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 20V10M11 20V4M18 20v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', color: '#7a3fd1' }
};
// Cores do anel de avatar, sorteadas por pessoa a partir do nome (resultado
// estável) para variar como no mockup.
const AVATAR_RING_COLORS = ['#2862c4', '#1b9e4e', '#7a3fd1', '#c23b82', '#128a7d', '#b8780a'];
const ICON_CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".16"/><path d="M7.5 12.5l3 3 6-6.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_CLOCK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_EYE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>';
const ICON_SEARCH = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="M19.5 19.5l-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICON_CALENDAR = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
// Ilustrações decorativas simples (estilo flat) usadas em alguns blocos.
const ILLUS_DOCS = '<svg width="92" height="76" viewBox="0 0 92 76" fill="none"><circle cx="46" cy="38" r="36" fill="#eaf1fd"/><rect x="24" y="14" width="34" height="46" rx="5" fill="#fff" stroke="#bcd2f9" stroke-width="2"/><path d="M31 27h20M31 35h20M31 43h13" stroke="#9db6e8" stroke-width="2.4" stroke-linecap="round"/><circle cx="64" cy="52" r="12" fill="#1b9e4e"/><path d="M58.5 52l3.8 3.8 7.2-8" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ILLUS_PEOPLE = '<svg width="92" height="76" viewBox="0 0 92 76" fill="none"><circle cx="46" cy="38" r="36" fill="#eaf8ef"/><circle cx="34" cy="30" r="10" fill="#bcd2f9"/><path d="M16 60c0-11 8-17 18-17s18 6 18 17" fill="#dce9fd"/><circle cx="60" cy="33" r="8.5" fill="#9de0b8"/><path d="M45 60c1-9 7.5-14.5 15-14.5S74 51 75 60" fill="#c7f0d7"/></svg>';
const ILLUS_SHIELD = '<svg width="92" height="76" viewBox="0 0 92 76" fill="none"><circle cx="46" cy="38" r="36" fill="#ece3fb"/><path d="M46 14l16 6v14c0 12-7 20-16 24-9-4-16-12-16-24V20l16-6Z" fill="#fff" stroke="#b7a0ea" stroke-width="2.4" stroke-linejoin="round"/><circle cx="46" cy="38" r="7" fill="#7a3fd1"/><rect x="43.3" y="37" width="5.4" height="7" rx="1.3" fill="#fff"/></svg>';
const ILLUS_CHECKLIST = '<svg width="150" height="110" viewBox="0 0 150 110" fill="none"><ellipse cx="78" cy="96" rx="52" ry="10" fill="#eaf1fd"/><rect x="42" y="18" width="58" height="76" rx="8" fill="#fff" stroke="#bcd2f9" stroke-width="2.4"/><rect x="54" y="10" width="34" height="14" rx="4" fill="#2862c4"/><g stroke="#9db6e8" stroke-width="2.4" stroke-linecap="round"><path d="M53 42h34M53 56h34M53 70h22"/></g><circle cx="52" cy="42" r="5" fill="#dff5e8" stroke="#1b9e4e" stroke-width="1.6"/><circle cx="52" cy="56" r="5" fill="#dff5e8" stroke="#1b9e4e" stroke-width="1.6"/><circle cx="110" cy="40" r="17" fill="#1b9e4e"/><path d="M102 40l5.5 5.5L118 34" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function avatarColorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_RING_COLORS[h % AVATAR_RING_COLORS.length];
}

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
  const isMaster = state.profile.role === 'master';
  const roleIcon = isMaster
    ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.6 6.6L22 9.3l-5.4 4.6L18.2 21 12 17l-6.2 4 1.6-7.1L2 9.3l7.4-.7L12 2Z"/></svg>'
    : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.8"/><path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  $('#user-role').innerHTML = roleIcon + (isMaster ? 'Administrador' : 'Colaborador');
  $('#user-role').className = 'role-badge ' + (isMaster ? 'role-master' : 'role-colab');
  $('#tab-admin-btn').style.display = isMaster ? '' : 'none';
  renderMyAvatar();
}

function renderMyAvatar() {
  const holder = $('#my-avatar-img');
  if (!holder) return;
  const url = state.profile.avatar_url;
  const initial = (state.profile.full_name || '?')[0].toUpperCase();
  holder.innerHTML = url ? `<img src="${escapeAttr(url)}" alt="">` : escapeHtml(initial);
}

function initMyAvatar() {
  const btn = $('#my-avatar-btn');
  if (!btn) return;
  btn.addEventListener('click', openAvatarModal);
}

function openAvatarModal() {
  const url = state.profile.avatar_url;
  const body = `
    <h3>Minha foto</h3>
    <div id="avatar-preview">${url ? `<img src="${escapeAttr(url)}" alt="">` : escapeHtml((state.profile.full_name || '?')[0].toUpperCase())}</div>
    <label>Escolha uma imagem (PNG, JPG ou WEBP, até 3 MB)</label>
    <input type="file" id="modal-avatar-file" accept=".png,.jpg,.jpeg,.webp">
    <p id="modal-avatar-error" class="form-error"></p>
    <div class="modal-actions">
      <button type="button" class="btn-secondary" id="modal-cancel">Cancelar</button>
      <button type="button" class="btn-primary" id="modal-save">Salvar foto</button>
    </div>
  `;
  openModal(body);
  $('#modal-cancel').addEventListener('click', closeModal);
  $('#modal-avatar-file').addEventListener('change', () => {
    const file = $('#modal-avatar-file').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { $('#avatar-preview').innerHTML = `<img src="${reader.result}" alt="">`; };
    reader.readAsDataURL(file);
  });
  $('#modal-save').addEventListener('click', async () => {
    const file = $('#modal-avatar-file').files[0];
    const errEl = $('#modal-avatar-error');
    if (!file) { errEl.textContent = 'Escolha uma imagem primeiro.'; return; }
    const btn = $('#modal-save'); btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${state.profile.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw new Error('Falha no upload da foto: ' + upErr.message);
      const { data: pub } = sb.storage.from('avatars').getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      const { error: rpcErr } = await sb.rpc('set_my_avatar', { p_url: publicUrl });
      if (rpcErr) throw new Error('Falha ao salvar a foto: ' + rpcErr.message);
      state.profile.avatar_url = publicUrl;
      const myPerson = state.people.find(p => p.id === state.profile.person_id);
      if (myPerson) myPerson.avatar_url = publicUrl;
      closeModal();
      renderMyAvatar();
      renderPeople();
    } catch (err) {
      errEl.textContent = err.message || 'Erro ao salvar a foto.';
      btn.disabled = false; btn.textContent = 'Salvar foto';
    }
  });
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
          <span class="cycle-pill-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>
          <span class="cycle-pill-text">${c.label}<small>${c.period_label}</small></span>
          <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      `).join('')}
    </div>
  `).join('') + (state.profile.role === 'master' ? `<button type="button" id="add-cycle-btn" class="cycle-pill add"><span class="cycle-pill-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span><span class="cycle-pill-text">Novo ciclo</span><svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : '');

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
  if (feedbackPend.length) {
    const names = feedbackPend.map(p => {
      const f = state.feedbacks.find(x => x.person_id === p.id);
      return f && f.scheduled_at ? `${p.name} (${formatDateBR(f.scheduled_at)})` : p.name;
    });
    pend.push({ label: 'Feedbacks', detail: names.join(' e '), count: feedbackPend.length });
  }
  const rrPend = state.rrs.filter(r => r.status !== 'concluido');
  if (rrPend.length) pend.push({ label: 'RRs', detail: rrPend.map(r => r.month_label).join(', '), count: rrPend.length });
  const pmsPend = state.pms.filter(r => r.status !== 'concluido');
  if (pmsPend.length) pend.push({ label: 'PMS', detail: pmsPend.map(r => r.month_label).join(', '), count: pmsPend.length });
  const coursePend = state.people.filter(p => !state.courses.find(c => c.person_id === p.id && c.status === 'concluido'));
  if (coursePend.length) pend.push({ label: 'Cursos', detail: coursePend.map(p => p.name).join(' e '), count: coursePend.length });

  el.innerHTML = `
    <div class="section-head-row">
      <div class="section-head-main">
        <span class="icon-badge lg blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.8"/><circle cx="11" cy="11" r="4" stroke="currentColor" stroke-width="1.8"/><circle cx="11" cy="11" r="1" fill="currentColor"/><path d="M15 3l4 2-1 4.3-4.3 1.2L13 6l2-3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></span>
        <div class="section-head-text"><h2>Andamento do ciclo</h2><p>Acompanhe o progresso das entregas e o percentual concluído.</p></div>
      </div>
      <span class="section-pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>${cycle.label} · ${cycle.period_label}</span>
    </div>
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
          <div class="priority-row">
            <div class="priority-row-main"><span class="icon-badge ${TYPE_META[p.label].variant}">${TYPE_META[p.label].svg}</span><div><strong>${p.label}</strong><small>${escapeHtml(p.detail)}</small></div></div>
            <span class="badge">${p.count} pendente${p.count > 1 ? 's' : ''}</span>
          </div>
        `).join('') : '<p class="empty section-pill ok"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Tudo em dia</p>'}
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
  const meta = TYPE_META[label];
  return `<div class="chart-line"><span class="chart-line-label"><span class="icon-badge sm ${meta.variant}">${meta.svg}</span><b>${label}</b></span><div class="bar"><span style="width:${pct}%;background:${progressColor(pct)}"></span></div><span class="value">${Math.round(pct)}%</span></div>`;
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
    <div class="section-head-row">
      <div class="section-head-main">
        <span class="icon-badge lg blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.35.68-2.46 1.76-3.32C10.5 13.16 9.14 13 8 13Zm8 0c-.29 0-.62.02-.97.05C16.2 13.84 17 14.84 17 16v2h7v-2c0-2.66-5.33-4-8-4Z" fill="currentColor"/></svg></span>
        <div class="section-head-text"><h2>Acompanhamento por colaborador</h2><p>Acompanhe o progresso de cada colaborador no ciclo atual.</p></div>
      </div>
      <span class="section-pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 20V10M11 20V4M18 20v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Cursos e feedbacks · ${cycle.label}</span>
    </div>
    <div class="people">
      ${state.people.map(p => {
        const course = state.courses.find(c => c.person_id === p.id);
        const feedback = state.feedbacks.find(f => f.person_id === p.id);
        const isSelf = state.profile.person_id === p.id;
        const canEditCourse = isMaster || isSelf;
        const courseDone = course && course.status === 'concluido';
        const feedbackDone = feedback && feedback.status === 'concluido';
        const pct = (courseDone ? 50 : 0) + (feedbackDone ? 50 : 0);
        const ringColor = avatarColorFor(p.name);
        const avatarInner = p.avatar_url
          ? `<img src="${escapeAttr(p.avatar_url)}" alt="">`
          : `<span class="avatar-fallback">${escapeHtml(p.name[0])}</span>`;
        return `
        <article class="surface person" data-person="${p.id}">
          <div class="person-top">
            <div class="avatar-ring" style="--pct:${pct};--ring-color:${ringColor}">${avatarInner}<span class="avatar-pct">${pct}%</span></div>
          </div>
          <h3>${escapeHtml(p.name)}</h3>
          <div class="person-line"><span>Curso</span>${course && course.course_name ? `<b>${escapeHtml(course.course_name)}</b>` : `<span class="status-inline ${courseDone ? 'ok' : 'pending'}">${ICON_CLOCK}${courseDone ? 'Concluído' : 'Pendente'}</span>`}</div>
          <div class="person-line"><span>Feedback</span><span class="status-inline ${feedbackDone ? 'ok' : 'pending'}">${feedbackDone ? ICON_CHECK : ICON_CLOCK}${feedbackDone ? 'Concluído' : 'Pendente'}</span>${!feedbackDone && feedback && feedback.scheduled_at ? `<span class="schedule-tag">${ICON_CALENDAR}Agendado p/ ${formatDateBR(feedback.scheduled_at)}</span>` : ''}</div>
          ${course && course.diploma_path ? `<button class="link-btn diploma-view" data-path="${course.diploma_path}">Ver diploma anexado</button>` : ''}
          ${isMaster ? `<div class="person-feedback-row"><button class="pill-btn feedback-toggle" data-person="${p.id}" data-status="${feedback ? feedback.status : 'pendente'}">${feedbackDone ? '✓ Feedback ok' : 'Marcar feedback'}</button>${!feedbackDone ? `<button type="button" class="pill-btn light schedule-feedback" data-person="${p.id}" title="Agendar data do feedback">${ICON_CALENDAR}</button>` : ''}</div>` : ''}
          ${canEditCourse ? `<button class="pill-btn light edit-course" data-person="${p.id}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>${course && course.diploma_path ? 'Atualizar curso' : 'Registrar curso'}<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
        </article>`;
      }).join('')}
    </div>
  `;

  $$('.edit-course', el).forEach(b => b.addEventListener('click', () => openCourseModal(b.dataset.person)));
  $$('.diploma-view', el).forEach(b => b.addEventListener('click', () => viewDiploma(b.dataset.path)));
  $$('.feedback-toggle', el).forEach(b => b.addEventListener('click', () => toggleFeedback(b.dataset.person)));
  $$('.schedule-feedback', el).forEach(b => b.addEventListener('click', () => openScheduleModal(b.dataset.person)));
}

function formatDateBR(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

function openScheduleModal(personId) {
  const person = state.people.find(p => p.id === personId);
  const feedback = state.feedbacks.find(f => f.person_id === personId);
  openModal(`
    <h3>Agendar feedback · ${escapeHtml(person.name)}</h3>
    <label>Data prevista</label>
    <input type="date" id="modal-schedule-date" value="${feedback && feedback.scheduled_at ? feedback.scheduled_at : ''}">
    <p id="modal-schedule-error" class="form-error"></p>
    <div class="modal-actions">
      ${feedback && feedback.scheduled_at ? `<button type="button" class="btn-secondary" id="modal-schedule-clear">Remover data</button>` : ''}
      <button type="button" class="btn-secondary" id="modal-cancel">Cancelar</button>
      <button type="button" class="btn-primary" id="modal-save">Salvar</button>
    </div>
  `);
  $('#modal-cancel').addEventListener('click', closeModal);
  const clearBtn = $('#modal-schedule-clear');
  if (clearBtn) clearBtn.addEventListener('click', async () => { await saveFeedbackSchedule(personId, null); closeModal(); await refreshAndRender(); });
  $('#modal-save').addEventListener('click', async () => {
    const btn = $('#modal-save'); btn.disabled = true; btn.textContent = 'Salvando...';
    const date = $('#modal-schedule-date').value;
    if (!date) { $('#modal-schedule-error').textContent = 'Escolha uma data.'; btn.disabled = false; btn.textContent = 'Salvar'; return; }
    try {
      await saveFeedbackSchedule(personId, date);
      closeModal();
      await refreshAndRender();
    } catch (err) {
      $('#modal-schedule-error').textContent = err.message || 'Erro ao salvar.';
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  });
}

async function saveFeedbackSchedule(personId, date) {
  const cycle = currentCycle();
  const existing = state.feedbacks.find(f => f.person_id === personId);
  const payload = {
    cycle_id: cycle.id, person_id: personId,
    status: existing ? existing.status : 'pendente',
    completed_at: existing ? existing.completed_at : null,
    scheduled_at: date,
    updated_by: state.profile.id, updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('feedbacks').upsert(payload, { onConflict: 'cycle_id,person_id' });
  if (error) throw new Error(error.message);
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
    <div class="section-head-row">
      <div class="section-head-main">
        <span class="icon-badge lg blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>
        <div class="section-head-text"><h2>O trimestre, mês a mês</h2><p>Acompanhe o progresso das metas e resultados de cada mês do ciclo.</p></div>
      </div>
      <span class="section-pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 20V10M11 20V4M18 20v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>RRs e PMS · ${cycle.label}</span>
    </div>
    <div class="months">
      ${months.map((label, i) => {
        const order = i + 1;
        const rr = state.rrs.find(r => r.month_order === order);
        const pm = state.pms.find(r => r.month_order === order);
        const rrDone = rr && rr.status === 'concluido', pmDone = pm && pm.status === 'concluido';
        const donePct = (rrDone ? 50 : 0) + (pmDone ? 50 : 0);
        const overall = donePct === 100 ? 'ok' : donePct > 0 ? 'progress' : 'pending';
        const overallText = donePct === 100 ? 'Concluído' : donePct > 0 ? 'Em andamento' : 'Pendente';
        const ringColor = donePct === 100 ? '#1b9e4e' : donePct > 0 ? '#2862c4' : '#b7c0d4';
        return `
        <article class="surface month">
          <div class="month-head"><h3>${label}</h3><span class="status-pill ${overall}">${overallText}</span></div>
          <div class="month-ring-wrap"><div class="ring" style="--pct:${donePct};--ring-color:${ringColor}"><b>${donePct}%</b></div></div>
          <div class="month-row"><span>RR</span>${monthBadge('rrs', order, rr, isMaster)}</div>
          <div class="month-row"><span>PMS</span>${monthBadge('pms', order, pm, isMaster)}</div>
          <button type="button" class="month-detail-link" data-label="${escapeAttr(label)}">${ICON_EYE}Ver detalhes do mês</button>
        </article>`;
      }).join('')}
    </div>
  `;
  $$('.month-toggle', el).forEach(b => b.addEventListener('click', () => toggleMonth(b.dataset.table, Number(b.dataset.order), b.dataset.label)));
  $$('.month-detail-link', el).forEach(b => b.addEventListener('click', () => openMonthDetail(b.dataset.label)));
}

function openMonthDetail(label) {
  const cycle = currentCycle();
  const months = MONTHS_BY_CYCLE[cycle.cycle_number] || [];
  const order = months.indexOf(label) + 1;
  const rr = state.rrs.find(r => r.month_order === order);
  const pm = state.pms.find(r => r.month_order === order);
  const rrDone = rr && rr.status === 'concluido', pmDone = pm && pm.status === 'concluido';
  openModal(`
    <h3>${escapeHtml(label)} · ${escapeHtml(cycle.label)}</h3>
    <div class="person-line"><span>RR</span><span class="status-inline ${rrDone ? 'ok' : 'pending'}">${rrDone ? ICON_CHECK : ICON_CLOCK}${rrDone ? 'Realizada' : 'Pendente'}</span></div>
    <div class="person-line"><span>PMS</span><span class="status-inline ${pmDone ? 'ok' : 'pending'}">${pmDone ? ICON_CHECK : ICON_CLOCK}${pmDone ? 'Concluído' : 'Pendente'}</span></div>
    <div class="modal-actions"><button type="button" class="btn-secondary" id="modal-cancel">Fechar</button></div>
  `);
  $('#modal-cancel').addEventListener('click', closeModal);
}

function monthBadge(table, order, row, isMaster) {
  const done = row && row.status === 'concluido';
  const text = done ? (table === 'rrs' ? 'Realizada' : 'Concluído') : 'Pendente';
  const icon = done ? ICON_CHECK : ICON_CLOCK;
  if (!isMaster) return `<span class="status-inline ${done ? 'ok' : 'pending'}">${icon}${text}</span>`;
  return `<button type="button" class="month-toggle status-inline ${done ? 'ok' : 'pending'}" style="background:none;border:none;padding:0" data-table="${table}" data-order="${order}">${icon}${text}</button>`;
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
    <div class="section-head-row">
      <div class="section-head-main">
        <span class="icon-badge lg blue"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg></span>
        <div class="section-head-text"><h2>Sobre o Classe A</h2><p>Informações e regras do ciclo.</p></div>
      </div>
      <span class="section-pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l5 5v13H6V3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 3v5h5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>Regras do programa<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    </div>
    <div class="explainer">
      <article class="surface explain-card">
        <span class="icon-badge blue"><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l5 5v13H6V3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 3v5h5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></span>
        <h3>O que este acompanhamento mostra</h3>
        <p>O Classe A é acompanhado em ciclos trimestrais. Cada ciclo reúne cursos da Universidade do Saber, feedbacks com os colaboradores, RRs e PMS. A visão reúne o status dessas frentes em um só lugar para facilitar o acompanhamento da equipe.</p>
        <div class="note">Este painel mostra apenas o andamento informado pela equipe. Critérios de avaliação, pontuação e regras oficiais do Classe A devem ser consultados nos materiais internos do programa.</div>
      </article>
      <article class="surface explain-card">
        <span class="icon-badge green"><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 11.5l2 2 4.5-4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <h3>O que entra em cada ciclo</h3>
        <ul>
          <li>1 curso obrigatório por colaborador.</li>
          <li>1 feedback por colaborador, realizado pelo gestor.</li>
          <li>3 RRs, uma em cada mês do trimestre.</li>
          <li>3 registros de PMS, um em cada mês do trimestre.</li>
        </ul>
        <div style="text-align:right;margin-top:6px">${ILLUS_CHECKLIST}</div>
      </article>
    </div>
    <div class="surface info-strip">
      <span class="icon-badge blue"><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.35.68-2.46 1.76-3.32C10.5 13.16 9.14 13 8 13Zm8 0c-.29 0-.62.02-.97.05C16.2 13.84 17 14.84 17 16v2h7v-2c0-2.66-5.33-4-8-4Z" fill="currentColor"/></svg></span>
      <div><h4>Classe A</h4><p>Este painel mostra apenas o andamento informado pela equipe. Critérios de avaliação, pontuação e regras oficiais do Classe A devem ser consultados nos materiais internos do programa.</p></div>
    </div>
  `;
}

// ------------------------------------------------------------
// ADMINISTRAÇÃO (somente master)
// ------------------------------------------------------------
function renderAdmin() {
  const el = $('#panel-admin');
  if (!el) return;
  el.innerHTML = `
    <div class="section-head-row">
      <div class="section-head-main">
        <span class="icon-badge lg purple"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.35.68-2.46 1.76-3.32C10.5 13.16 9.14 13 8 13Zm8 0c-.29 0-.62.02-.97.05C16.2 13.84 17 14.84 17 16v2h7v-2c0-2.66-5.33-4-8-4Z" fill="currentColor"/></svg></span>
        <div class="section-head-text"><h2>Administração</h2><p>Aprovações, colaboradores e ciclos</p></div>
      </div>
      <span class="section-pill">Agrupações, colaboradores e ciclos</span>
    </div>

    <div class="surface admin-block">
      <div class="admin-block-main">
        <div class="block-head"><span class="icon-badge sm amber"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></span><div class="block-head-text"><h3>Solicitações de acesso pendentes</h3><p>${state.pendingRequests.length ? state.pendingRequests.length + ' aguardando revisão.' : 'Nenhuma solicitação pendente no momento.'}</p></div></div>
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
              <button type="button" class="pill-btn approve-req">Aprovar</button>
              <button type="button" class="pill-btn light reject-req">Recusar</button>
            </div>
          </div>
        `).join('') : `<span class="section-pill ok">${ICON_CHECK}Tudo em dia</span>`}
      </div>
      <div class="block-illus">${ILLUS_DOCS}</div>
    </div>

    <div class="surface admin-block">
      <div class="admin-block-main">
        <div class="block-head"><span class="icon-badge sm green"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.35.68-2.46 1.76-3.32C10.5 13.16 9.14 13 8 13Zm8 0c-.29 0-.62.02-.97.05C16.2 13.84 17 14.84 17 16v2h7v-2c0-2.66-5.33-4-8-4Z" fill="currentColor"/></svg></span><div class="block-head-text"><h3>Colaboradores</h3><p>Gerencie os colaboradores da equipe.</p></div></div>
        <div class="admin-list">
          ${state.people.map(p => `<span class="chip" style="--dot:${avatarColorFor(p.name)}">${escapeHtml(p.name)}<button type="button" class="chip-remove remove-person" data-id="${p.id}" data-name="${escapeAttr(p.name)}" title="Excluir colaborador">×</button></span>`).join('')}
        </div>
        <form id="add-person-form" class="inline-form add-person-row">
          <div class="search-field">${ICON_SEARCH}<input type="text" id="new-person-name" placeholder="Nome da pessoa" required></div>
          <select id="new-person-type">
            <option value="colaborador">Funcionário (aparece no acompanhamento)</option>
            <option value="master">Máster (acesso administrativo, não aparece aqui)</option>
          </select>
          <button type="submit" class="pill-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>Adicionar</button>
        </form>
        <p class="master-hint" id="new-person-hint" style="display:none">Esta pessoa será cadastrada como <b>Máster</b>: ela não entra na lista de colaboradores acompanhados. Para dar acesso de login a ela, crie a conta pelo cadastro normal e aprove-a em "Solicitações de acesso" escolhendo o nível Máster — ou ajuste o nível dela em "Usuários e permissões" caso já tenha uma conta.</p>
      </div>
      <div class="block-illus">${ILLUS_PEOPLE}</div>
    </div>

    <div class="surface admin-block">
      <div class="admin-block-main">
        <div class="block-head"><span class="icon-badge sm blue"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.3" stroke="currentColor" stroke-width="1.7"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span><div class="block-head-text"><h3>Usuários e permissões</h3><p>Gerencie as permissões de acesso do sistema.</p></div></div>
        <div id="profiles-list">Carregando...</div>
      </div>
      <div class="block-illus">${ILLUS_SHIELD}</div>
    </div>
  `;

  $$('.remove-person', el).forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); removePerson(b.dataset.id, b.dataset.name); }));
  $$('.approve-req', el).forEach(b => b.addEventListener('click', (e) => approveRequest(e.target.closest('.request-row'))));
  $$('.reject-req', el).forEach(b => b.addEventListener('click', (e) => rejectRequest(e.target.closest('.request-row').dataset.req)));
  $$('.req-role', el).forEach(sel => {
    const row = sel.closest('.request-row');
    const personSelect = $('.req-person', row);
    const syncPersonVisibility = () => { personSelect.style.display = sel.value === 'master' ? 'none' : ''; };
    syncPersonVisibility();
    sel.addEventListener('change', syncPersonVisibility);
  });
  $('#new-person-type', el).addEventListener('change', (e) => {
    $('#new-person-hint').style.display = e.target.value === 'master' ? '' : 'none';
  });
  $('#add-person-form', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#new-person-name').value.trim();
    const type = $('#new-person-type').value;
    if (!name) return;
    if (type === 'master') {
      // Máster não é um colaborador acompanhado: não criamos linha em "people".
      // O acesso dela é concedido normalmente (cadastro + aprovação, ou ajuste
      // de nível em "Usuários e permissões"); o aviso acima explica o caminho.
      $('#new-person-hint').style.display = '';
      return;
    }
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

async function removePerson(personId, name) {
  if (!confirm(`Excluir "${name}" da lista de colaboradores? Isso apaga também o histórico de cursos e feedbacks dela em todos os ciclos. As RRs e PMS do trimestre não são afetadas, pois não são por pessoa. Essa ação não pode ser desfeita.`)) return;
  const { error } = await sb.from('people').delete().eq('id', personId);
  if (error) { alert('Erro ao excluir colaborador: ' + error.message); return; }
  await loadCore();
}

async function loadProfilesList() {
  const { data: profiles } = await sb.from('profiles').select('*, people:person_id(name)').order('full_name');
  const masters = (profiles || []).filter(p => p.role === 'master').length;
  const el = $('#profiles-list');
  if (!el) return;
  el.innerHTML = (profiles || []).map(p => `
    <div class="profile-row">
      <div class="profile-row-main">
        <span class="avatar-mini">${p.avatar_url ? `<img src="${escapeAttr(p.avatar_url)}" alt="">` : escapeHtml((p.full_name || '?')[0])}</span>
        <div><strong>${escapeHtml(p.full_name)}</strong>${p.people ? `<small> · ${escapeHtml(p.people.name)}</small>` : ''}<span class="role-pill-badge">${p.role === 'master' ? 'Máster' : 'Colaborador'}</span></div>
      </div>
      <div class="profile-row-actions">
        <select class="role-select" data-id="${p.id}" ${p.id === state.profile.id ? 'disabled title="Você não pode alterar seu próprio nível"' : ''}>
          <option value="colaborador" ${p.role === 'colaborador' ? 'selected' : ''}>Colaborador</option>
          <option value="master" ${p.role === 'master' ? 'selected' : ''}>Máster</option>
        </select>
        ${p.id === state.profile.id ? '' : `<button type="button" class="icon-btn danger delete-profile" data-id="${p.id}" data-name="${escapeAttr(p.full_name)}" title="Excluir usuário"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`}
      </div>
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

  $$('.delete-profile', el).forEach(b => b.addEventListener('click', () => deleteProfile(b.dataset.id, b.dataset.name)));
}

async function deleteProfile(id, name) {
  if (!confirm(`Excluir o acesso de "${name}"? Ela(e) perde o login imediatamente e deixa de aparecer em "Usuários e permissões". Isso não apaga a pessoa da lista de colaboradores, caso exista uma.`)) return;
  const { error } = await sb.from('profiles').delete().eq('id', id);
  if (error) { alert('Erro ao excluir usuário: ' + error.message); return; }
  // Mantém o access_request coerente com o novo estado (evita a tela de
  // "solicitação aprovada" reaparecer para quem perdeu o acesso).
  await sb.from('access_requests').update({ status: 'rejeitado', reviewed_by: state.profile.id, reviewed_at: new Date().toISOString() }).eq('user_id', id).eq('status', 'aprovado');
  await loadProfilesList();
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
  initMyAvatar();
  $('#logout-btn').addEventListener('click', () => sb.auth.signOut());
  $('#pending-logout').addEventListener('click', () => sb.auth.signOut());
  $('#modal-backdrop').addEventListener('click', (e) => { if (e.target.id === 'modal-backdrop') closeModal(); });
  initRealtime();
  boot();
});
