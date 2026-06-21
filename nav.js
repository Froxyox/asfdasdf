// Shared nav + footer injected on every page
(function () {
  const currentPage = location.pathname.split('/').pop() || 'index.html';

  function navLink(href, label) {
    const active = currentPage === href ? ' class="active"' : '';
    return `<a href="${href}"${active}>${label}</a>`;
  }

  const navHTML = `
<nav class="site-nav">
  <div class="nav-inner">
    <a href="index.html" class="nav-logo">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="22" height="22" rx="5" fill="#4f87f0"/>
        <path d="M4 16L8.5 8L13 13L16 9.5L19 16H4Z" fill="white" opacity="0.9"/>
      </svg>
      <span>Migon Marketing</span>
    </a>
    <div class="nav-links">
      ${navLink('index.html', 'Home')}
      ${navLink('leaderboard.html', 'Leaderboard')}
      ${navLink('methodology.html', 'Methodology')}
    </div>
    <a href="submit.html" class="nav-cta">Get Listed</a>
    <button class="nav-burger" id="navBurger" aria-label="Menu">&#9776;</button>
  </div>
  <div class="nav-mobile" id="navMobile">
    ${navLink('index.html', 'Home')}
    ${navLink('leaderboard.html', 'Leaderboard')}
    ${navLink('methodology.html', 'Methodology')}
    ${navLink('submit.html', 'Get Listed')}
  </div>
</nav>`;

  const footerHTML = `
<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <a href="index.html" class="nav-logo">
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
          <rect width="22" height="22" rx="5" fill="#4f87f0"/>
          <path d="M4 16L8.5 8L13 13L16 9.5L19 16H4Z" fill="white" opacity="0.9"/>
        </svg>
        <span>Migon Marketing</span>
      </a>
      <p>Data-driven local business rankings and digital marketing intelligence.</p>
    </div>
    <div class="footer-links">
      <div class="footer-col">
        <h4>Rankings</h4>
        <a href="leaderboard.html">Leaderboard</a>
        <a href="methodology.html">Methodology</a>
        <a href="submit.html">Get Listed</a>
      </div>
      <div class="footer-col">
        <h4>Data sources</h4>
        <a href="#">Google Places</a>
        <a href="#">PageSpeed Insights</a>
        <a href="#">Ubersuggest</a>
      </div>
      <div class="footer-col">
        <h4>Contact</h4>
        <a href="https://migonmarketing.com" target="_blank" rel="noopener">migonmarketing.com</a>
        <a href="https://migonmarketing.com" target="_blank" rel="noopener">Schedule a free strategy call</a>
        <a href="https://migonmarketing.com" target="_blank" rel="noopener">Get a free site audit</a>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <p>&copy; 2026 Migon Marketing. Scores are calculated from weighted public signals.</p>
  </div>
</footer>`;

  document.body.insertAdjacentHTML('afterbegin', navHTML);
  document.body.insertAdjacentHTML('beforeend', footerHTML);

  document.getElementById('navBurger').addEventListener('click', () => {
    document.getElementById('navMobile').classList.toggle('open');
  });
})();
