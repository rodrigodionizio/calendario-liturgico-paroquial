/* sw.js - Motor de Cache Sacristia Digital */
const CACHE_NAME = 'sacristia-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/admin.html',
  '/assets/css/styles.css',
  '/assets/css/dashboard.css',
  '/assets/js/api.js',
  '/assets/js/app.js',
  '/assets/js/dashboard.js',
  '/assets/img/logo-paroquia-colorida.png'
];

// Instalação: Salva arquivos essenciais
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    })
  );
});

// Estratégia Fetch: Tenta rede, se falhar ou estiver em cache, usa cache
self.addEventListener('fetch', (e) => {
  // Não cachear chamadas do Supabase (para manter dados reais)
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});