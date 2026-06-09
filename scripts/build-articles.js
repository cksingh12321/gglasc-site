#!/usr/bin/env node
/**
 * build-articles.js — read /content/articles/*.md, render each into
 *  /articles/<slug>.html using the shared template, and regenerate
 *  /articles.html as the index.
 *
 *  Runs on every Vercel deploy (see package.json "build" script).
 *  Also runnable locally:   npm run build
 */
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content/articles');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const INDEX_PATH = path.join(ROOT, 'articles.html');

// ---------- helpers ----------
function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function esc(s) {
  return (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function loadArticles() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md')).sort();
  const out = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8');
    const parsed = matter(raw);
    const slug = parsed.data.slug || f.replace(/\.md$/, '');
    out.push({
      slug,
      title: parsed.data.title || slug,
      date: parsed.data.date || '',
      dateFmt: parsed.data.date ? fmtDate(parsed.data.date) : '',
      author: parsed.data.author || 'GGLASC Editorial',
      categories: parsed.data.categories || [],
      hero_image: parsed.data.hero_image || '',
      hero_alt: parsed.data.hero_alt || parsed.data.title || '',
      bodyMd: parsed.content,
      bodyHtml: marked.parse(parsed.content, { mangle: false, headerIds: false }),
    });
  }
  // Sort by date descending (newest first) for the index
  out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return out;
}

// ---------- shared template chunks ----------
function head(title, desc) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,0..100;1,9..144,300..700,0..100&family=Inter:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Serif+Devanagari:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/style.css?v=6">
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg">
  <style id="i18n-failsafe">
    .lang-hi { display: none !important; }
    html[lang="hi"] .lang-hi { display: inline !important; }
    html[lang="hi"] .lang-en { display: none !important; }
  </style>
</head>
<body>`;
}

function header(activeNav) {
  const cls = (k) => activeNav === k ? ' class="active"' : '';
  return `
  <header class="site-header">
    <div class="container nav-wrap">
      <a href="/index.html" class="brand">
        <span class="brand-mark">GG</span>
        <span class="brand-text">
          <span class="brand-name"><span class="lang-en">Global Girmitiya Lineage Archive</span><span class="lang-hi">वैश्विक गिरमिटिया वंशावली अभिलेखागार</span></span>
          <span class="brand-tag"><span class="lang-en">&amp; Searching Centre · A Division of Mahavir Singh Memorial Trust</span><span class="lang-hi">एवं खोज केंद्र · महावीर सिंह स्मारक न्यास का प्रभाग</span></span>
        </span>
      </a>
      <nav class="nav" aria-label="Primary">
        <a href="/index.html"${cls('home')}><span class="lang-en">Home</span><span class="lang-hi">मुख्य पृष्ठ</span></a>
        <a href="/about.html"${cls('about')}><span class="lang-en">About</span><span class="lang-hi">परिचय</span></a>
        <a href="/search.html"${cls('search')}><span class="lang-en">Search</span><span class="lang-hi">खोज</span></a>
        <a href="/awardees.html"${cls('awardees')}><span class="lang-en">Awardees</span><span class="lang-hi">सम्मानित</span></a>
        <a href="/articles.html"${cls('articles')}><span class="lang-en">Articles</span><span class="lang-hi">लेख</span></a>
        <a href="/contribute.html"${cls('contribute')}><span class="lang-en">Contribute</span><span class="lang-hi">योगदान</span></a>
        <a href="/contact.html"${cls('contact')}><span class="lang-en">Contact</span><span class="lang-hi">संपर्क</span></a>
      </nav>
      <div class="nav-actions">
        <button class="lang-toggle" aria-label="Switch language / भाषा बदलें"><span class="lang-en-label">EN</span><span class="lang-sep"> / </span><span class="lang-hi-label">हिं</span></button>
        <a href="/search.html" class="btn btn-primary btn-sm"><span class="lang-en">Search archive</span><span class="lang-hi">अभिलेख खोजें</span></a>
        <button class="menu-toggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>`;
}

