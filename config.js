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
      b.textContent = 'beta — test data, not your real account';
      b.setAttribute('role', 'status');
      b.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
        'font:500 11px/1 Inter,system-ui,sans-serif', 'letter-spacing:.08em',
        'text-transform:lowercase', 'text-align:center',
        'padding:4px 8px', 'padding-top:max(4px,env(safe-area-inset-top))',
        'background:#D29A4A', 'color:#1A1F2A', 'pointer-events:none',
      ].join(';');
      document.body.appendChild(b);
    } catch (e) {}
  });
}
