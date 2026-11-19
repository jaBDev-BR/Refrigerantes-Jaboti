// Jaboti Run — guarda o jogo no aparelho para abrir rápido e jogar sem internet (só no site do GitHub Pages).
// Página (index.html): tenta a rede primeiro (para pegar a versão nova) e usa a cópia guardada se estiver sem internet.
// Imagens (assets/...?v=<versão>): usa a cópia guardada; quando a versão muda, o endereço muda e a imagem nova é baixada
// (as cópias da versão antiga do mesmo arquivo são apagadas).
const CACHE = 'jaboti-run';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;            // ranking (Supabase) e outros sites: direto
  const asset = url.pathname.includes('/assets/');
  if (asset) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) {
        c.put(req, res.clone());
        if (url.search) (await c.keys()).forEach(k => { const u = new URL(k.url); if (u.pathname === url.pathname && u.search !== url.search) c.delete(k); });
      }
      return res;
    }));
    return;
  }
  e.respondWith(fetch(req).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())); return res; })
    .catch(() => caches.match(req).then(r => r || caches.match('./?app') || caches.match('./'))));
});
