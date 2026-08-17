/* ============================================================================
   Stuck Not Broken — cloud config.

   ONE codebase, TWO backends. The environment is chosen by HOSTNAME at runtime,
   not by editing this file per-deploy. That is deliberate: hand-swapping keys
   before a deploy is exactly how staging ends up writing into production.

     app.stucknotbroken.com   -> prod    (piutnzwpbrydyipwaocl)
     beta.stucknotbroken.com  -> staging (qzwpktrzfswhcprrjysz)
     localhost / 127.0.0.1    -> staging (so local preview never touches real data)
     anything else            -> staging (fail safe, never fail into prod)

   Both anon keys are safe to ship in client code — they only work through
   row-level security, which the SQL enforces. The de-identified analytics.*
   mirror is unreachable with either key (anon has no USAGE on that schema).

   Added 2026-07-10 alongside the beta/staging environment.
   ========================================================================== */

const SNB_ENVS = {
  prod: {
    name: 'prod',
    SUPABASE_URL:      'https://piutnzwpbrydyipwaocl.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdXRuendwYnJ5ZHlpcHdhb2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNjEzMzcsImV4cCI6MjA5NzgzNzMzN30.sWJQ--a6-Wdodud6StMzfU_wwSCeUT-ThSRiOxbJ0uU',
  },
  staging: {
    name: 'staging',
    SUPABASE_URL:      'https://qzwpktrzfswhcprrjysz.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6d3BrdHJ6ZnN3aGNwcnJqeXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MzQ4OTQsImV4cCI6MjA5OTMxMDg5NH0.3v0SVI4ROr9LT9fywwfR2c5OP83butDvNgk2FGeBLn0',
  },
};

/* Only the exact production hostname gets the production database. Everything
   else — beta, localhost, a preview URL, a typo — falls through to staging.
   The failure mode of a mistake is "wrote to staging," never "wrote to prod." */
function snbPickEnv(host) {
  return host === 'app.stucknotbroken.com' ? SNB_ENVS.prod : SNB_ENVS.staging;
}

const SNB_ENV = snbPickEnv(location.hostname);

/* Cloudflare Pages also serves the staging build at snb-beta.pages.dev, and that
   hostname CANNOT be covered by the Cloudflare Access gate (Access only protects
   hostnames in a zone we own; pages.dev is Cloudflare's). So the gate on
   beta.stucknotbroken.com is bypassable simply by knowing the pages.dev URL.

   Bounce it to the gated domain. This is a client-side guard, so treat it as a
   speed bump, not a security boundary — it is acceptable only because staging holds
   no real user data and has no Stripe. Never rely on this to protect anything real. */
if (/\.pages\.dev$/i.test(location.hostname)) {
  location.replace('https://beta.stucknotbroken.com' + location.pathname + location.search + location.hash);
}

window.SNB_CONFIG = {
  SUPABASE_URL:      SNB_ENV.SUPABASE_URL,
  SUPABASE_ANON_KEY: SNB_ENV.SUPABASE_ANON_KEY,
};
window.SNB_ENV = SNB_ENV.name;          // 'prod' | 'staging'
window.SNB_IS_STAGING = SNB_ENV.name === 'staging';

window.sb = null;
(function () {
  const c = window.SNB_CONFIG;
  if (c.SUPABASE_URL && c.SUPABASE_ANON_KEY && window.supabase) {
    try { window.sb = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY); }
    catch (e) { console.warn('Supabase init failed:', e); }
  }
})();
window.SNB_CLOUD = !!window.sb;   // true once keys are in and the client built

/* Loud, unmissable marker that you are NOT on production data. A thin bar at the
   very top, outside the app's own layout. Only ever renders off-prod. */
if (window.SNB_IS_STAGING) {
  console.warn('[SNB] staging environment — backend: ' + SNB_ENV.SUPABASE_URL);
  document.addEventListener('DOMContentLoaded', function () {
    try {
      const b = document.createElement('div');
      b.textContent = 'Beta: test data, not your real account';
      b.setAttribute('role', 'status');
      b.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
        'font:500 11px/1 Inter,system-ui,sans-serif', 'letter-spacing:.08em',
        'text-align:center',
        'padding:4px 8px', 'padding-top:max(4px,env(safe-area-inset-top))',
        'background:#D29A4A', 'color:#1A1F2A', 'pointer-events:auto', 'cursor:pointer',
      ].join(';');
      /* 2026-08-17 — tap the beta bar to read the player trace. An installed PWA has no
         address bar AND its own storage container, so player.html?log=1 is unreachable
         from inside the app — which is the only place the practice actually runs. This
         is staging-only by construction: the whole block sits inside SNB_IS_STAGING. */
      b.addEventListener('click', function () {
        const open = document.getElementById('snb-logview');
        if (open) { open.remove(); return; }
        let rows = [];
        try { rows = JSON.parse(localStorage.getItem('snb_player_log')) || []; } catch (e) {}
        const text = rows.map(function (e) {
          return [e.t, e.vis, e.tag, 'pos=' + e.pos, 'ap=' + e.ap, e.st, e.src, e.x].filter(Boolean).join('  ');
        }).join('\n') || '(no player events recorded in this app yet)';
        const w = document.createElement('div');
        w.id = 'snb-logview';
        w.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#111;color:#eee;display:flex;flex-direction:column';
        const bar = document.createElement('div');
        bar.style.cssText = 'display:flex;gap:8px;padding:calc(6px + env(safe-area-inset-top)) 10px 6px;background:#000;flex:none';
        const mk = function (label, fn) {
          const x = document.createElement('button');
          x.textContent = label;
          x.style.cssText = 'font:500 12px Inter,system-ui,sans-serif;padding:7px 12px;border:0;border-radius:8px;background:#eee;color:#111';
          x.onclick = fn; return x;
        };
        bar.appendChild(mk('Copy', function () { try { navigator.clipboard.writeText(text); this.textContent = 'Copied'; } catch (e) {} }));
        bar.appendChild(mk('Clear', function () { try { localStorage.removeItem('snb_player_log'); } catch (e) {} w.remove(); }));
        bar.appendChild(mk('Close', function () { w.remove(); }));
        const pre = document.createElement('pre');
        pre.style.cssText = 'margin:0;padding:10px;overflow:auto;flex:1;font:11px/1.4 ui-monospace,monospace;white-space:pre-wrap;-webkit-user-select:text;user-select:text';
        pre.textContent = text;
        w.appendChild(bar); w.appendChild(pre);
        document.body.appendChild(w);
      });
      document.body.appendChild(b);
    } catch (e) {}
  });
}
