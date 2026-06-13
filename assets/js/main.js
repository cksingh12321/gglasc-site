// Global Girmitiya Lineage Archive & Searching Centre — site interactions
(function () {
  'use strict';

  // ============================================================
  // ---- Bilingual toggle: English ⇄ हिंदी ---------------------
  // ============================================================
  const LANG_KEY = 'gglasc_lang';
  const supportedLangs = ['en', 'hi'];

  const getInitialLang = () => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && supportedLangs.includes(saved)) return saved;
    return 'en';
  };

  const applyAttrTranslations = (lang) => {
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const attrs = el.dataset.i18nAttr.split(',').map(s => s.trim());
      attrs.forEach(attr => {
        const enKey = 'en' + attr.charAt(0).toUpperCase() + attr.slice(1);
        const hiKey = 'hi' + attr.charAt(0).toUpperCase() + attr.slice(1);
        let enVal = el.dataset[enKey];
        let hiVal = el.dataset[hiKey];
        if (!enVal && !hiVal) {
          enVal = el.dataset.en;
          hiVal = el.dataset.hi;
        }
        if (lang === 'en' && enVal != null) el.setAttribute(attr, enVal);
        if (lang === 'hi' && hiVal != null) el.setAttribute(attr, hiVal);
      });
    });
  };

  const setLang = (lang) => {
    if (!supportedLangs.includes(lang)) lang = 'en';
    document.documentElement.lang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyAttrTranslations(lang);
  };

  setLang(getInitialLang());

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-toggle');
    if (!btn) return;
    e.preventDefault();
    const next = document.documentElement.lang === 'en' ? 'hi' : 'en';
    setLang(next);
  });

  // ---- Mobile menu ----
  const toggle = document.querySelector('.menu-toggle');
  const header = document.querySelector('.site-header');
  if (toggle && header) {
    toggle.addEventListener('click', () => {
      header.classList.toggle('mobile-open');
      toggle.classList.toggle('open');
    });
    document.querySelectorAll('.nav a').forEach(a => {
      a.addEventListener('click', () => {
        header.classList.remove('mobile-open');
        toggle.classList.remove('open');
      });
    });
  }

  // ---- Header shadow on scroll ----
  const onScroll = () => {
    if (window.scrollY > 8) header && header.classList.add('scrolled');
    else header && header.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Scroll reveal ----
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }

  // ---- Counter animation ----
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count || '0');
    const dur = 1400;
    const start = performance.now();
    const decimals = (el.dataset.decimals && parseInt(el.dataset.decimals, 10)) || 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const v = target * easeOut(t);
      el.textContent = v.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCount(e.target);
          co.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-count]').forEach(el => co.observe(el));
  }

  // ---- Year in footer ----
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // ============================================================
  // ---- Lineage search (client-side, against /content/girmitiyas.json) ----
  // ============================================================
  // Loads the curated records JSON once, then filters by user input.
  // Each record carries a full source citation (article/Wikipedia/etc).
  const searchForm = document.querySelector('form[data-search]');
  if (searchForm) {
    let _records = null;
    const norm = (s) => (s || '').toString().toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
    const matchesField = (recVal, query) => {
      if (!query) return true;
      if (recVal == null) return false;
      if (Array.isArray(recVal)) return recVal.some(v => matchesField(v, query));
      if (typeof recVal === 'object') return Object.values(recVal).some(v => matchesField(v, query));
      return norm(String(recVal)).includes(norm(query));
    };
    async function loadRecords() {
      if (_records) return _records;
      try {
        const r = await fetch('/content/girmitiyas.json', { cache: 'no-store' });
        const j = await r.json();
        _records = j.records || [];
      } catch (err) {
        console.error('records load failed', err);
        _records = [];
      }
      return _records;
    }
    const DEST_LABEL = {
      mauritius: 'Mauritius',
      guyana: 'British Guiana (Guyana)',
      trinidad: 'Trinidad',
      fiji: 'Fiji',
      suriname: 'Suriname',
      natal: 'Natal, South Africa',
      reunion: 'Réunion',
      jamaica: 'Jamaica',
    };
    function escapeHtml(s) {
      return (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    }
    function renderRecord(r) {
      const names = (r.names || []).map(escapeHtml).join(' / ');
      const origin = [r.origin?.village, r.origin?.district, r.origin?.state].filter(Boolean).map(escapeHtml).join(' · ');
      const dest = [r.destination?.colony, r.destination?.estate].filter(Boolean).map(escapeHtml).join(' · ');
      const desc = (r.descendants_named || []).map(escapeHtml).map(d => `<li>${d}</li>`).join('');
      const src = r.source || {};
      const yearLine = [r.sailing_date && `Sailed ${escapeHtml(r.sailing_date)}`, r.ship && `Ship: <em>${escapeHtml(r.ship)}</em>`].filter(Boolean).join(' · ');
      return `<article class="record-card">
        <header class="record-head">
          <h3>${names || '(name unknown)'}</h3>
          <div class="record-meta">
            ${r.gender ? `<span class="rm-pill">${escapeHtml(r.gender)}${r.age_at_sailing ? ', age ' + r.age_at_sailing : ''}</span>` : ''}
            ${r.caste ? `<span class="rm-pill">${escapeHtml(r.caste)}</span>` : ''}
            ${r.depot ? `<span class="rm-pill">Depot: ${escapeHtml(r.depot)}</span>` : ''}
          </div>
        </header>
        <dl class="record-fields">
          ${origin ? `<div><dt>Origin</dt><dd>${origin}</dd></div>` : ''}
          ${yearLine ? `<div><dt>Voyage</dt><dd>${yearLine}</dd></div>` : ''}
          ${dest ? `<div><dt>Destination</dt><dd>${dest}${r.destination?.arrival_date ? ' · arrived ' + escapeHtml(r.destination.arrival_date) : ''}</dd></div>` : ''}
          ${desc ? `<div><dt>Descendants on record</dt><dd><ul>${desc}</ul></dd></div>` : ''}
          ${r.notes ? `<div><dt>Notes</dt><dd>${escapeHtml(r.notes)}</dd></div>` : ''}
        </dl>
        <footer class="record-source">
          <span class="rs-label">Source:</span>
          ${src.url
            ? `<a href="${escapeHtml(src.url)}" ${src.url.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${escapeHtml(src.title || src.publisher || src.url)}${src.url.startsWith('http') ? ' ↗' : ''}</a>`
            : escapeHtml(src.title || '(internal)')}
          ${src.publisher ? ` · <span class="rs-pub">${escapeHtml(src.publisher)}</span>` : ''}
        </footer>
      </article>`;
    }
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(searchForm);
      const q = {
        name: (data.get('name') || '').toString().trim(),
        year: (data.get('year') || '').toString().trim(),
        destination: (data.get('destination') || '').toString().trim(),
        district: (data.get('district') || '').toString().trim(),
        ship: (data.get('ship') || '').toString().trim(),
        depot: (data.get('depot') || '').toString().trim(),
      };
      const records = await loadRecords();
      const destFull = DEST_LABEL[q.destination] || q.destination;
      const hits = records.filter(r => {
        if (q.name && !matchesField([r.names, r.descendants_named, r.notes], q.name)) return false;
        if (q.year && !matchesField([r.sailing_date, r.depot_date, r.destination?.arrival_date], q.year)) return false;
        if (destFull && !matchesField([r.destination?.colony, r.destination?.estate], destFull)) return false;
        if (q.district && !matchesField([r.origin], q.district)) return false;
        if (q.ship && !matchesField(r.ship, q.ship)) return false;
        if (q.depot && !matchesField(r.depot, q.depot)) return false;
        return true;
      });
      let panel = searchForm.querySelector('.search-results');
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'search-results';
        searchForm.appendChild(panel);
      }
      const total = records.length;
      const hasQuery = Object.values(q).some(Boolean);
      const showHits = hasQuery ? hits : records;
      panel.innerHTML = `
        <div class="search-results-head">
          <strong>${showHits.length}</strong> ${showHits.length === 1 ? 'match' : 'matches'}${hasQuery ? '' : ' (all curated records)'} · <span class="muted">${total} total records in the centre's seed index</span>
        </div>
        ${showHits.length === 0
          ? `<div class="search-empty-msg">
              <p><strong>No match in our curated index.</strong> Try a broader search (fewer fields), search the <a href="#public-archives">public archives below</a>, or <a href="/contact.html">write to the centre</a> for a manual look-up.</p>
            </div>`
          : `<div class="record-list">${showHits.map(renderRecord).join('')}</div>`}
        <p class="search-note muted">Index seeded from cited articles, biographies, and historical research. The index grows as records are confirmed.</p>
      `;
      panel.hidden = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ============================================================
  // ---- Generic form submit (mailto fallback) ----------------
  // ============================================================
  // No Web3Forms key configured yet — until [PLACEHOLDER] is set,
  // forms compose a mailto: link to the centre's address.
  const WEB3FORMS_ACCESS_KEY = ''; // [PLACEHOLDER] paste key from web3forms.com
  const CENTRE_EMAIL = 'gglascmadhubani@gmail.com';

  const labelFor = (name) => name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  const showSuccess = (form) => {
    const success = form.querySelector('.form-success');
    const fields = form.querySelector('.form-fields');
    if (success) {
      success.hidden = false;
      if (fields) fields.hidden = true;
    } else {
      alert('Thank you — your message has been received.');
    }
  };

  const fallbackMailto = (form, to, subject) => {
    const lines = [];
    new FormData(form).forEach((v, k) => {
      if (k.startsWith('_')) return;
      const sv = String(v).trim();
      if (sv) lines.push(`${labelFor(k)}: ${sv}`);
    });
    lines.push('', '— from the gglasc.com website —');
    const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    window.location.href = url;
  };

  document.querySelectorAll('form[data-mailto]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const to = form.dataset.mailto || CENTRE_EMAIL;
      const subject = form.dataset.mailtoSubject || 'Message from gglasc.com';

      const submitBtn = form.querySelector('button[type="submit"], button:not([type])');
      const originalLabel = submitBtn?.innerHTML;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending…';
      }

      if (!WEB3FORMS_ACCESS_KEY) {
        console.info('No WEB3FORMS_ACCESS_KEY set — using mailto fallback.');
        fallbackMailto(form, to, subject);
        showSuccess(form);
        return;
      }

      const data = new FormData(form);
      data.set('access_key', WEB3FORMS_ACCESS_KEY);
      data.set('subject', subject);
      data.set('from_name', 'GGLASC Website');
      const senderEmail = data.get('email');
      if (senderEmail) data.set('replyto', senderEmail);
      data.set('_source', 'gglasc.com');

      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) {
          throw new Error(json.message || ('HTTP ' + res.status));
        }
        showSuccess(form);
      } catch (err) {
        console.warn('Web3Forms failed, falling back to mailto:', err);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalLabel;
        }
        fallbackMailto(form, to, subject);
        showSuccess(form);
      }
    });
  });
})();
