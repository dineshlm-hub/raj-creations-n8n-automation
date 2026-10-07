/* Raj Creations catalogue – search, photo viewer, rate list and order cart, in 4 languages. No dependencies. */
(() => {
  'use strict';

  const CFG = window.RC_CONFIG;
  const I18N = window.RC_I18N;
  const TYPES = CFG.types, CARTON = CFG.carton, GST = CFG.gst / 100;
  const typeById = Object.fromEntries(TYPES.map((t) => [t.id, t]));
  const body = document.body;
  const BASE = body.dataset.base || './';
  const PAGE = body.dataset.page;
  const CAT = body.dataset.cat;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* private mode */ } },
  };

  // ---------- language ----------
  const LANGS = I18N.languages.map((l) => l.id);
  let L = (() => {
    const p = new URLSearchParams(location.search).get('lang'); // the WhatsApp bot adds ?lang=hi etc.
    if (p && LANGS.includes(p)) { store.set('rc_lang', p); return p; }
    const s = store.get('rc_lang', null);
    return s && LANGS.includes(s) ? s : 'en';
  })();
  function tr(key, vars = {}) {
    const e = I18N.text[key];
    let s = e ? (e[L] || e.en) : key;
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
    return s;
  }
  const catText = (id, i) => { const c = I18N.categories[id]; return c ? (c[L] || c.en)[i] : (i ? '' : tr('other')); };
  const catName = (id) => catText(id, 0);
  function noteTr(note) {
    if (L === 'en' || !note) return note;
    return note.split(' · ').map((seg) => {
      for (const r of I18N.notes) { const m = seg.match(r.re); if (m && r[L]) return r[L].replace('{1}', m[1] || ''); }
      return seg;
    }).join(' · ');
  }
  function setHtml(el, h) {
    const t = document.createElement('template');
    t.innerHTML = h;
    if (el.innerHTML !== t.innerHTML) el.innerHTML = h;
  }
  function applyStatic() {
    document.documentElement.lang = L;
    // only touch text that changes: rewriting the same words counts as a new paint and delays the speed score (LCP)
    $$('[data-i18n]').forEach((el) => { const v = tr(el.dataset.i18n); if (el.textContent !== v) el.textContent = v; });
    $$('[data-i18n-html]').forEach((el) => { setHtml(el, tr(el.dataset.i18nHtml)); });
    $$('[data-i18n-ph]').forEach((el) => { el.placeholder = tr(el.dataset.i18nPh); });
    $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', tr(el.dataset.i18nAria)); });
    if (CAT) {
      $$('[data-cat-name]').forEach((el) => { if (el.textContent !== catName(CAT)) el.textContent = catName(CAT); });
      $$('[data-cat-tagline]').forEach((el) => { if (el.textContent !== catText(CAT, 1)) el.textContent = catText(CAT, 1); });
    }
    $('#lang').value = L;
  }

  // ---------- helpers ----------
  const norm = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const noZeros = (n) => n.replace(/(^|[A-Z])0+(?=\d)/g, '$1');            // D01 -> D1
  const core = (s) => norm(s).replace(/^(RC|RJ|RAJ|RT|TESLA|T)(?=\d)/, ''); // RC432 -> 432
  const keysFor = (s) => { const n = norm(s), c = core(s); return [n, c, noZeros(n), noZeros(c)].filter(Boolean); };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const round05 = (x) => Math.round(x * 2) / 2;
  const inr = (n) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const inr0 = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  const waUrl = (text) => `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(text)}`;
  const title = (it) => it.codes.join(' / ');
  const ratesUrl = () => (token ? `${BASE}p/${token}/` : '#');
  // Order ID, e.g. RC-1007-K3F9. One ID per cart: sending again after a change (or from the bot's "Edit order"
  // link) updates the same order. Emptying the cart starts a new order next time.
  const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function newOrderId() {
    const d = new Date(), r = new Uint32Array(4);
    (window.crypto || window.msCrypto).getRandomValues(r);
    return `RC-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${[...r].map((x) => ID_CHARS[x % ID_CHARS.length]).join('')}`;
  }
  const ORDER_DAYS = 7;
  function currentOrder() { // { id, sent, edit } while this cart belongs to an order, else null
    const o = store.get('rc_order', null);
    return o && o.id && Date.now() - (o.at || 0) < ORDER_DAYS * 864e5 ? o : null;
  }

  let toastTimer;
  function toast(msg, ms = 2400) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ---------- state ----------
  let cats = {}, items = [], itemById = {};
  let token = null, rates = null, rateByKey = {};
  let cart = store.get('rc_cart', {});
  // Business type comes from the WhatsApp bot link (#type=…); it is the customer's starting price level.
  let typeId = typeById[store.get('rc_type', null)] ? store.get('rc_type', null) : null;
  let rateTab = 'all';

  // ---------- data loading ----------
  async function getJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json();
  }

  function parseCSV(text) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { f += '"'; i++; }
        else if (c === '"') q = false;
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); rows.push(row); row = []; f = '';
      } else f += c;
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
    const dir = `${BASE}p/${token}/`;
    let src;
    try { src = await getJSON(dir + 'source.json'); } catch { return null; } // link no longer valid
    let rows = null;
    if (src.csv) {
      try {
        const r = await fetch(src.csv, { cache: 'no-cache' });
        if (r.ok) {
          const data = parseCSV(await r.text());
          const head = data.shift().map((h) => h.trim());
          rows = data.map((d) => Object.fromEntries(head.map((h, i) => [h, d[i] ?? ''])));
        }
      } catch { /* fall back to the copy uploaded with the site */ }
    }
    if (!rows) { try { rows = await getJSON(dir + 'rates.json'); } catch { rows = []; } }

    const out = [], seen = {};
    for (const r of rows) {
      const code = String(r['Code'] ?? '').trim();
      const rate = num(r['Rate per dozen']);
      const pkt = num(r['Packet (dozen)']);
      if (!code || !(rate > 0) || !(pkt > 0)) continue;
      if (String(r['Show'] ?? 'Y').trim().toUpperCase() === 'N') continue;
      const cat = sheetCat(r['Category']);
      let key = `${cat}|${norm(code)}|${pkt}`;
      seen[key] = (seen[key] || 0) + 1;
      if (seen[key] > 1) key += `#${seen[key]}`;
      out.push({ key, code, desc: String(r['Description'] ?? '').trim(), cat, rate, pkt, link: norm(r['Catalogue item']), item: null });
    }
    return out;
  }

  function linkRates() {
    for (const r of rates) {
      if (!r.link) continue;
      const it = items.find((i) => i.cat === r.cat && i.codes.some((c) => norm(c) === r.link))
        || items.find((i) => i.codes.some((c) => norm(c) === r.link));
      if (it) r.item = it;
    }
    // order: catalogue order first, then items without a photo by code
    const pos = new Map(items.map((it, i) => [it, i]));
    const catOrder = Object.keys(cats);
    const nat = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
    rates.sort((a, b) => {
      const oa = catOrder.includes(a.cat) ? catOrder.indexOf(a.cat) : 99, ob = catOrder.includes(b.cat) ? catOrder.indexOf(b.cat) : 99;
      if (oa !== ob) return oa - ob;
      const pa = a.item ? pos.get(a.item) : 1e6, pb = b.item ? pos.get(b.item) : 1e6;
      return pa - pb || nat.compare(a.code, b.code);
    });
    for (const it of items) it.rates = rates.filter((r) => r.item === it); // sorted: RT-1, RT-2 … RT-10
    rateByKey = Object.fromEntries(rates.map((r) => [r.key, r]));
    shownMemo = null;
    for (const k of Object.keys(cart)) if (!rateByKey[k]) delete cart[k];
    store.set('rc_cart', cart);
  }

  // ---------- pricing ----------
  // Price levels (CFG.types) run from highest prices to lowest: a % on the base rate, or (carton) rupees per
  // dozen on top. The increase itself is never shown. A customer starts at the business type from the bot
  // link ("Other" if unknown) and automatically gets a cheaper "open" level once the order meets its minimum.
  // Every level can be viewed for comparison.
  const rank = (t) => TYPES.indexOf(t);
  const baseType = () => typeById[typeId] || typeById.other || TYPES[0];
  const unitAt = (r, t) => (t.add ? r.rate + t.add : round05(r.rate * (1 + t.pct / 100)));
  const cartLines = () => Object.entries(cart).map(([k, n]) => ({ r: rateByKey[k], n })).filter((l) => l.r && l.n > 0);
  const sumAt = (lines, t) => lines.reduce((s, l) => s + l.n * l.r.pkt * unitAt(l.r, t), 0);
  // Cartons: all boxes or all packets, whole cartons only.
  function cartonCheck(lines) {
    const count = lines.reduce((s, l) => s + l.n, 0), boxes = lines.filter((l) => isBox(l.r)).reduce((s, l) => s + l.n, 0);
    if (!count) return { ok: false };
    if (boxes && boxes < count) return { mixed: true };
    const kind = boxes ? 'box' : 'packet', c = CARTON[kind], cartons = Math.ceil(count / c.max);
    return { kind, cartons, short: count < c.min, need: c.min * cartons - count, remove: count - c.max * (cartons - 1), ok: count >= c.min && c.min * cartons <= count };
  }
  const qualifies = (t, lines) => (t.carton ? cartonCheck(lines).ok : sumAt(lines, t) >= t.mov);
  // Too small for this level's minimum? (a mixed wholesale cart smaller than one carton counts as too small)
  function tooSmall(t, lines) {
    if (!t.carton) return sumAt(lines, t) < t.mov;
    const cc = cartonCheck(lines), count = lines.reduce((s, l) => s + l.n, 0);
    return !!(cc.short || (cc.mixed && count < Math.min(CARTON.box.min, CARTON.packet.min)));
  }
  function appliedType(lines = cartLines()) {
    let best = baseType();
    // Below their own minimum (e.g. a retailer ordering under Rs 12,000): use the next price level whose minimum the order
    // meets, and tell them what to add to get their own prices back.
    if (lines.length && tooSmall(best, lines)) {
      const higher = TYPES.slice(0, rank(best)).filter((t) => !t.carton);
      const fits = higher.filter((t) => sumAt(lines, t) >= t.mov).pop();
      const easiest = higher.slice().sort((a, b) => a.mov - b.mov || rank(b) - rank(a))[0];
      if (fits) best = fits;
      else if (easiest && (best.carton || easiest.mov < best.mov)) best = easiest;
    }
    for (const t of TYPES) if (t.open && rank(t) > rank(best) && qualifies(t, lines)) best = t;
    return best;
  }
  let viewId = null; // a price level the customer tapped to compare; null = the prices their order gets
  let shownMemo = null;
  const shownType = () => (shownMemo ||= (viewId && typeById[viewId]) || appliedType());
  const unit = (r, t = shownType()) => unitAt(r, t);
  const typeName = (id) => tr('type.' + id);
  const movText = (t) => (t.carton ? tr('movCarton', { b: CARTON.box.min, p: CARTON.packet.min }) : tr('movAmt', { x: inr0(t.mov) }));
  const typeText = () => tr('typeText', { type: typeName(shownType().id), mov: movText(shownType()) });
  const cheapest = () => TYPES[TYPES.length - 1];
  const bulkHtml = (r) => (shownType() === cheapest() ? '' : `<span class="bulk">${esc(tr('bulkPrice', { p: inr(unitAt(r, cheapest())) }))}</span>`);
  const promoText = () => tr('promo.text', { x: inr0((TYPES.find((t) => t.open && !t.carton) || {}).mov || 0), b: CARTON.box.min, p: CARTON.packet.min });
  const up10 = (x) => Math.ceil(x / 10) * 10;

  // Scrunchies, rubber bands & bun donuts are packed in boxes; everything else in packets.
  const isBox = (r) => r.cat === 'scrunchies';
  const ut = (r, key, vars) => tr(isBox(r) ? key + 'Box' : key, vars);
  const packHtml = (r, u) => `<span class="pack">${esc(ut(r, 'packetOf', { d: r.pkt, p: inr0(u * r.pkt) }))}</span>`;
  function countText(lines, kind) { // kind: '' (Packets) or 'ob' (19 packets)
    const boxes = lines.filter((l) => isBox(l.r)).length;
    const k = boxes === lines.length ? 'Boxes' : boxes ? 'Mixed' : 'Packets';
    const n = lines.reduce((s, l) => s + l.n, 0);
    return kind ? tr('ob' + k + (n === 1 && k !== 'Mixed' ? '1' : ''), { n }) : tr('count' + k);
  }

  function setQty(key, n, quiet) { // returns the price-level message, if the level changed (shown as a toast unless quiet)
    n = Math.max(0, Math.min(999, Math.floor(n)));
    const before = shownType();
    if (n) cart[key] = n; else delete cart[key];
    store.set('rc_cart', cart);
    if (!Object.keys(cart).length) store.del('rc_order');
    shownMemo = null;
    if (shownType() !== before) { // prices changed: redraw them all
      refresh();
      const msg = !viewId && rank(shownType()) < rank(baseType()) ? tr('levelDown', { type: typeName(shownType().id) })
        : rank(shownType()) > rank(before) ? tr('levelNow', { type: typeName(shownType().id) }) : '';
      if (msg && !quiet) toast(msg, 4000);
      return msg;
    }
    // Update only this item's buttons in place, so quick repeated taps keep landing on the same button.
    const r = rateByKey[key];
    for (const el of $$('[data-add], .stepper[data-key]')) {
      if ((el.dataset.add || el.dataset.key) !== key) continue;
      if (n && el.classList.contains('stepper')) el.querySelector('input').value = n;
      else if (r) el.outerHTML = addCtl(r);
    }
    if ($('#cart').open) renderCart();
    updateInOrder();
    renderOrderBar();
  }

  function addCtl(r) {
    const n = cart[r.key] || 0;
    const v = { code: r.code, u: ut(r, 'unitWord'), us: ut(r, 'unitsWord') };
    if (!n) return `<button class="add-btn" type="button" data-add="${esc(r.key)}" aria-label="${esc(tr('a11y.add', v))}">${esc(tr('add'))}</button>`;
    // The number can be typed (e.g. 47) instead of pressing + many times.
    return `<span class="stepper" data-key="${esc(r.key)}"><button type="button" data-step="-1" aria-label="${esc(tr('a11y.less', v))}">−</button>`
      + `<label class="qty"><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" enterkeyhint="done" value="${n}" data-qty="${esc(r.key)}" aria-label="${esc(tr('a11y.qty', v))}" title="${esc(tr('qtyTip'))}">`
      + `<span aria-hidden="true">${esc(ut(r, 'pkt'))}</span></label>`
      + `<button type="button" data-step="1" aria-label="${esc(tr('a11y.more', v))}">+</button></span>`;
  }

  function rateRow(r, { photo = false } = {}) {
    const u = unit(r);
    const ph = photo && r.item ? `<button class="r-photo" type="button" data-photo="${r.item.id}" data-rk="${esc(r.key)}" aria-label="${esc(tr('lb.open'))} ${esc(r.code)}"><img src="${BASE}${r.item.imgs[0].s}" alt="" loading="lazy" width="44" height="56"></button>` : '';
    const code = r.item ? `<a href="${BASE}${r.item.cat}/#${r.item.id}" data-open="${r.item.id}">${esc(r.code)}</a>` : esc(r.code);
    return `<div class="rrow${ph ? ' has-photo' : ''}">${ph}<div class="r-head"><span class="r-code">${code}</span></div>`
      + (r.desc ? `<div class="r-desc">${esc(noteTr(r.desc))}</div>` : '')
      + `<div class="r-nums"><span class="r-rate">${inr(u)}</span> ${esc(tr('perDozen'))} ${bulkHtml(r)}<br>${packHtml(r, u)}</div>`
      + `<div class="r-act">${addCtl(r)}</div></div>`;
  }

  // ---------- search ----------
  let index = [];
  function buildIndex() {
    index = items.map((it) => ({
      it,
      keys: new Set(it.codes.flatMap(keysFor)),
      text: `${it.codes.join(' ')} ${it.note} ${cats[it.cat].name} ${catName(it.cat)}`.toLowerCase(),
    }));
    if (!rates) return;
    const byItem = new Map(index.map((e) => [e.it, e]));
    for (const r of rates) {
      if (r.item) {
        const e = byItem.get(r.item);
        keysFor(r.code).forEach((k) => e.keys.add(k));
        e.text += ` ${r.code} ${r.desc}`.toLowerCase();
      } else {
        index.push({ r, keys: new Set(keysFor(r.code)), text: `${r.code} ${r.desc}`.toLowerCase() });
      }
    }
  }

  // Several codes at once: "980, 322, D-01", "980 and 322", "980 322". Each part keeps its best matches;
  // parts with no match are remembered so the page can say which ones weren't found.
  let searchMissing = [];
  function search(q) {
    let parts = String(q).split(/\s*[,;\n]\s*|\s+(?:and|aur|&)\s+/i).map((x) => x.trim()).filter(Boolean);
    parts = parts.flatMap((x) => (/^\d{3,4}(\s+\d{3,4})+$/.test(x) ? x.split(/\s+/) : [x]));
    searchMissing = [];
    if (parts.length < 2) return searchScored(q).map((x) => x.e);
    const out = [];
    for (const part of parts) {
      const hits = searchScored(part);
      if (!hits.length) { searchMissing.push(part); continue; }
      const best = hits[0].s >= 100 ? hits.filter((x) => x.s >= 100) : hits.slice(0, 10);
      for (const x of best) if (!out.includes(x.e)) out.push(x.e);
    }
    return out;
  }

  function searchScored(q) {
    const nq = norm(q), zq = noZeros(nq), lq = q.trim().toLowerCase();
    if (!nq && lq.length < 3) return [];
    const out = [];
    for (const e of index) {
      let s = 0;
      if (nq) {
        for (const k of e.keys) {
          if (k === nq || k === zq) s = Math.max(s, 100);                          // D01 = D-01 = D1
          else if (k.startsWith(nq)) s = Math.max(s, 80 - (k.length - nq.length)); // 43 -> 432, 433…
          else if (nq.length >= 2 && k.includes(nq)) s = Math.max(s, 50 - (k.length - nq.length));
        }
      }
      if (!s && lq.length >= 3 && e.text.includes(lq)) s = 20;
      if (s) out.push({ e, s });
    }
    return out.sort((a, b) => b.s - a.s).slice(0, 30);
  }

  const notFoundHtml = (q) => `${esc(tr('notFound', { q }))} ${esc(tr('checkOr'))} <a href="${waUrl(`Hi, do you have item ${q}?`)}" target="_blank" rel="noopener">${esc(tr('askWa'))}</a>.`;

  function resultHtml(e, i) {
    if (e.it) {
      const it = e.it, img = it.imgs[0];
      let price = '';
      if (rates && it.rates.length) {
        const min = inr(Math.min(...it.rates.map((r) => unit(r))));
        price = `<div class="r-price">${esc(it.rates.length > 1 ? tr('fromPrice', { p: min }) : min)} ${esc(tr('perDozen'))}</div>`;
      }
      return `<a class="result" role="option" id="res-${i}" href="${BASE}${it.cat}/#${it.id}" data-open="${it.id}">`
        + `<img src="${BASE}${img.s}" alt="" loading="lazy" width="52" height="66">`
        + `<span class="r-main"><span class="r-code">${esc(title(it))}</span><span class="r-sub" style="display:block">${esc(catName(it.cat))}${it.note ? ' · ' + esc(noteTr(it.note)) : ''}</span>${price}</span></a>`;
    }
    const r = e.r;
    return `<div class="result" role="option" id="res-${i}"><span class="ph" aria-hidden="true"></span>`
      + `<span class="r-main"><span class="r-code">${esc(r.code)}</span><span class="r-sub" style="display:block">${esc(r.desc ? noteTr(r.desc) : catName(r.cat))} · ${esc(tr('noPhoto'))}</span>`
      + `<span class="r-price">${inr(unit(r))} ${esc(tr('perDozen'))}</span>${packHtml(r, unit(r))}</span>${addCtl(r)}</div>`;
  }

  function renderResults() {
    const q = $('#q').value, box = $('#results');
    $('.search-clear').hidden = !q;
    if (PAGE === 'rates') { if (rates) renderRateList(); return; }
    if (!q.trim()) { box.hidden = true; return; }
    const found = search(q);
    box.innerHTML = found.length ? found.map(resultHtml).join('') + (searchMissing.length ? `<div class="empty">${notFoundHtml(searchMissing.join(', '))}</div>` : '')
      : `<div class="empty">${notFoundHtml(q)}</div>`;
    box.hidden = false;
  }

  // ---------- viewer ----------
  let vList = [], vIdx = 0;
  function openViewer(id) {
    const it = itemById[id];
    if (!it) return;
    vList = cats[it.cat].items;
    vIdx = vList.indexOf(it);
    renderViewer();
    const d = $('#viewer');
    if (!d.open) d.showModal();
    $('#results').hidden = true;
  }
  function renderViewer() {
    const it = vList[vIdx];
    $('#v-cat').textContent = catName(it.cat);
    $('#v-title').textContent = title(it);
    let priceHtml = '';
    if (rates) {
      priceHtml = it.rates.length
        ? `<div class="v-rates">${it.rates.map((r) => rateRow(r)).join('')}</div><p class="muted small"><b>${esc(tr('noBreak'))}</b> ${esc(typeText())}</p>`
        : `<p class="muted">${esc(tr('por'))} – <a href="${waUrl(`Hi, what is the rate for item ${title(it)}?`)}" target="_blank" rel="noopener">${esc(tr('askWa'))}</a>.</p>`;
    }
    const imgsHtml = `<div class="v-imgs">${it.imgs.map((im, i) => `<button type="button" data-photo="${it.id}" data-idx="${i}" aria-label="${esc(tr('lb.open'))} ${esc(title(it))} – ${i + 1}"><img src="${BASE}${im.f}" alt="${esc(title(it))} – ${i + 1}" width="${im.w}" height="${im.h}" decoding="async"${i ? ' loading="lazy"' : ''}></button>`).join('')}</div>`
      + `<p class="v-hint">${esc(tr('tapPhoto'))}</p>`;
    // one or two prices fit above the photo; longer lists (e.g. 9 bun donut sizes) go below it
    let h = it.note ? `<p class="v-note">${esc(noteTr(it.note))}</p>` : '';
    h += it.rates.length > 2 ? imgsHtml + `<div style="margin-top:16px">${priceHtml}</div>` : priceHtml + imgsHtml;
    const b = $('#v-body');
    const keepScroll = b.dataset.item === it.id ? b.scrollTop : 0;
    b.innerHTML = h;
    b.dataset.item = it.id;
    b.scrollTop = keepScroll;
    $('#v-prev').disabled = vIdx === 0;
    $('#v-next').disabled = vIdx === vList.length - 1;
    if (PAGE === 'category' && it.cat === CAT) history.replaceState(null, '', `#${it.id}`);
  }

  // ---------- photo view ----------
  // Full-screen photos (swipe between them) with a floating panel to add the item to the order.
  let lb = null; // { it, key } – key = one rate row (from the rate list), or null for all of the item's rates
  function openPhoto(id, key = null, index = 0) {
    const it = itemById[id];
    if (!it) return;
    lb = { it, key };
    const box = $('#lb-imgs'), d = $('#photo');
    box.innerHTML = it.imgs.map((im, i) => `<figure><img src="${BASE}${im.f}" alt="${esc(title(it))} – ${i + 1}" width="${im.w}" height="${im.h}" decoding="async"></figure>`).join('');
    renderPhotoPanel();
    if (!d.open) { d.showModal(); history.pushState({ lb: 1 }, ''); } // the phone's back button closes it
    box.scrollLeft = index * box.clientWidth;
    photoCount();
  }
  function photoCount() {
    if (!lb) return;
    const box = $('#lb-imgs'), n = lb.it.imgs.length;
    $('#lb-count').textContent = n > 1 ? `${Math.round(box.scrollLeft / Math.max(1, box.clientWidth)) + 1} / ${n} · ${tr('lb.swipe')}` : '';
  }
  function inOrderText(r) {
    const n = cart[r.key] || 0;
    return n ? tr('inOrder', { n, u: ut(r, 'pkt'), dz: n * r.pkt, t: inr(n * r.pkt * unit(r)) }) : '';
  }
  function renderPhotoPanel() {
    if (!lb) return;
    const it = lb.it, list = rates ? (lb.key ? it.rates.filter((r) => r.key === lb.key) : it.rates) : [];
    let h = `<div class="lb-head"><b>${esc(title(it))}</b>${it.note ? ` <span>${esc(noteTr(it.note))}</span>` : ''}</div>`;
    if (!rates) h += `<p class="muted small">${esc(tr('catcta.text'))}</p>`;
    else if (!list.length) h += `<p class="muted small">${esc(tr('por'))}</p>`;
    h += list.map((r) => {
      const u = unit(r);
      return `<div class="lb-rate"><div class="lb-info">${list.length > 1 || r.desc ? `<div class="r-desc">${esc(r.code)}${r.desc ? ' · ' + esc(noteTr(r.desc)) : ''}</div>` : ''}`
        + `<div><span class="r-rate">${inr(u)}</span> ${esc(tr('perDozen'))} ${bulkHtml(r)}</div>${packHtml(r, u)}</div>`
        + `<div class="lb-act">${addCtl(r)}</div><div class="lb-inorder" data-inorder="${esc(r.key)}">${esc(inOrderText(r))}</div></div>`;
    }).join('');
    if (list.length) h += `<p class="lb-note">${esc(tr('noBreak'))} ${esc(typeText())}</p>`;
    $('#lb-panel').innerHTML = h;
  }
  function updateInOrder() {
    if (!lb) return;
    for (const el of $$('#lb-panel [data-inorder]')) { const r = rateByKey[el.dataset.inorder]; if (r) el.textContent = inOrderText(r); }
  }

  // ---------- cart ----------
  // block: can't send yet ('mov' below minimum, 'carton' less than 1 carton).
  // sales: can only go to the sales associate ('mixed' boxes + packets, 'fit' doesn't fill whole cartons).
  function orderSummary() {
    const lines = cartLines(), base = baseType(), t = appliedType(lines);
    const subtotal = sumAt(lines, t);
    const packets = lines.reduce((s, l) => s + l.n, 0); // packets + boxes together
    const o = { t, base, lines, subtotal, packets, dozens: lines.reduce((s, l) => s + l.n * l.r.pkt, 0), cartons: 0, handling: 0, block: '', sales: '' };
    if (t.carton && lines.length) { // only a wholesaler can be at the carton level without a valid carton
      const cc = cartonCheck(lines);
      o.kind = cc.kind;
      if (cc.mixed) o.sales = 'mixed';
      else if (cc.short) { o.block = 'carton'; o.need = CARTON[cc.kind].min - packets; }
      else if (!cc.ok) { o.sales = 'fit'; o.cartons = cc.cartons; o.need = cc.need; o.remove = cc.remove; }
      else { o.cartons = cc.cartons; o.handling = cc.cartons * CARTON.fee; }
    } else if (lines.length && subtotal < t.mov) o.block = 'mov'; // minimum is on the items total, before GST
    // the next cheaper level this customer could unlock by ordering more, and what it would save on this order
    o.next = TYPES.find((x) => x.open && rank(x) > rank(t));
    if (o.next && lines.length) o.save = subtotal - sumAt(lines, o.next);
    o.down = lines.length > 0 && rank(t) < rank(base); // dropped to a higher price level: order below their own minimum
    if (o.down) o.saveBase = subtotal - sumAt(lines, base);
    o.gst = Math.round((subtotal + o.handling) * GST * 100) / 100;
    o.total = subtotal + o.handling + o.gst;
    return o;
  }

  function cartNotices(o) {
    const c = o.kind && CARTON[o.kind], k = o.kind === 'box' ? 'Box' : 'Pkt', out = [];
    if (o.block === 'mov') out.push(['warn', tr('movNotice', { type: typeName(o.t.id), mov: inr0(o.t.mov), x: inr0(up10(o.t.mov - o.subtotal)) })]);
    if (o.block === 'carton') out.push(['warn', tr('cartonNeed' + k, { min: c.min, x: o.need })]);
    if (o.sales === 'mixed') out.push(['warn', tr('mixedNotice')]);
    if (o.sales === 'fit') out.push(['warn', tr('fitNotice' + k, { max: c.max, x: o.need, r: o.remove })]);
    if (o.cartons && !o.sales) out.push(['ok', tr('cartonOk', { c: o.cartons, fee: inr0(CARTON.fee) })]);
    if (rank(o.t) > rank(o.base)) out.push(['promo', tr('upGot', { type: typeName(o.t.id) })]);
    if (o.down) {
      const b = o.base, s = inr0(o.saveBase), type = typeName(o.t.id), baseName = typeName(b.id);
      if (b.carton) {
        const cc = cartonCheck(o.lines);
        if (cc.mixed) out.push(['warn', tr('downCartonMixed', { b: CARTON.box.min, p: CARTON.packet.min, type })]);
        else out.push(['warn', tr(cc.kind === 'box' ? 'downCartonBox' : 'downCartonPkt', { min: CARTON[cc.kind].min, n: CARTON[cc.kind].min - o.packets, type, s })]);
      } else {
        const atBase = sumAt(o.lines, b), x = (b.mov - atBase) * (o.subtotal / atBase); // valued at today's prices
        out.push(['warn', tr('downNotice', { base: baseName, mov: inr0(b.mov), type, x: inr0(up10(x)), s })]);
      }
    }
    if (o.next && !o.block && !o.down && o.save > 0) {
      if (o.next.carton) out.push(['promo', tr('upCarton', { b: CARTON.box.min, p: CARTON.packet.min, s: inr0(o.save) })]);
      else {
        const atNext = sumAt(o.lines, o.next), x = (o.next.mov - atNext) * (o.subtotal / atNext); // valued at today's prices
        if (x > 0) out.push(['promo', tr('upNotice', { x: inr0(up10(x)), type: typeName(o.next.id), s: inr0(o.save) })]);
      }
    }
    return out;
  }

  function renderCart() {
    const b = $('#cart-body'), o = orderSummary(), keepScroll = b.scrollTop;
    if (!o.lines.length) {
      b.innerHTML = `<div class="cart-empty"><p>${esc(tr('cartEmpty'))}</p><p class="small">${esc(tr('cartEmptyHelp'))}</p>${PAGE === 'rates' ? '' : `<a class="btn ghost" href="${ratesUrl()}">${esc(tr('openRates'))}</a>`}</div>`;
      return;
    }
    const notes = cartNotices(o);
    const ord = currentOrder();
    if (ord && (ord.sent || ord.edit)) notes.unshift(['ok', tr('editing', { id: ord.id })]);
    const sent = store.get('rc_sent', null);
    if (sent && sent.cart === JSON.stringify(cart)) {
      notes.unshift(['ok', tr('sentAlready', { time: new Date(sent.at).toLocaleString(L === 'en' ? 'en-IN' : L + '-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) })]);
    }
    const cust = store.get('rc_cust', {});
    b.innerHTML = `<div class="cart-lines">${o.lines.map((l) => {
      const u = unit(l.r, o.t);
      return `<div class="rrow"><div class="r-head"><span class="r-code">${esc(l.r.code)}</span></div>`
        + (l.r.desc ? `<div class="r-desc">${esc(noteTr(l.r.desc))}</div>` : '')
        + `<div class="r-nums">${esc(ut(l.r, 'cartLine', { n: l.n, d: l.r.pkt, dz: l.n * l.r.pkt, u: inr(u), t: '' }))}<b>${inr(l.n * l.r.pkt * u)}</b></div>`
        + `<div class="r-act">${addCtl(l.r)}</div></div>`;
    }).join('')}</div>`
      + notes.map((n) => `<div class="notice ${n[0]}">${esc(n[1])}</div>`).join('')
      + `<p class="notice nobreak">${esc(tr('noBreak'))}</p>`
      + `<div class="totals"><div class="row"><span>${esc(tr('businessType'))}</span><span>${esc(typeName(o.base.id))}</span></div>`
      + `<div class="row"><span>${esc(tr('priceLevel'))}</span><span>${esc(typeName(o.t.id))}</span></div>`
      + `<div class="row"><span>${esc(countText(o.lines, ''))}</span><span>${o.packets}</span></div>`
      + `<div class="row"><span>${esc(tr('dozens'))}</span><span>${o.dozens}</span></div>`
      + `<div class="row sub"><span>${esc(tr('subtotal'))}</span><span>${inr(o.subtotal)}</span></div>`
      + (o.t.carton ? `<div class="row"><span>${esc(o.handling ? tr('handling', { c: o.cartons, fee: inr0(CARTON.fee) }) : tr('handlingPlain'))}</span><span>${o.handling ? inr(o.handling) : esc(tr('handlingTbc'))}</span></div>` : '')
      + `<div class="row gst"><span>${esc(tr('gstRow', { p: CFG.gst }))}</span><span>+ ${inr(o.gst)}</span></div>`
      + `<div class="row grand"><span>${esc(tr('totalIncl'))}</span><span>${inr(o.total)}</span></div></div>`
      + `<p class="notice ship">${esc(tr('shipNote'))}</p>`
      + `<label class="field"><span>${esc(tr('fName'))}</span><input id="c-name" autocomplete="organization" value="${esc(cust.name || '')}" placeholder="${esc(tr('fNamePh'))}"></label>`
      + `<label class="field"><span>${esc(tr('fCity'))}</span><input id="c-city" autocomplete="address-level2" value="${esc(cust.city || '')}" placeholder="${esc(tr('fCityPh'))}"></label>`
      + `<button class="btn wa block" type="button" id="send-order"${o.block ? ' disabled' : ''}>${esc(tr(o.block ? 'sendBlocked' : o.sales ? 'sendSales' : ord && (ord.sent || ord.edit) ? 'sendUpdate' : 'send'))}</button>`
      + `<p class="muted small" style="margin-top:8px">${esc(tr('sendNote'))}</p>`
      + `<button class="link-btn" type="button" id="clear-order">${esc(tr('clear'))}</button>`;
    b.scrollTop = keepScroll;
  }

  // The order message stays in English: the WhatsApp bot reads it ("NEW ORDER", "Order ID:", "TOTAL:").
  // No emoji before "NEW ORDER": WhatsApp Desktop turns some emoji in a wa.me link into "�".
  function orderMessage(id, update) {
    const o = orderSummary(), c = o.kind && CARTON[o.kind];
    const name = ($('#c-name')?.value || '').trim(), city = ($('#c-city')?.value || '').trim();
    const lines = o.lines.map((l, i) => {
      const u = unit(l.r, o.t);
      return `${i + 1}) ${l.r.code}${l.r.desc ? ` (${l.r.desc})` : ''} – ${l.n} ${isBox(l.r) ? 'box' : 'pkt'} × ${l.r.pkt} dz × ${inr(u)} = ${inr(l.n * l.r.pkt * u)}`;
    });
    const units = o.kind === 'box' ? 'boxes' : 'packets';
    const sales = o.sales === 'mixed' ? 'NEEDS SALES ASSOCIATE: boxes and packets are mixed – they cannot share a carton.'
      : o.sales === 'fit' ? `NEEDS SALES ASSOCIATE: ${o.packets} ${units} do not make full cartons (${c.max} ${units} per carton).` : '';
    return [
      update ? 'UPDATED ORDER – rajcreation.info' : 'NEW ORDER – rajcreation.info',
      `Order ID: ${id}`,
      `Business type: ${I18N.text['type.' + o.base.id].en}`,
      `Price level: ${I18N.text['type.' + o.t.id].en}`,
      `Name / Shop: ${name || '-'}`,
      `City: ${city || '-'}`,
      `Language: ${(I18N.languages.find((x) => x.id === L) || {}).en || 'English'}`,
      '',
      ...lines,
      '',
      `Packets / boxes: ${o.packets} | Dozens: ${o.dozens}`,
      ...(o.cartons && !o.sales ? [`Cartons: ${o.cartons} (${units})`] : []),
      `Items total: ${inr(o.subtotal)}`,
      ...(o.t.carton ? [o.handling ? `Handling & packing: ${o.cartons} × ${inr0(CARTON.fee)} = ${inr(o.handling)}` : 'Handling & packing: to be confirmed'] : []),
      `*GST ${CFG.gst}%: ${inr(o.gst)}*`,
      `*TOTAL (incl. GST): ${inr(o.total)}*`,
      '',
      'Shipping is charged separately and depends on the location.',
      ...(sales ? ['', sales] : []),
      '',
      'Please confirm availability and colours.',
    ].join('\n');
  }

  // ---------- page renderers ----------
  function renderHome() {
    setHtml($('#promo'), `<b>${esc(tr('promo.title'))}</b> ${esc(promoText())}`);
    const box = $('#cat-cards'), list = Object.values(cats);
    if (box.children.length === list.length) { // built into the page already: only change the words
      list.forEach((c, i) => {
        const a = box.children[i];
        const set = (el, v) => { if (el.textContent !== v) el.textContent = v; };
        $('img', a).alt = catName(c.id);
        set($('h3', a), catName(c.id));
        set($('p', a), catText(c.id, 1));
        set($('.count', a), tr('items', { n: c.items.length }));
      });
      return;
    }
    box.innerHTML = list.map((c, i) => `<a class="cat-card" href="${BASE}${c.id}/">`
      + `<img src="${BASE}${c.cover}" srcset="${BASE}${c.coverS} 240w, ${BASE}${c.cover} 480w" sizes="(min-width: 720px) 400px, 112px" alt="${esc(catName(c.id))}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="480" height="620">`
      + `<div><h3>${esc(catName(c.id))}</h3><p>${esc(catText(c.id, 1))}</p><span class="count">${esc(tr('items', { n: c.items.length }))}</span></div></a>`).join('');
  }

  function cardHtml(it, i) {
    const img = it.imgs[0];
    let price = '';
    if (rates) {
      if (it.rates.length === 1) {
        const r = it.rates[0], u = unit(r);
        price = `<div class="card-price"><span class="rate">${inr(u)}</span> ${esc(tr('perDozen'))}${bulkHtml(r)}<br>${packHtml(r, u)}</div><div class="card-actions">${addCtl(r)}</div>`;
      } else if (it.rates.length > 1) {
        const min = inr(Math.min(...it.rates.map((r) => unit(r))));
        price = `<div class="card-price"><span class="rate">${esc(tr('fromPrice', { p: min }))}</span> ${esc(tr('perDozen'))}<span class="pk">${esc(tr('options', { n: it.rates.length }))}</span></div><div class="card-actions"><button class="add-btn" type="button" data-open="${it.id}">${esc(tr('choose'))}</button></div>`;
      } else {
        price = `<p class="por">${esc(tr('por'))}</p>`;
      }
    }
    return `<article class="card" id="${it.id}"><button class="card-img" type="button" data-open="${it.id}" aria-label="${esc(title(it))}">`
      + `<img src="${BASE}${img.t}" srcset="${BASE}${img.m} 360w, ${BASE}${img.t} 480w" sizes="(min-width: 980px) 260px, (min-width: 640px) 31vw, 48vw" alt="${esc(title(it))} – ${esc(catName(it.cat))}" width="480" height="${Math.round(480 * img.h / img.w)}" ${i < 4 ? 'loading="eager"' : 'loading="lazy"'} decoding="async">`
      + (it.imgs.length > 1 ? `<span class="more">${esc(tr('photos', { n: it.imgs.length }))}</span>` : '')
      + `</button><div class="card-body"><div class="card-code">${esc(title(it))}</div>`
      + (it.note ? `<div class="card-note">${esc(noteTr(it.note))}</div>` : '') + price + '</div></article>';
  }

  let gridBuilt = !!document.querySelector('#grid .card'); // the cards are built into the page (English, no prices)
  function renderGrid() {
    const keep = gridBuilt && !rates && L === 'en';
    gridBuilt = false;
    if (!keep) $('#grid').innerHTML = cats[CAT].items.map(cardHtml).join('');
    const note = $('#level-note');
    if (rates) {
      note.hidden = false;
      note.innerHTML = `<b>${esc(tr('noBreak'))}</b> ${esc(typeText())}<br><b>${esc(tr('promo.title'))}</b> `
        + `<a href="${ratesUrl()}">${esc(tr('seeLevels'))}</a>`;
    }
  }

  function renderRatesPage() {
    const applied = appliedType(), shown = shownType();
    setHtml($('#promo'), `<b>${esc(tr('promo.title'))}</b> ${esc(promoText())}`);
    $('#you-are').textContent = typeId ? tr('youAre', { type: typeName(baseType().id) }) : '';
    $('#types').innerHTML = TYPES.map((t) => `<button type="button" aria-pressed="${t === shown}" data-type="${t.id}">`
      + `<b>${esc(typeName(t.id))}</b><small>${esc(movText(t))}</small>`
      + (t === applied ? `<span class="tag">${esc(tr('yourPrices'))}</span>` : '') + '</button>').join('');
    $('#types-hint').textContent = shown === applied ? tr('appliedHint')
      : shown.open ? tr('viewingHint', { type: typeName(shown.id), mov: movText(shown) }) : tr('viewingOther', { type: typeName(shown.id) });
    $('#carton-info').textContent = tr('cartonInfo', { b: CARTON.box.max, p: CARTON.packet.max, fee: inr0(CARTON.fee) });
    const present = [...new Set(rates.map((r) => r.cat))];
    const tabs = [['all', tr('all')], ...Object.values(cats).filter((c) => present.includes(c.id)).map((c) => [c.id, catName(c.id)])];
    if (present.includes('other')) tabs.push(['other', tr('other')]);
    $('#rate-tabs').innerHTML = tabs.map(([id, n]) => `<button type="button" aria-pressed="${rateTab === id}" data-tab="${id}">${esc(n)}</button>`).join('');
    renderRateList();
  }

  function renderRateList() {
    const q = $('#q').value.trim();
    let list = rates.filter((r) => rateTab === 'all' || r.cat === rateTab);
    if (q) {
      const hits = new Set();
      for (const e of search(q)) (e.r ? [e.r] : e.it.rates).forEach((r) => hits.add(r));
      list = list.filter((r) => hits.has(r));
    }
    let h = '', lastCat = null;
    for (const r of list) {
      if (rateTab === 'all' && !q && r.cat !== lastCat) {
        lastCat = r.cat;
        h += `<h2>${esc(catName(r.cat))}</h2>`;
      }
      h += rateRow(r, { photo: true });
    }
    if (h && q && searchMissing.length) h += `<p class="muted">${notFoundHtml(searchMissing.join(', '))}</p>`;
    $('#rate-list').innerHTML = h || `<p class="muted">${notFoundHtml(q)}</p>`;
    $('#rate-count').textContent = tr(q ? 'nFound' : 'nItems', { n: list.length });
  }

  function renderOrderBar() {
    const bar = $('#order-bar'), btn = $('.cart-btn');
    const o = rates ? orderSummary() : null;
    const show = !!(o && o.lines.length);
    bar.hidden = !show;
    body.classList.toggle('has-order-bar', show);
    btn.hidden = !rates;
    $('.cart-count').textContent = o ? o.packets : 0;
    btn.setAttribute('aria-label', show ? tr('a11y.cart', { n: o.packets, t: inr0(o.total) }) : tr('a11y.cartEmpty'));
    $('.cart-count').hidden = !show;
    if (show) {
      $('#ob-total').textContent = inr0(o.total);
      const state = o.block === 'mov' ? tr('obMin', { moq: inr0(o.t.mov) }) : o.block === 'carton' ? tr('obCarton')
        : o.cartons && !o.sales ? tr('cartonsN', { c: o.cartons }) : (o.down ? '⚠️ ' : '') + typeName(o.t.id);
      $('#ob-meta').textContent = ` ${tr('inclGst')} · ${countText(o.lines, 'ob')} · ${state}`;
    }
  }

  function refresh() {
    shownMemo = null;
    if (PAGE === 'home') renderHome();
    if (PAGE === 'category') renderGrid();
    if (PAGE === 'rates' && rates) renderRatesPage();
    if ($('#viewer').open) renderViewer();
    if ($('#photo').open) renderPhotoPanel();
    if ($('#cart').open) renderCart();
    if (!$('#results').hidden) renderResults();
    renderOrderBar();
  }

  // ---------- events ----------
  function bindEvents() {
    const q = $('#q');
    let deb;
    q.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(renderResults, 80); });
    q.addEventListener('focus', () => { if (q.value && PAGE !== 'rates') renderResults(); });
    q.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { $('#results').hidden = true; q.blur(); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = $('#results [data-open]');
        if (first && PAGE !== 'rates') openViewer(first.dataset.open);
        q.blur();
      }
    });
    $('.search-clear').addEventListener('click', () => { q.value = ''; renderResults(); q.focus(); });

    $('#lang').addEventListener('change', (e) => {
      L = LANGS.includes(e.target.value) ? e.target.value : 'en';
      store.set('rc_lang', L);
      const u = new URL(location.href);
      if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); history.replaceState(null, '', u.pathname + u.search + u.hash); }
      applyStatic();
      buildIndex();
      refresh();
    });

    document.addEventListener('click', (e) => {
      const t = e.target;
      const ph = t.closest('[data-photo]');
      if (ph) { e.preventDefault(); openPhoto(ph.dataset.photo, ph.dataset.rk || null, Number(ph.dataset.idx) || 0); return; }
      if (t.closest('#lb-imgs') && !t.closest('img')) { $('#photo').close(); return; } // tap the dark area to close
      const open = t.closest('[data-open]');
      if (open) { e.preventDefault(); openViewer(open.dataset.open); return; }
      const add = t.closest('[data-add]');
      if (add) {
        const r = rateByKey[add.dataset.add];
        const level = setQty(add.dataset.add, 1, true);
        if (r) {
          const tip = !level && !store.get('rc_tip', false); // a price-level change is more important than the typing tip
          toast(ut(r, 'added', { code: r.code, d: r.pkt }) + (level ? ' · ' + level : tip ? ' · ' + tr('qtyTip') : ''), level || tip ? 5000 : 2400);
          if (tip) store.set('rc_tip', true);
        }
        return;
      }
      const step = t.closest('[data-step]');
      if (step) { const k = step.closest('.stepper').dataset.key; setQty(k, (cart[k] || 0) + Number(step.dataset.step)); return; }
      const ty = t.closest('[data-type]');
      if (ty && typeById[ty.dataset.type]) { // compare another price level (tap your own to go back)
        viewId = ty.dataset.type === appliedType().id ? null : ty.dataset.type;
        shownMemo = null;
        refresh();
        return;
      }
      const tab = t.closest('[data-tab]');
      if (tab) { rateTab = tab.dataset.tab; renderRatesPage(); return; }
      if (t.closest('[data-close]')) { t.closest('dialog').close(); return; }
      if (t.closest('.cart-btn') || t.closest('#ob-open')) { $('#cart-body').scrollTop = 0; renderCart(); $('#cart').showModal(); return; }
      if (t.id === 'send-order') {
        store.set('rc_cust', { name: $('#c-name').value.trim(), city: $('#c-city').value.trim() });
        const prev = currentOrder();
        const id = prev ? prev.id : newOrderId();
        window.open(waUrl(orderMessage(id, !!(prev && (prev.sent || prev.edit)))), '_blank', 'noopener');
        store.set('rc_order', { id, at: Date.now(), sent: true });
        store.set('rc_sent', { at: Date.now(), cart: JSON.stringify(cart) }); // so the same order isn't sent twice by mistake
        renderCart();
        toast(tr('waOpened'));
        return;
      }
      if (t.id === 'clear-order') {
        if (confirm(tr('clearConfirm'))) { cart = {}; store.set('rc_cart', cart); store.del('rc_order'); refresh(); }
        return;
      }
      if (!t.closest('.search-row')) $('#results').hidden = true;
    });

    for (const d of $$('dialog')) {
      d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    }
    window.addEventListener('hashchange', () => { // a new bot link opened in the same tab
      if (/^#(shop|city|type)=/.test(location.hash)) { custFromLink(); refresh(); }
    });
    $('#lb-imgs').addEventListener('scroll', photoCount, { passive: true });
    $('#photo').addEventListener('close', () => {
      lb = null;
      $('#lb-imgs').innerHTML = '';
      if (history.state && history.state.lb) history.back();
    });
    window.addEventListener('popstate', () => { if ($('#photo').open) $('#photo').close(); });
    $('#viewer').addEventListener('close', () => {
      if (PAGE === 'category' && location.hash) history.replaceState(null, '', location.pathname + location.search);
    });
    $('#v-prev').addEventListener('click', () => { if (vIdx > 0) { vIdx--; renderViewer(); } });
    $('#v-next').addEventListener('click', () => { if (vIdx < vList.length - 1) { vIdx++; renderViewer(); } });
    document.addEventListener('input', (e) => {
      if (e.target.matches('input[data-qty]')) e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
    });
    document.addEventListener('change', (e) => {
      const el = e.target;
      if (!el.matches('input[data-qty]')) return;
      const want = parseInt(el.value, 10);
      if (!Number.isFinite(want)) { el.value = cart[el.dataset.qty] || 1; return; } // left empty: keep the old number
      if (want > 999) toast(tr('a11y.tooMany'));
      setQty(el.dataset.qty, want);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('input[data-qty]')) { e.preventDefault(); e.target.blur(); }
    });
    document.addEventListener('focusin', (e) => {
      if (e.target.matches('input[data-qty]')) setTimeout(() => e.target.select(), 0);
    });
    $('#cart').addEventListener('input', (e) => {
      if (e.target.id === 'c-name' || e.target.id === 'c-city') store.set('rc_cust', { name: $('#c-name').value.trim(), city: $('#c-city').value.trim() });
    });

    for (const a of $$('a[data-wa]')) { a.href = waUrl(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener'; }
    for (const a of $$('.cat-nav a[data-cat]')) if (a.dataset.cat === CAT) a.setAttribute('aria-current', 'page');
  }

  // ---------- start ----------
  // The WhatsApp bot adds #shop=…&city=… to its links, so the order form is already filled in.
  // (After "#", so the details never reach the web server.)
  // Links from the WhatsApp bot carry the customer's details: ?shop=…&city=…&type=… (older links used #shop=…).
  function custFromLink() {
    const KEYS = ['shop', 'city', 'type'];
    const q = new URLSearchParams(location.search);
    const h = /^#(shop|city|type)=/.test(location.hash) ? new URLSearchParams(location.hash.slice(1)) : null;
    const get = (k) => (q.get(k) || (h && h.get(k)) || '').trim();
    if (!h && !KEYS.some((k) => q.has(k))) return;
    const shop = get('shop').slice(0, 80), city = get('city').slice(0, 60);
    const cur = store.get('rc_cust', {});
    store.set('rc_cust', { name: shop || cur.name || '', city: city || cur.city || '' });
    const ty = get('type');
    if (typeById[ty]) { typeId = ty; shownMemo = null; store.set('rc_type', ty); }
    KEYS.forEach((k) => q.delete(k)); // keep ?lang= and ?q=, tidy the rest out of the address bar
    const rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + (h ? '' : location.hash));
  }

  // The bot's "Edit order" button opens the rate list with ?edit=<order id>&cart=<code>*<dozen per packet>*<packets>,…
  function editFromLink() {
    const q = new URLSearchParams(location.search);
    const id = (q.get('edit') || '').trim().toUpperCase();
    if (!/^RC-[A-Z0-9-]{4,20}$/.test(id) || !rates) return;
    const next = {}, missing = [];
    for (const part of (q.get('cart') || '').split(',')) {
      const [code, dz, n] = part.split('*');
      if (!code || !(parseInt(n, 10) > 0)) continue;
      const want = norm(code), pk = parseFloat(dz);
      const r = rates.find((x) => norm(x.code) === want && (!(pk > 0) || x.pkt === pk)) || rates.find((x) => norm(x.code) === want);
      if (r) next[r.key] = (next[r.key] || 0) + Math.min(999, parseInt(n, 10)); else missing.push(code);
    }
    cart = next;
    store.set('rc_cart', cart);
    store.set('rc_order', { id, at: Date.now(), edit: true });
    store.del('rc_sent');
    shownMemo = null;
    q.delete('edit'); q.delete('cart');
    const rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
    setTimeout(() => {
      renderCart(); $('#cart').showModal();
      toast(tr('editLoaded', { id }) + (missing.length ? ' · ' + tr('editMissing', { codes: missing.join(', ') }) : ''), 5000);
    }, 0);
  }

  async function init() {
    custFromLink();
    applyStatic();
    bindEvents();
    const m = location.pathname.match(/\/p\/([^/]+)\/?/);
    if (PAGE === 'rates' && m) { token = m[1]; store.set('rc_token', token); }
    else token = store.get('rc_token', null);

    let catalogue;
    try { catalogue = await getJSON(`${BASE}data/catalogue.json`); }
    catch { document.querySelector('main').insertAdjacentHTML('afterbegin', `<p class="notice warn">${esc(tr('loadFail'))}</p>`); return; }
    for (const c of catalogue.categories) {
      cats[c.id] = c;
      for (const it of c.items) { it.rates = []; items.push(it); itemById[it.id] = it; }
    }

    if (token) {
      rates = await loadRates();
      if (rates) { linkRates(); editFromLink(); }
      else { store.del('rc_token'); token = null; document.documentElement.classList.remove('has-rates'); }
    }
    buildIndex();

    if (rates) {
      const rl = $('.rates-link');
      rl.hidden = false;
      rl.href = ratesUrl();
      if (PAGE === 'rates') rl.setAttribute('aria-current', 'page');
      $$('#price-cta').forEach((el) => { el.hidden = true; });
    }

    // links like …/?q=345 (sent by the WhatsApp bot) open with that item searched
    const q0 = (new URLSearchParams(location.search).get('q') || '').trim().slice(0, 30);
    if (q0) $('#q').value = q0;

    if (PAGE === 'home') renderHome();
    if (PAGE === 'category') {
      renderGrid();
      const id = decodeURIComponent(location.hash.slice(1));
      if (id && itemById[id]) {
        document.getElementById(id)?.scrollIntoView({ block: 'center' });
        openViewer(id);
      }
    }
    if (PAGE === 'rates') {
      if (!rates) { $('#rate-list').innerHTML = `<p class="notice warn">${esc(tr('badLink'))}</p>`; return; }
      renderRatesPage();
    }
    if (q0) renderResults();
    renderOrderBar();
  }

  init();
})();
