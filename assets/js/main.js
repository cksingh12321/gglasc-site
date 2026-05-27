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
  // ---- Search form (placeholder — archive index in progress) -
  // ============================================================
  // No real backend yet. On submit, show a friendly "we're building
  // the index" notice and offer to contact the centre directly.
  const searchForm = document.querySelector('form[data-search]');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const empty = searchForm.querySelector('.search-empty');
      if (empty) {
        empty.hidden = false;
        empty.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
