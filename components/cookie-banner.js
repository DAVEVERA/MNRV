/* MNRV Cookie Consent — Consent Mode v2 + dual theme */
(function () {
  var STORAGE_KEY = 'mnrv_consent_v1';
  var IS_MODERN = document.documentElement.classList.contains('mnrv-modern') ||
    window.location.pathname.indexOf('mnrv.html') !== -1 ||
    window.location.pathname.indexOf('assets/mnrv') !== -1;

  /* ── Consent Mode v2 helpers ──────────────────────────── */
  function grantAll() {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        analytics_storage:      'granted',
        functionality_storage:  'granted',
        security_storage:       'granted'
      });
    }
  }

  function denyAnalytics() {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        analytics_storage:      'denied',
        functionality_storage:  'denied',
        security_storage:       'granted'
      });
    }
  }

  function applyStored(prefs) {
    if (typeof gtag !== 'function') return;
    gtag('consent', 'update', {
      analytics_storage:     prefs.analytics     ? 'granted' : 'denied',
      functionality_storage: prefs.functionality ? 'granted' : 'denied',
      security_storage:      'granted'
    });
  }

  /* ── Persistence ─────────────────────────────────────── */
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
    catch (e) { return null; }
  }

  function save(prefs) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); }
    catch (e) {}
  }

  /* ── Banner HTML ─────────────────────────────────────── */
  function buildBanner() {
    var el = document.createElement('div');
    el.id = 'mnrv-cookie-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Cookiemelding');

    if (IS_MODERN) {
      el.innerHTML = [
        '<div class="cb-inner cb-modern">',
        '  <p class="cb-title">Cookies</p>',
        '  <p class="cb-body">Wij gebruiken analytische cookies om bezoekersgedrag te begrijpen en functionele cookies voor het intakeformulier. Jij bepaalt wat je toestaat.</p>',
        '  <div class="cb-toggles">',
        '    <label class="cb-toggle"><input type="checkbox" id="cb-analytics" checked> <span>Analytisch</span></label>',
        '    <label class="cb-toggle"><input type="checkbox" id="cb-functional" checked> <span>Functioneel</span></label>',
        '  </div>',
        '  <div class="cb-actions">',
        '    <button class="cb-btn cb-accept-all">Alles accepteren</button>',
        '    <button class="cb-btn cb-save">Opslaan</button>',
        '    <button class="cb-btn cb-deny">Weigeren</button>',
        '  </div>',
        '</div>'
      ].join('');
    } else {
      el.innerHTML = [
        '<div class="cb-inner cb-retro">',
        '  <div class="cb-retro-titlebar"><span class="cb-retro-icon">🍪</span> MNRV — Cookiemelding</div>',
        '  <div class="cb-retro-body">',
        '    <p>Deze website maakt gebruik van:</p>',
        '    <ul>',
        '      <li><label><input type="checkbox" id="cb-analytics" checked> Analytische cookies</label></li>',
        '      <li><label><input type="checkbox" id="cb-functional" checked> Functionele cookies (intakeformulier)</label></li>',
        '    </ul>',
        '  </div>',
        '  <div class="cb-retro-actions">',
        '    <button class="win-btn win-btn-default cb-accept-all">OK</button>',
        '    <button class="win-btn cb-save">Opslaan</button>',
        '    <button class="win-btn cb-deny">Weigeren</button>',
        '  </div>',
        '</div>'
      ].join('');
    }

    return el;
  }

  /* ── Init ────────────────────────────────────────────── */
  function init() {
    var stored = load();

    if (stored) {
      applyStored(stored);
      return; // already decided, no banner
    }

    var banner = buildBanner();
    document.body.appendChild(banner);

    banner.querySelector('.cb-accept-all').addEventListener('click', function () {
      var prefs = { analytics: true, functionality: true };
      save(prefs);
      grantAll();
      banner.remove();
    });

    banner.querySelector('.cb-save').addEventListener('click', function () {
      var prefs = {
        analytics:     banner.querySelector('#cb-analytics').checked,
        functionality: banner.querySelector('#cb-functional').checked
      };
      save(prefs);
      applyStored(prefs);
      banner.remove();
    });

    banner.querySelector('.cb-deny').addEventListener('click', function () {
      var prefs = { analytics: false, functionality: false };
      save(prefs);
      denyAnalytics();
      banner.remove();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
