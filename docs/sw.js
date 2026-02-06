/* sw.js - Motor de Cache Sacristia Digital */
const CACHE_NAME = 'sacristia-v2';
const ASSETS = [
  './index.html',
  './assets/css/styles.css',
  './assets/js/api.js',
  './assets/js/app.js'
];

// Instalação: Salva arquivos essenciais (com tratamento de erro)
self.addEventListener('install', (e) => {
  console.log('🔧 [SW] Instalando Service Worker...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Tenta cachear cada arquivo individualmente
        const cachePromises = ASSETS.map(asset => 
          cache.add(asset).catch(err => {
            console.warn(`⚠️ [SW] Falha ao cachear ${asset}:`, err);
            return null;
          })
        );
        await Promise.allSettled(cachePromises);
        console.log('✅ [SW] Service Worker instalado');
      } catch (err) {
        console.error('❌ [SW] Erro na instalação:', err);
      }
    })
  );
  // Força ativação imediata
  self.skipWaiting();
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (e) => {
  console.log('🔄 [SW] Ativando Service Worker...');
  e.waitUntil(
    caches.keys().then((keys) => {
      const deletePromises = keys
        .filter(k => k !== CACHE_NAME)
        .map(k => {
          console.log(`🗑️ [SW] Removendo cache antigo: ${k}`);
          return caches.delete(k);
        });
      return Promise.all(deletePromises);
    }).then(() => {
      console.log('✅ [SW] Service Worker ativado');
      return self.clients.claim(); // Assume controle imediatamente
    })
  );
});

// Estratégia Fetch: Tenta rede, se falhar ou estiver em cache, usa cache
self.addEventListener('fetch', (e) => {
  // Não cachear chamadas do Supabase (para manter dados reais)
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    caches.match(e.request)
      .then((res) => res || fetch(e.request))
      .catch((err) => {
        console.log('⚠️ [SW] Erro no fetch:', err);
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});