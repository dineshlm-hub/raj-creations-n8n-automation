/* Raj Creation – Mahek's order page (rajcreation.info/orders/).
   Log in with a code sent to WhatsApp, check website orders, change them (out of stock, limited stock,
   replacement, extra items, shipping) and tell the customer. Talks to the n8n workflow "RC - Order Portal". */
(() => {
  'use strict';

  const P = window.RC_PORTAL;
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const norm = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const noZeros = (n) => n.replace(/(^|[A-Z])0+(?=\d)/g, '$1');
  const core = (s) => norm(s).replace(/^(RC|RJ|RAJ|RT|TESLA|T)(?=\d)/, '');
  const keysFor = (s) => { const n = norm(s), c = core(s); return [n, c, noZeros(n), noZeros(c)].filter(Boolean); };
  const round05 = (x) => Math.round(x * 2) / 2;
  const nice = (p) => '+' + String(p || '').replace(/^91(\d{5})(\d{5})$/, '91 $1 $2');
  const STATUS = { new: 'New', updated: 'Updated by customer', confirmed: 'Confirmed', cancelled: 'Cancelled' };
  const units = (u, n) => (u === 'box' ? (n === 1 ? 'box' : 'boxes') : (n === 1 ? 'packet' : 'packets'));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* private mode */ } },
  };

  // ---------- API ----------
  let session = store.get('rc_portal');
  if (session && !(session.token && session.exp > Date.now())) { store.del('rc_portal'); session = null; }
  async function api(action, data = {}) {
    const body = new URLSearchParams({ p: JSON.stringify(Object.assign({ action, token: session ? session.token : '' }, data)) });
    let res;
    try {
      const r = await fetch(P.api, { method: 'POST', body, cache: 'no-store' }); // a plain form post: no CORS preflight
      res = await r.json();
    } catch (e) {
      return { ok: false, error: 'network', message: 'Could not reach the server. Check the internet connection and try again.' };
    }
    if (res && res.error === 'login' && action !== 'logout') { store.del('rc_portal'); session = null; showLogin('Your login has expired – please log in again.'); }
    return res || { ok: false, error: 'server', message: 'No answer from the server.' };
  }

  // ---------- rate list and photos (for replacements and extra items) ----------
  let rates = null, photos = {};
  function parseCSV(text) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows.filter((r) => r.some((v) => v.trim()));
  }
  const num = (v) => { const n = parseFloat(String(v ?? '').replace(/[₹,\s]/g, '')); return Number.isFinite(n) ? n : NaN; };
  function sheetCat(s) {
    const k = String(s || '').toLowerCase();
    if (k.includes('clutch')) return 'clutchers';
    if (k.includes('bow')) return 'tie-bow';
    if (/scrunch|rubber|band|donut/.test(k)) return 'scrunchies';
    return 'other';
  }
  async function loadRates() {
    if (rates) return rates;
    const getJSON = async (u) => { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(u); return r.json(); };
    try { photos = (await getJSON(P.base + 'data/photos.json')).photos || {}; } catch { photos = {}; }
    let rows = null;
    try {
      const src = await getJSON(P.rates + 'source.json');
      if (src.csv) {
        const r = await fetch(src.csv, { cache: 'no-cache' });
        if (r.ok) {
          const data = parseCSV(await r.text());
          const head = data.shift().map((h) => h.trim());
          rows = data.map((d) => Object.fromEntries(head.map((h, i) => [h, d[i] ?? ''])));
        }
      }
    } catch { /* use the copy uploaded with the site */ }
    if (!rows) { try { rows = await getJSON(P.rates + 'rates.json'); } catch { rows = []; } }
    rates = [];
    for (const r of rows) {
      const code = String(r['Code'] ?? '').trim(), rate = num(r['Rate per dozen']), pkt = num(r['Packet (dozen)']);
      if (!code || !(rate > 0) || !(pkt > 0)) continue;
      if (String(r['Show'] ?? 'Y').trim().toUpperCase() === 'N') continue;
      rates.push({ code, desc: String(r['Description'] ?? '').trim(), cat: sheetCat(r['Category']), rate, pkt });
    }
    return rates;
  }
  const photoOf = (code) => { for (const k of keysFor(code)) if (photos[k]) return P.base + photos[k]; return ''; };
  const thumb = (code) => { const p = photoOf(code); return p ? `<img class="thumb" src="${esc(p)}" alt="" loading="lazy">` : '<span class="thumb" aria-hidden="true"></span>'; };
  // the order's price level ("Reseller / New Business" …) -> rate on top of the base rate, as on the website
  function levelType(level) {
    const l = String(level || '').toLowerCase();
    const id = l.includes('wholesal') ? 'wholesaler' : l.includes('retail') ? 'retailer' : l.includes('resell') ? 'reseller' : 'other';
    return P.types.find((t) => t.id === id) || P.types[0];
  }
  const unitAt = (r, t) => (t.add ? r.rate + t.add : round05(r.rate * (1 + t.pct / 100)));

  // ---------- views ----------
  function setBar(html) { $('#bar').hidden = !html; $('#bar-in').innerHTML = html || ''; }
  function setTitle(t) { $('#top-title').textContent = t || 'Raj Creation · Orders'; $('#logout').hidden = !session; }
  function openSheet(html) { $('#panel').innerHTML = html; $('#sheet').hidden = false; document.body.style.overflow = 'hidden'; }
  function closeSheet() { $('#sheet').hidden = true; $('#panel').innerHTML = ''; document.body.style.overflow = ''; }
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet' || e.target.closest('[data-close]')) closeSheet(); });
  const busy = (btn, on, label) => { if (!btn) return; btn.disabled = on; if (on) { btn.dataset.label = btn.innerHTML; btn.innerHTML = '<span class="spin"></span> ' + esc(label || 'Please wait…'); } else if (btn.dataset.label) btn.innerHTML = btn.dataset.label; };
  const note = (kind, text) => `<p class="msg ${kind}" role="${kind === 'err' ? 'alert' : 'status'}">${esc(text)}</p>`;

  // ---- login ----
  function showLogin(msg) {
    setTitle(); setBar('');
    app.innerHTML = `<div class="card"><h1>Log in</h1>
      <p class="muted">A 6-digit login code is sent to Mahek's WhatsApp from the Raj Creation bot.</p>
      ${msg ? note('warn', msg) : ''}<div id="login-msg"></div>
      <button class="btn primary block" type="button" id="send-code">Send code to WhatsApp</button>
      <form id="code-form" hidden>
        <label class="field"><span>Code from WhatsApp</span>
          <input class="code-input" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></label>
        <button class="btn primary block" type="submit" id="verify">Log in</button>
        <button class="link" type="button" id="resend">Send a new code</button>
      </form>
      <p class="muted small">No code? WhatsApp only lets the bot message Mahek within 24 hours of her last message to it – send "hi" to the bot first.</p></div>`;
    const sendCode = async (btn) => {
      busy(btn, true, 'Sending…');
      const res = await api('request_code');
      busy(btn, false);
      $('#login-msg').innerHTML = res.ok ? note('ok', `Code sent to WhatsApp ${res.to || ''}. It works for ${res.minutes || 10} minutes.`) : note('err', res.message);
      if (res.ok || res.error === 'wait') { $('#code-form').hidden = false; $('#send-code').hidden = true; $('#code').focus(); }
    };
    $('#send-code').onclick = (e) => sendCode(e.currentTarget);
    $('#resend').onclick = (e) => sendCode(e.currentTarget);
    $('#code-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('#verify');
      busy(btn, true, 'Checking…');
      const res = await api('verify_code', { code: $('#code').value.trim() });
      busy(btn, false);
      if (!res.ok) { $('#login-msg').innerHTML = note('err', res.message); return; }
      session = { token: res.token, exp: res.exp_ms };
      store.set('rc_portal', session);
      showList();
    };
  }
  $('#logout').onclick = async () => { await api('logout'); store.del('rc_portal'); session = null; showLogin(); };

  // ---- order list ----
  let listFilter = store.get('rc_portal_filter') || 'open', listQuery = '', listCache = null;
  async function showList(refresh = true) {
    setTitle(); setBar('');
    if (refresh || !listCache) {
      app.innerHTML = '<p class="muted"><span class="spin"></span> Loading orders…</p>';
      const res = await api('list');
      if (!res.ok) { if (res.error !== 'login') app.innerHTML = note('err', res.message) + '<button class="btn" type="button" id="retry">Try again</button>'; const b = $('#retry'); if (b) b.onclick = () => showList(); return; }
      listCache = res.orders;
    }
    const chip = (id, label) => `<button class="chip" type="button" data-f="${id}" aria-pressed="${listFilter === id}">${label}</button>`;
    app.innerHTML = `<div class="chips">${chip('open', 'Open')}${chip('confirmed', 'Confirmed')}${chip('all', 'All')}
      <button class="chip" type="button" id="reload">↻ Refresh</button></div>
      <input type="search" id="q" placeholder="Search order ID, name, shop, city or phone" value="${esc(listQuery)}" aria-label="Search orders">
      <div id="orders" style="margin-top:12px"></div>`;
    const render = () => {
      const q = listQuery.toLowerCase().trim();
      const rows = listCache.filter((o) => (listFilter === 'all' || (listFilter === 'open' ? !['confirmed', 'cancelled'].includes(o.status) : o.status === listFilter))
        && (!q || [o.order_id, o.name, o.shop, o.city, o.phone].join(' ').toLowerCase().includes(q)));
      $('#orders').innerHTML = rows.length ? rows.map((o) => `<button class="card order" type="button" data-id="${esc(o.order_id)}">
          <div class="row1"><span class="id">${esc(o.order_id)}</span><span class="badge ${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span></div>
          <div>${esc([o.shop || o.name, o.city].filter(Boolean).join(', '))}${o.shop && o.name ? ` <span class="muted">· ${esc(o.name)}</span>` : ''}</div>
          <div class="row1 small muted"><span>${esc(String(o.created_at).slice(0, 16))} · ${o.lines} items, ${o.packets} pkts${o.needs_sales ? ' · ⚠️ cartons' : ''}</span><b style="color:var(--ink)">${inr(o.grand_total || o.total)}</b></div>
        </button>`).join('') : `<p class="muted">${listCache.length ? 'No orders match.' : 'No website orders yet.'}</p>`;
    };
    render();
    app.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { listFilter = b.dataset.f; store.set('rc_portal_filter', listFilter); showList(false); }; });
    $('#reload').onclick = () => showList(true);
    $('#q').oninput = (e) => { listQuery = e.target.value; render(); };
    $('#orders').onclick = (e) => { const b = e.target.closest('[data-id]'); if (b) openOrder(b.dataset.id); };
  }

  // ---- order editor ----
  // lines: the editable copy. Each line: { code, desc, packets, unit, dz, rate, orig (the ordered line or null),
  // state: 'ok' | 'oos' | 'removed', limited, replaces (code of the out-of-stock item it replaces) }
  let ed = null;
  async function openOrder(id, msg) {
    setTitle(id); setBar('');
    app.innerHTML = '<p class="muted"><span class="spin"></span> Loading order…</p>';
    const res = await api('get', { order_id: id });
    if (!res.ok) { if (res.error !== 'login') { app.innerHTML = note('err', res.message) + '<button class="btn" type="button" id="back">← All orders</button>'; $('#back').onclick = () => showList(); } return; }
    startEdit(res, msg);
    loadRates(); // in the background, for the item picker
  }
  function startEdit(res, msg) {
    const o = res.order;
    ed = {
      o, customer: res.customer, templateOk: res.template_ok, msg,
      lines: o.items.map((x) => ({ ...x, orig: { ...x }, state: 'ok', limited: false, replaces: '' })),
      shipping: o.shipping >= 0 ? String(o.shipping) : '', note: '', notify: true,
    };
    renderEdit();
  }
  const liveLines = () => ed.lines.filter((l) => l.state === 'ok');
  function totals() {
    const items = liveLines();
    const it = r2(items.reduce((s, l) => s + l.packets * l.dz * l.rate, 0));
    const h = Number(ed.o.handling) || 0;
    const gst = r2((it + h) * P.gst / 100);
    const ship = ed.shipping === '' ? -1 : Number(ed.shipping);
    return { it, h, gst, total: r2(it + h + gst), ship, grand: ship >= 0 ? r2(it + h + gst + ship) : null, packets: items.reduce((s, l) => s + l.packets, 0) };
  }
  const changed = () => ed.lines.some((l) => !l.orig || l.state !== 'ok' || l.packets !== l.orig.packets);
  function lineHtml(l, i) {
    const amt = r2(l.packets * l.dz * l.rate);
    const tags = [];
    if (l.state === 'oos') tags.push('<span class="tag oos">Out of stock</span>');
    if (l.state === 'removed') tags.push('<span class="tag oos">Removed</span>');
    if (l.limited && l.state === 'ok') tags.push(`<span class="tag lim">Only ${l.packets} available (ordered ${l.orig.packets})</span>`);
    else if (l.orig && l.state === 'ok' && l.packets !== l.orig.packets) tags.push(`<span class="tag chg">${l.orig.packets} → ${l.packets}</span>`);
    if (!l.orig) tags.push(`<span class="tag new">${l.replaces ? 'Replaces ' + esc(l.replaces) : 'Added'}</span>`);
    const off = l.state !== 'ok';
    return `<div class="line${off ? ' off' : ''}" data-i="${i}">${thumb(l.code)}<div>
      <div class="head"><span class="code">${esc(l.code)}</span><span class="amt">${inr(amt)}</span></div>
      <div class="sub small muted">${esc(l.desc || '')} · ${l.dz} dz/${l.unit} · ${inr(l.rate)}/dz</div>
      <div>${tags.join('')}</div>
      ${off ? `<div class="acts"><button class="btn small" type="button" data-a="undo">↩ Undo</button>${l.state === 'oos' && !ed.lines.some((x) => x.replaces === l.code && x.state === 'ok') ? '<button class="btn small" type="button" data-a="replace">🔁 Suggest replacement</button>' : ''}</div>`
        : `<div class="qty"><button class="btn step" type="button" data-a="minus" aria-label="One less">−</button>
          <input type="number" min="1" step="1" inputmode="numeric" value="${l.packets}" data-a="qty" aria-label="${esc(l.code)} ${l.unit === 'box' ? 'boxes' : 'packets'}">
          <button class="btn step" type="button" data-a="plus" aria-label="One more">+</button><span class="small muted">${units(l.unit, l.packets)}</span></div>
        <div class="acts">${l.orig ? `<button class="btn small" type="button" data-a="oos">❌ Out of stock</button>
          <button class="btn small" type="button" data-a="limited">⚠️ Only some</button>
          <button class="btn small" type="button" data-a="replace">🔁 Replace</button>` : ''}
          <button class="btn small" type="button" data-a="remove">${l.orig ? '➖ Remove' : '✕ Remove'}</button></div>`}
    </div></div>`;
  }
  function renderEdit() {
    const o = ed.o, c = ed.customer || {}, t = totals();
    setTitle(o.order_id);
    const win = c.window_open ? '<span class="tag new">Messaged in the last 24 h – updates go as a normal WhatsApp message</span>'
      : ed.templateOk ? '<span class="tag lim">No message in 24 h – the update goes as the approved "order update" template</span>'
        : '<span class="tag lim">No message in 24 h – you will send the update from your own WhatsApp (one tap)</span>';
    app.innerHTML = `<button class="link" type="button" id="back">← All orders</button>
      ${ed.msg ? note(ed.msg.kind, ed.msg.text) : ''}
      <div class="card"><div class="row1" style="display:flex;justify-content:space-between;gap:8px"><h1>${esc(o.shop || o.name || 'Customer')}</h1><span class="badge ${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span></div>
        <dl class="kv"><dt>Customer</dt><dd>${esc(c.name || o.name || '-')}${o.city ? ', ' + esc(o.city) : ''}</dd>
          <dt>Phone</dt><dd><a href="https://wa.me/${esc(o.phone)}" target="_blank" rel="noopener">${esc(nice(o.phone))}</a> (opens WhatsApp)</dd>
          <dt>Price level</dt><dd>${esc(o.level || '-')}</dd>
          <dt>Language</dt><dd>${esc({ en: 'English', hi: 'Hindi', gu: 'Gujarati', ta: 'Tamil', te: 'Telugu' }[o.lang] || o.lang)}</dd>
          <dt>Ordered</dt><dd>${esc(o.created_at)}${o.version > 1 ? ` · version ${o.version}` : ''}</dd>
          ${o.confirmed_at ? `<dt>Confirmed</dt><dd>${esc(o.confirmed_at)}</dd>` : ''}</dl>
        <div style="margin-top:6px">${win}</div>
        ${o.needs_sales ? note('warn', 'Needs your call: cartons / mixed boxes and packets.') : ''}
        ${o.note ? `<details class="small muted" style="margin-top:8px"><summary>Order notes</summary>${esc(o.note)}</details>` : ''}</div>
      <div class="card"><h2>Items</h2><div id="lines">${ed.lines.map(lineHtml).join('')}</div>
        <button class="btn block" type="button" id="add" style="margin-top:10px">➕ Add an item</button></div>
      <div class="card"><h2>Shipping & note</h2>
        <label class="field"><span>Shipping cost (₹)</span><input type="number" min="0" step="1" inputmode="decimal" id="ship" value="${esc(ed.shipping)}" placeholder="Not set yet – 0 for free shipping"></label>
        <label class="field"><span>Note to the customer (optional)</span><textarea id="note" maxlength="500" placeholder="e.g. Sorry, this colour is finished. The new stock comes next week.">${esc(ed.note)}</textarea></label>
        <div class="totals" id="totals"></div></div>`;
    renderTotals(t);
    setBar(`<button class="btn primary" type="button" id="review">Review & send</button><button class="btn" type="button" id="confirm">✅ Confirm & PDF</button>`);
    $('#back').onclick = () => { if (!changed() || confirm('Leave without saving your changes?')) showList(); };
    $('#add').onclick = () => openPicker(null);
    $('#ship').oninput = (e) => { ed.shipping = e.target.value.trim(); renderTotals(); };
    $('#note').oninput = (e) => { ed.note = e.target.value; };
    $('#lines').onclick = onLineClick;
    $('#lines').onchange = (e) => {
      if (e.target.dataset.a !== 'qty') return;
      const l = ed.lines[+e.target.closest('[data-i]').dataset.i];
      const n = Math.floor(Number(e.target.value));
      if (n >= 1) { l.packets = n; if (l.orig && n >= l.orig.packets) l.limited = false; }
      renderEdit();
    };
    $('#review').onclick = () => review(false);
    $('#confirm').onclick = () => review(true);
  }
  function renderTotals(t = totals()) {
    $('#totals').innerHTML = `<div class="r"><span>Items (${t.packets} pkts/boxes)</span><span>${inr(t.it)}</span></div>
      ${t.h ? `<div class="r"><span>Handling & packing</span><span>${inr(t.h)}</span></div>` : ''}
      <div class="r"><span>GST ${P.gst}%</span><span>${inr(t.gst)}</span></div>
      <div class="r"><span>Total incl. GST</span><span>${inr(t.total)}</span></div>
      <div class="r"><span>Shipping</span><span>${t.ship < 0 ? 'not set' : t.ship ? inr(t.ship) : 'free'}</span></div>
      <div class="r grand"><span>Grand total</span><span>${t.grand === null ? inr(t.total) + ' + shipping' : inr(t.grand)}</span></div>
      ${ed.o.total && Math.abs(t.total - ed.o.total) > 0.005 ? `<p class="small muted">Was ${inr(ed.o.total)} incl. GST.</p>` : ''}`;
  }
  function onLineClick(e) {
    const b = e.target.closest('[data-a]');
    if (!b || b.dataset.a === 'qty') return;
    const i = +b.closest('[data-i]').dataset.i, l = ed.lines[i];
    const a = b.dataset.a;
    if (a === 'minus' && l.packets > 1) l.packets--;
    else if (a === 'plus') { l.packets++; if (l.orig && l.packets >= l.orig.packets) l.limited = false; }
    else if (a === 'oos') l.state = 'oos';
    else if (a === 'remove') { if (l.orig) l.state = 'removed'; else ed.lines.splice(i, 1); }
    else if (a === 'undo') { l.state = 'ok'; l.packets = l.orig.packets; l.limited = false; ed.lines = ed.lines.filter((x) => !(x.replaces && norm(x.replaces) === norm(l.code))); }
    else if (a === 'limited') return askLimited(l);
    else if (a === 'replace') { if (l.orig) l.state = 'oos'; return openPicker(l); }
    renderEdit();
  }
  function askLimited(l) {
    openSheet(`<button class="btn small close" type="button" data-close>✕</button><h2>Only some available</h2>
      <p>${esc(l.code)}${l.desc ? ' – ' + esc(l.desc) : ''}: the customer ordered <b>${l.orig.packets} ${units(l.unit, l.orig.packets)}</b>. How many can you send?</p>
      <form id="lim"><label class="field"><span>Available ${l.unit === 'box' ? 'boxes' : 'packets'}</span>
        <input type="number" id="lim-n" min="1" max="${l.orig.packets - 1}" step="1" inputmode="numeric" required value="${Math.max(1, Math.min(l.packets, l.orig.packets - 1))}"></label>
        <p class="small muted">None at all? Close this and tap <b>Out of stock</b> instead.</p>
        <button class="btn primary block" type="submit">Set to this many</button></form>`);
    $('#lim-n').select();
    $('#lim').onsubmit = (e) => {
      e.preventDefault();
      const n = Math.floor(Number($('#lim-n').value));
      if (!(n >= 1 && n < l.orig.packets)) return;
      l.packets = n; l.limited = true; l.state = 'ok';
      closeSheet(); renderEdit();
    };
  }

  // ---- item picker (replacement or extra item) ----
  async function openPicker(forLine) {
    const t = levelType(ed.o.level);
    openSheet(`<button class="btn small close" type="button" data-close>✕</button>
      <h2>${forLine ? 'Replacement for ' + esc(forLine.code) : 'Add an item'}</h2>
      ${forLine ? `<p class="small muted">${esc(forLine.code)} is marked out of stock. Pick the item to send instead – the customer is told it replaces ${esc(forLine.code)}.</p>` : ''}
      <input type="search" id="pq" placeholder="Search code or name, e.g. 707 or claw" aria-label="Search items">
      <p class="small muted">Prices at this customer's level: ${esc(ed.o.level || 'Other')}.</p><div id="plist"><p class="muted"><span class="spin"></span> Loading the rate list…</p></div>`);
    const list = await loadRates();
    if ($('#sheet').hidden) return;
    const render = () => {
      const q = ($('#pq').value || '').trim().toLowerCase(), qn = norm(q);
      const hits = list.filter((r) => !q || (qn && (norm(r.code).includes(qn) || core(r.code).includes(core(qn) || qn))) || r.desc.toLowerCase().includes(q) || r.cat.includes(q)).slice(0, 60);
      $('#plist').innerHTML = hits.length ? hits.map((r, k) => `<button class="pick" type="button" data-k="${list.indexOf(r)}">
          ${photoOf(r.code) ? `<img src="${esc(photoOf(r.code))}" alt="" loading="lazy">` : '<img alt="">'}
          <span><b>${esc(r.code)}</b><br><span class="small muted">${esc(r.desc)} · ${r.pkt} dz/${r.cat === 'scrunchies' ? 'box' : 'pkt'}</span></span>
          <b>${inr(unitAt(r, t))}<span class="small muted">/dz</span></b></button>`).join('')
        : `<p class="muted">${list.length ? 'Nothing found.' : 'The rate list could not be loaded.'}</p>`;
    };
    render();
    $('#pq').oninput = render;
    $('#pq').focus();
    $('#plist').onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) askQty(list[+b.dataset.k], forLine, t); };
  }
  function askQty(r, forLine, t) {
    const unit = r.cat === 'scrunchies' ? 'box' : 'pkt';
    const n0 = forLine ? forLine.orig ? forLine.orig.packets : forLine.packets : 1;
    openSheet(`<button class="btn small close" type="button" data-close>✕</button><h2>${esc(r.code)}</h2>
      <p class="muted">${esc(r.desc)} · ${r.pkt} dz per ${unit === 'box' ? 'box' : 'packet'}${forLine ? ' · replaces ' + esc(forLine.code) : ''}</p>
      <form id="qf"><label class="field"><span>${unit === 'box' ? 'Boxes' : 'Packets'}</span><input type="number" id="qn" min="1" step="1" inputmode="numeric" required value="${n0}"></label>
        <label class="field"><span>Rate per dozen (₹)</span><input type="number" id="qr" min="0.5" step="0.5" inputmode="decimal" required value="${unitAt(r, t)}"></label>
        <p class="small muted">The rate is the customer's price level from the rate list. Change it only if you agreed a different price.</p>
        <button class="btn primary block" type="submit">${forLine ? 'Use as replacement' : 'Add to order'}</button></form>`);
    $('#qn').select();
    $('#qf').onsubmit = (e) => {
      e.preventDefault();
      const n = Math.floor(Number($('#qn').value)), rate = r2(Number($('#qr').value));
      if (!(n >= 1) || !(rate > 0)) return;
      const line = { code: r.code, desc: r.desc, packets: n, unit, dz: r.pkt, rate, orig: null, state: 'ok', limited: false, replaces: forLine ? forLine.code : '' };
      if (forLine) { forLine.state = 'oos'; ed.lines.splice(ed.lines.indexOf(forLine) + 1, 0, line); } else ed.lines.push(line);
      closeSheet(); renderEdit();
    };
  }

  // ---- review, save and send ----
  function payload(confirm) {
    return {
      order_id: ed.o.order_id, version: ed.o.version, confirm, notify: ed.notify, note: ed.note.trim(), shipping: ed.shipping,
      items: liveLines().map((l) => ({ code: l.code, desc: l.desc, packets: l.packets, unit: l.unit, dz: l.dz, rate: l.rate, ...(l.limited ? { stock: 'limited' } : {}), ...(l.replaces ? { replaces: l.replaces } : {}) })),
      removed: ed.lines.filter((l) => l.orig && l.state !== 'ok').map((l) => ({ code: l.code, dz: l.dz, reason: l.state === 'oos' ? 'oos' : 'removed' })),
    };
  }
  async function review(confirm) {
    if (!liveLines().length) { alert('The order has no items left. Add an item, or tell the customer from WhatsApp.'); return; }
    if (confirm && ed.shipping === '') { alert('Enter the shipping cost first (0 for free shipping).'); $('#ship').focus(); return; }
    if (!confirm && !changed() && Number(ed.shipping === '' ? -1 : ed.shipping) === ed.o.shipping) { alert('Nothing changed yet. Mark items out of stock, change packets, replace or add items, or set the shipping cost.'); return; }
    openSheet('<p class="muted"><span class="spin"></span> Preparing the preview…</p>');
    const res = await api('preview', payload(confirm));
    if (!res.ok) { if (res.error === 'changed' && res.order) return reloadChanged(res); openSheet(`<button class="btn small close" type="button" data-close>✕</button>${note('err', res.message)}`); return; }
    const t = res.totals;
    const how = { message: '📲 Goes to the customer as a WhatsApp message from the bot.', template: '📲 Goes to the customer as the approved "order update" WhatsApp template (in English) – they have not messaged in the last 24 hours.', manual: '⚠️ The customer has not messaged in the last 24 hours, so WhatsApp does not let the bot message them. After saving, tap "Send from my WhatsApp" to send it from your phone.', none: '' }[res.how];
    openSheet(`<button class="btn small close" type="button" data-close>✕</button>
      <h2>${confirm ? 'Confirm order & send PDF' : 'Review changes'}</h2>
      ${res.changes.length ? `<ul>${res.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '<p class="muted">No item changes.</p>'}
      <div class="totals"><div class="r"><span>Total incl. GST</span><span>${inr(t.total)}</span></div>
        <div class="r"><span>Shipping</span><span>${t.shipping < 0 ? 'not set' : t.shipping ? inr(t.shipping) : 'free'}</span></div>
        <div class="r grand"><span>Grand total</span><span>${t.shipping < 0 ? inr(t.total) + ' + shipping' : inr(t.grand_total)}</span></div></div>
      ${res.changes.length ? `<label class="check"><input type="checkbox" id="notify" ${ed.notify ? 'checked' : ''}><span>Tell the customer about these changes on WhatsApp</span></label>
        <div id="pv" ${ed.notify ? '' : 'hidden'}><p class="small muted">${esc(how)}</p><div class="preview">${esc(res.message)}</div>
        ${res.message_en ? `<details class="small" style="margin-top:6px"><summary>In English</summary><div class="preview" style="background:#fff">${esc(res.message_en)}</div></details>` : ''}</div>` : ''}
      ${confirm ? '<p class="msg ok">The customer then gets the order confirmation PDF (a reference receipt), and you get a copy on WhatsApp.</p>' : ''}
      <p class="small muted">Their replies on WhatsApp come to you as usual.</p>
      <button class="btn primary block" type="button" id="go">${confirm ? '✅ Save, confirm & send PDF' : res.changes.length ? 'Save & send' : 'Save'}</button>`);
    const box = $('#notify');
    if (box) box.onchange = () => { ed.notify = box.checked; $('#pv').hidden = !box.checked; $('#go').textContent = confirm ? '✅ Save, confirm & send PDF' : box.checked ? 'Save & send' : 'Save without message'; };
    $('#go').onclick = (e) => save(confirm, e.currentTarget);
  }
  async function save(confirm, btn) {
    busy(btn, true, 'Saving…');
    const res = await api('save', payload(confirm));
    busy(btn, false);
    if (!res.ok) { if (res.error === 'changed' && res.order) return reloadChanged(res); openSheet(`<button class="btn small close" type="button" data-close>✕</button>${note('err', res.message)}`); return; }
    const parts = ['Saved.'];
    if (res.how === 'message' || res.how === 'template') parts.push(res.sent ? 'The customer has been sent the update on WhatsApp.' : 'But WhatsApp did not accept the message' + (res.send_error ? ' (' + res.send_error + ')' : '') + ' – send it from your WhatsApp below.');
    if (res.confirmed) parts.push('The PDF is being made – it goes to the customer in a few seconds and you get a copy.');
    const manual = res.manual && res.manual.url;
    // a template can still fail after WhatsApp accepted it (e.g. Meta billing not set up): keep a one-tap fallback
    const backup = !manual && res.how === 'template' && res.sent && res.message && res.order ? `https://wa.me/${res.order.phone}?text=${encodeURIComponent(res.message)}` : '';
    listCache = null;
    openSheet(`<h2>${res.sent === false || manual ? '⚠️ Almost done' : '✅ Done'}</h2>${note(res.sent === false ? 'warn' : 'ok', parts.join(' '))}
      ${manual ? `<p>Send this message to ${esc(nice(res.order.phone))} from your own WhatsApp:</p><div class="preview">${esc(res.manual.message)}</div>
        <a class="btn wa block" style="margin-top:10px" href="${esc(manual)}" target="_blank" rel="noopener">Send from my WhatsApp</a>` : ''}
      ${backup ? `<p class="small muted">If the customer says they did not get it, send the same update from your own WhatsApp:</p>
        <a class="btn block" href="${esc(backup)}" target="_blank" rel="noopener">Send from my WhatsApp too</a>` : ''}
      <button class="btn block" type="button" id="done" style="margin-top:10px">Back to the order</button>`);
    $('#done').onclick = () => { closeSheet(); openOrder(res.order.order_id); };
  }
  function reloadChanged(res) {
    closeSheet();
    startEdit({ order: res.order, customer: ed.customer, template_ok: ed.templateOk }, { kind: 'warn', text: res.message });
  }

  // ---------- start ----------
  if (!P.api || /^\{/.test(P.api)) { app.innerHTML = note('err', 'The order page is not set up yet (no API address).'); return; }
  if (session) showList(); else showLogin();
})();
