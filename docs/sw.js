/* sw.js - Motor de Cache Sacristia Digital v3.0 */
/* Estratégia: Stale-While-Revalidate para assets, Network-Only para API */

// PERF-003: incrementar CACHE_NAME a cada deploy para forçar reinstalação
// O activate event limpa caches com nome diferente automaticamente.
const CACHE_NAME = 'sacristia-v3.2';
const CACHE_VERSION = '3.2.0';

// Assets essenciais para funcionamento offline
const ASSETS = [
  './index.html',
  './assets/css/styles.css',
  './assets/css/badge-comunidades.css',
  './assets/js/api.js',
  './assets/js/app.js',
  './assets/js/calendar-engine.js',
  './assets/js/modal-controller.js',
  './assets/js/error-handler.js',
  './manifest.json'
];

// Instalação: Salva arquivos essenciais (com tratamento de erro)
self.addEventListener('install', (e) => {
  console.log(`🔧 [SW] Instalando Service Worker v${CACHE_VERSION}...`);
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
  // NÃO usar skipWaiting() aqui - deixar usuário decidir quando atualizar
});

// Ativação: Limpa caches antigos e notifica clientes
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

// Mensagem do cliente para forçar atualização
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') {
    console.log('🚀 [SW] Recebido skipWaiting - ativando nova versão');
    self.skipWaiting();
  }
});

// Estratégia Fetch: Stale-While-Revalidate para assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // 1. Chamadas Supabase: sempre rede (não cachear dados dinâmicos)
  if (url.hostname.includes('supabase.co')) {
    return; // Deixa o fetch normal acontecer
  }
  
  // 2. CDNs externos (Lucide, etc): cache-first
  if (url.hostname !== location.hostname) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
    return;
  }

  // PERF-003: JS e CSS usam network-first — garante código atualizado após
  // cada deploy sem aguardar expiração do SW. Em offline, serve do cache.
  const isScript = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
  if (isScript) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => caches.match(e.request).then(cached => {
          if (cached) return cached;
          return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }))
    );
    return;
  }

  // 3. HTML e outros assets locais: Stale-While-Revalidate
  // Serve do cache imediatamente, busca atualização em background
  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(e.request);

      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(e.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => null);

      if (cachedResponse) {
        return cachedResponse;
      }

      const networkResponse = await fetchPromise;
      if (networkResponse) {
        return networkResponse;
      }

      console.log('⚠️ [SW] Offline e sem cache:', url.pathname);
      return new Response('Offline - Conteúdo não disponível', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })
  );
});