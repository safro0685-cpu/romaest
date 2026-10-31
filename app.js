(() => {
  const $ = (s) => document.querySelector(s);
  const grid = $('#grid'), tabs = $('#tabs'), empty = $('#empty');
  const sheet = $('#sheet'), panel = $('#sheetPanel'), randomBtn = $('#randomBtn');
  const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  const DIFF = ['', 'Легко', 'Средне', 'Сложно'];
  let current = 'all';
  let openedFromApp = false;
  let lastRandom = null;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // --- отметки ингредиентов (запоминаются на телефоне мамы) ---
  const store = {
    get(k) { try { return localStorage.getItem(k) === '1'; } catch { return false; } },
    set(k, v) { try { v ? localStorage.setItem(k, '1') : localStorage.removeItem(k); } catch {} },
  };

  function cover(r, big) {
    const c = catById[r.category] || { color: '#FF7A45', emoji: '🍽️' };
    const cls = 'cover' + (big ? ' cover--big' : '');
    if (r.photo) {
      return `<div class="${cls}" style="--c:${c.color}"><img src="img/${esc(r.photo)}" alt="${esc(r.title)}" loading="lazy"></div>`;
    }
    return `<div class="${cls} cover--ph" style="--c:${c.color}"><span>${r.emoji || c.emoji}</span></div>`;
  }

  const dots = (n) =>
    `<span class="dots">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

  const meta = (r) => `
    <div class="meta">
      <span>⏱ ${esc(r.time)}</span>
      <span>${dots(r.difficulty)} ${DIFF[r.difficulty] || ''}</span>
      <span>👥 ${esc(r.servings)} порц.</span>
    </div>`;

  function renderTabs() {
    const used = new Set(RECIPES.map((r) => r.category));
    const list = [{ id: 'all', name: 'Всё', emoji: '✨' }, ...CATEGORIES.filter((c) => used.has(c.id))];
    tabs.innerHTML = list.map((c) =>
      `<button class="tab${c.id === current ? ' is-active' : ''}" data-cat="${c.id}">${c.emoji} ${c.name}</button>`
    ).join('');
  }

  function renderGrid() {
    const items = RECIPES.filter((r) => current === 'all' || r.category === current);
    empty.hidden = items.length > 0;
    grid.innerHTML = items.map((r, i) => `
      <button class="card" data-id="${esc(r.id)}" style="animation-delay:${i * 60}ms">
        ${cover(r)}
        <div class="card__body">
          <span class="card__cat">${esc((catById[r.category] || {}).name)}</span>
          <h3 class="card__title">${esc(r.title)}</h3>
          ${r.note ? `<p class="card__note">${esc(r.note)}</p>` : ''}
          ${meta(r)}
        </div>
      </button>`).join('');
  }

  function openRecipe(id) {
    const r = RECIPES.find((x) => x.id === id);
    if (!r) return;
    const c = catById[r.category] || {};
    panel.innerHTML = `
      <button class="back" data-close aria-label="Назад">←</button>
      ${cover(r, true)}
      <div class="sheet__body">
        <span class="card__cat">${c.emoji || ''} ${esc(c.name)}</span>
        <h2 class="sheet__title">${esc(r.title)}</h2>
        ${r.note ? `<p class="sheet__note">${esc(r.note)}</p>` : ''}
        ${meta(r)}
        ${r.wishes && r.wishes.length ? `
          <div class="wishes">
            <h3>💬 Как я люблю</h3>
            <ul>${r.wishes.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
          </div>` : ''}
        <h3 class="h3">🛒 Ингредиенты</h3>
        <ul class="ingr">
          ${r.ingredients.map((g, i) => {
            const k = `roma:${r.id}:${i}`;
            return `<li><label>
              <input type="checkbox" data-k="${esc(k)}"${store.get(k) ? ' checked' : ''}>
              <span class="box"></span><span class="txt">${esc(g)}</span>
            </label></li>`;
          }).join('')}
        </ul>
        <h3 class="h3">👩‍🍳 Как готовить</h3>
        <ol class="steps">
          ${r.steps.map((s, i) => `<li><span class="num">${i + 1}</span><p>${esc(s)}</p></li>`).join('')}
        </ol>
        <button class="done" data-close>Спасибо, мам! ❤️</button>
      </div>`;
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock');
    panel.scrollTop = 0;
  }

  function closeSheet() {
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lock');
  }

  // Ссылка вида сайт/#borsch открывает рецепт, кнопка «назад» на телефоне закрывает
  function route() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && RECIPES.some((r) => r.id === id)) openRecipe(id);
    else closeSheet();
  }

  function go(id) {
    openedFromApp = true;
    location.hash = encodeURIComponent(id);
  }

  function requestClose() {
    if (openedFromApp) {
      openedFromApp = false;
      history.back();
    } else {
      history.replaceState(null, '', location.pathname + location.search);
      closeSheet();
    }
  }

  // --- события ---
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('.tab');
    if (!b) return;
    current = b.dataset.cat;
    renderTabs();
    renderGrid();
  });

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card) go(card.dataset.id);
  });

  sheet.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) requestClose();
  });

  panel.addEventListener('change', (e) => {
    if (e.target.matches('input[data-k]')) store.set(e.target.dataset.k, e.target.checked);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet.classList.contains('is-open')) requestClose();
  });

  randomBtn.addEventListener('click', () => {
    if (!RECIPES.length) return;
    let pool = RECIPES.filter((r) => r.id !== lastRandom);
    if (!pool.length) pool = RECIPES;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    lastRandom = pick.id;
    randomBtn.classList.remove('rolling');
    void randomBtn.offsetWidth;
    randomBtn.classList.add('rolling');
    setTimeout(() => go(pick.id), 550);
  });

  window.addEventListener('hashchange', route);

  renderTabs();
  renderGrid();
  route();
})();
