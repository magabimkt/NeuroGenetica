/* NeuroGenética: funcionamento sem internet e aviso de versão nova.
   Ao publicar uma versão nova do app, aumente o número abaixo (v1 → v2). */
const VERSAO = 'neurogenetica-v1';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSAO)
      .then(c => c.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    const antigos = nomes.filter(n => n.startsWith('neurogenetica-') && n !== VERSAO);
    await Promise.all(antigos.map(n => caches.delete(n)));
    await self.clients.claim();
    /* Se havia uma versão anterior, avisa as telas abertas que existe versão nova */
    if (antigos.length) {
      const telas = await self.clients.matchAll({ type: 'window' });
      telas.forEach(t => t.postMessage('nova-versao'));
    }
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Páginas: tenta a internet primeiro (para pegar a versão mais nova), e usa a cópia salva se estiver sem conexão */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const copia = r.clone(); caches.open(VERSAO).then(c => c.put('./index.html', copia)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  /* Arquivos do próprio app e fontes do Google: usa a cópia salva e atualiza em segundo plano */
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin === self.location.origin || fonte) {
    e.respondWith(
      caches.match(req).then(salvo => {
        const rede = fetch(req).then(r => {
          if (r && (r.ok || r.type === 'opaque')) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
          return r;
        }).catch(() => salvo);
        return salvo || rede;
      })
    );
  }
});
