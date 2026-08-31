/* Finanças — service worker
   Estratégia:
   - A página (index.html): REDE PRIMEIRO. Com internet, sempre pega a versão mais nova.
     Sem internet, serve a última cópia salva. Assim o app se atualiza sozinho,
     sem precisar mexer neste arquivo nunca mais.
   - Demais arquivos: cache primeiro (são estáticos).                                   */

const CACHE = "ifinance";
const FILES = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const isPage = req.mode === "navigate" || req.destination === "document";

  if (isPage) {
    // rede primeiro — garante que você sempre abre a versão mais recente
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match("./index.html", { ignoreSearch: true })
            .then(hit => hit || caches.match("./", { ignoreSearch: true }))
        )
    );
    return;
  }

  // outros arquivos: cache primeiro
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit =>
      hit ||
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
    )
  );
});