function footer() {
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/index.html" class="brand">
            <span class="brand-mark">GG</span>
            <span class="brand-text">
              <span class="brand-name">GGLASC</span>
              <span class="brand-tag"><span class="lang-en">Est. 22 March 2025 · Bishanpur, Bihar</span><span class="lang-hi">स्थापना 22 मार्च 2025 · बिशनपुर, बिहार</span></span>
            </span>
          </a>
          <p><span class="lang-en">A global, open archive for the descendants of the Indian indentured-labour diaspora.</span><span class="lang-hi">भारतीय अनुबंधित श्रमिक प्रवासी समुदाय के वंशजों के लिए एक वैश्विक, खुला अभिलेखागार।</span></p>
        </div>
        <div>
          <div class="footer-title"><span class="lang-en">Archive</span><span class="lang-hi">अभिलेखागार</span></div>
          <ul class="footer-list">
            <li><a href="/search.html"><span class="lang-en">Search records</span><span class="lang-hi">अभिलेख खोजें</span></a></li>
            <li><a href="/contribute.html"><span class="lang-en">Contribute records</span><span class="lang-hi">अभिलेख दें</span></a></li>
            <li><a href="/awardees.html"><span class="lang-en">Awardees</span><span class="lang-hi">सम्मानित</span></a></li>
            <li><a href="/articles.html"><span class="lang-en">Articles</span><span class="lang-hi">लेख</span></a></li>
          </ul>
        </div>
        <div>
          <div class="footer-title"><span class="lang-en">Centre</span><span class="lang-hi">केंद्र</span></div>
          <ul class="footer-list">
            <li><a href="/about.html"><span class="lang-en">About GGLASC</span><span class="lang-hi">GGLASC के बारे में</span></a></li>
            <li><a href="/about.html#leadership"><span class="lang-en">Leadership</span><span class="lang-hi">नेतृत्व</span></a></li>
            <li><a href="/contact.html"><span class="lang-en">Contact</span><span class="lang-hi">संपर्क</span></a></li>
          </ul>
        </div>
        <div>
          <div class="footer-title"><span class="lang-en">Stay in touch</span><span class="lang-hi">संपर्क में रहें</span></div>
          <p style="color: rgba(245,239,226,.6); font-size: 0.92rem;"><span class="lang-en">Quarterly notes on new records and found families.</span><span class="lang-hi">नए अभिलेखों और मिले परिवारों पर त्रैमासिक समाचार।</span></p>
          <form class="newsletter" data-mailto="gglascmadhubani@gmail.com" data-mailto-subject="Newsletter signup — gglasc.com">
            <input type="email" name="email" required data-i18n-attr="placeholder" data-en-placeholder="your@email.com" data-hi-placeholder="your@email.com">
            <button type="submit"><span class="lang-en">Subscribe</span><span class="lang-hi">सब्सक्राइब</span></button>
          </form>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span data-year>2026</span> · Global Girmitiya Lineage Archive &amp; Searching Centre · Mahavir Singh Memorial Trust</span>
        <span><a href="/contact.html"><span class="lang-en">Contact</span><span class="lang-hi">संपर्क</span></a></span>
      </div>
    </div>
  </footer>

  <script src="/assets/js/main.js?v=6"></script>
</body>
</html>`;
}

// ---------- per-article page ----------
function renderArticlePage(article, allArticles) {
  const desc = (article.bodyMd || '').slice(0, 200).replace(/\n+/g, ' ').replace(/!\[.*?\]\(.*?\)/g, '').trim();
  const others = allArticles.filter(a => a.slug !== article.slug).slice(0, 3);
  const heroBlock = article.hero_image
    ? `<div class="article-hero-img"><img src="${esc(article.hero_image)}" alt="${esc(article.hero_alt)}"></div>`
    : '';
  const catsLine = article.categories.length
    ? article.categories.map(c => esc(c)).join(' · ')
    : 'Article';

  const relatedCards = others.map(o => {
    const thumb = o.hero_image
      ? `<div class="related-thumb"><img src="${esc(o.hero_image)}" alt="" loading="lazy"></div>`
      : `<div class="related-thumb related-thumb-placeholder">✺</div>`;
    return `        <a href="/articles/${esc(o.slug)}.html" class="related-card">${thumb}<div class="related-card-body"><span class="related-cat">${esc((o.categories || ['Girmitiya']).join(' · '))}</span><h4>${esc(o.title)}</h4><p class="related-meta">By ${esc(o.author)} · ${esc(o.dateFmt)}</p></div></a>`;
  }).join('\n');

  return head(`${article.title} — GGLASC`, desc) + header('articles') + `
  <article class="article-page">
    <section class="page-hero">
      <div class="container-narrow">
        <div class="crumb reveal"><a href="/index.html"><span class="lang-en">Home</span><span class="lang-hi">मुख्य पृष्ठ</span></a> · <a href="/articles.html"><span class="lang-en">Articles</span><span class="lang-hi">लेख</span></a> · <span>${esc(article.title)}</span></div>
        <span class="eyebrow reveal">${catsLine}</span>
        <h1 class="reveal mt-16">${esc(article.title)}</h1>
        <p class="article-byline reveal mt-16">
          <span class="lang-en">By <strong>${esc(article.author)}</strong> · ${esc(article.dateFmt)}</span>
          <span class="lang-hi"><strong>${esc(article.author === 'GGLASC Editorial' ? 'GGLASC संपादकीय' : article.author)}</strong> द्वारा · ${esc(article.dateFmt)}</span>
        </p>
      </div>
    </section>

    <section class="section-sm">
      <div class="container-narrow">
        ${heroBlock}
        <div class="article-body mt-32">
${article.bodyHtml}
        </div>

      <section class="related-section reveal mt-48">
        <div class="related-head">
          <span class="eyebrow"><span class="lang-en">Related from the Archive</span><span class="lang-hi">अभिलेखागार से संबंधित</span></span>
          <h3><span class="lang-en">More Girmitiya articles</span><span class="lang-hi">अन्य गिरमिटिया लेख</span></h3>
        </div>
        <div class="related-grid">
${relatedCards}
        </div>
      </section>

      <div class="article-nav mt-48">
        <a href="/articles.html" class="card-link"><span class="arrow">←</span> <span class="lang-en">All articles</span><span class="lang-hi">सभी लेख</span></a>
      </div>
      </div>
    </section>
  </article>
` + footer();
}

// ---------- index page ----------
function renderIndexPage(allArticles) {
  const cards = allArticles.map(a => {
    const thumb = a.hero_image
      ? `<div class="article-thumb"><img src="${esc(a.hero_image)}" alt="" loading="lazy"></div>`
      : `<div class="article-thumb article-thumb-placeholder">✺</div>`;
    const catsLine = (a.categories || []).map(c => esc(c)).join(' · ');
    return `      <a href="/articles/${esc(a.slug)}.html" class="article-card reveal">
        ${thumb}
        <div class="article-card-body">
          <span class="article-cat">${catsLine || 'Article'}</span>
          <h3>${esc(a.title)}</h3>
          <p class="article-date">${esc(a.dateFmt)}</p>
        </div>
      </a>`;
  }).join('\n');

  return head('Articles — GGLASC', 'Reflections, research, and essays from the Global Girmitiya Lineage Archive & Searching Centre.') + header('articles') + `
  <section class="page-hero">
    <div class="container">
      <div class="crumb reveal"><a href="/index.html"><span class="lang-en">Home</span><span class="lang-hi">मुख्य पृष्ठ</span></a> · <span class="lang-en">Articles</span><span class="lang-hi">लेख</span></div>
      <span class="eyebrow reveal"><span class="lang-en">From the Archive</span><span class="lang-hi">अभिलेखागार से</span></span>
      <h1 class="reveal mt-16"><span class="lang-en">Articles, essays &amp; <em>reflections</em></span><span class="lang-hi">लेख, निबंध एवं <em>परिचिंतन</em></span></h1>
      <p class="lede reveal"><span class="lang-en">Voices, research, and remembrance from across the Girmitiya diaspora.</span><span class="lang-hi">गिरमिटिया प्रवासी समुदाय से स्वर, शोध और स्मरण।</span></p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="article-grid">
${cards}
      </div>
    </div>
  </section>
` + footer();
}

// ---------- main ----------
function main() {
  const articles = loadArticles();
  console.log(`Loaded ${articles.length} markdown articles`);

  // Ensure output dirs exist
  fs.mkdirSync(ARTICLES_DIR, { recursive: true });

  // Per-article pages
  for (const a of articles) {
    const out = path.join(ARTICLES_DIR, a.slug + '.html');
    fs.writeFileSync(out, renderArticlePage(a, articles));
    console.log(`  ✓ articles/${a.slug}.html  (${a.title.slice(0, 60)})`);
  }

  // Index
  fs.writeFileSync(INDEX_PATH, renderIndexPage(articles));
  console.log(`  ✓ articles.html  (${articles.length} cards)`);

  console.log('\nBuild complete.');
}

main();
