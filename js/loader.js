/**
 * EXP Supplier Network — Global Loading Animation
 * Shows the EXP logo spinning horizontally (rotateY).
 * Strategic placement only: homepage first load, dashboard data loads.
 * No global fetch interception — caller decides when to show/hide.
 */
const LoaderManager = (() => {
  let el = null;
  let pendingCount = 0;
  let autoHideTimer = null;

  function init() {
    if (document.getElementById('globalLoader')) {
      el = document.getElementById('globalLoader');
      return;
    }
    const div = document.createElement('div');
    div.id = 'globalLoader';
    div.innerHTML = `
      <style>
        #globalLoader {
          position: fixed; inset: 0;
          background: rgba(255,255,255,.96);
          z-index: 10000;
          display: none;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 20px;
          transition: opacity .25s ease;
        }
        #globalLoader.is-visible { display: flex; }
        @keyframes exp-flip {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .exp-loader-logo {
          width: 110px;
          height: 110px;
          animation: exp-flip 1.4s ease-in-out infinite;
          transform-style: preserve-3d;
          perspective: 600px;
          will-change: transform;
        }
        .exp-loader-text {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #999;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
      </style>
      <img class="exp-loader-logo" src="/exp-logo.png" alt="EXP" onerror="this.onerror=null;this.src='../exp-logo.png'">
      <span class="exp-loader-text">Loading&hellip;</span>
    `;
    document.body.insertAdjacentElement('afterbegin', div);
    el = div;
  }

  function show() {
    if (!el) init();
    el.style.display = 'flex';
    clearTimeout(autoHideTimer);
    // Safety net — never hang forever
    autoHideTimer = setTimeout(hide, 15000);
  }

  function hide() {
    if (!el) return;
    el.style.display = 'none';
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }

  /** Wrap an async fetch/data call so the loader shows while it runs */
  async function wrap(promiseFn) {
    show();
    try {
      return await promiseFn();
    } finally {
      hide();
    }
  }

  // Show on the very first page load (homepage & logins only)
  document.addEventListener('DOMContentLoaded', () => {
    init();
    const path = window.location.pathname;
    const isStrategicPage = path === '/' || path.endsWith('/index.html') ||
      path.includes('/login') || path.includes('/dashboard');
    if (isStrategicPage) {
      show();
      // If nothing calls hide() within 1.8s, auto-dismiss
      setTimeout(() => { if (el && el.style.display === 'flex') hide(); }, 1800);
    }
  });

  return { show, hide, wrap, init };
})();
