/**
 * wordpress-sync.js
 * Notifica o portal WordPress após operações no SacristiaDigital.
 *
 * Uso:
 *   import { notificarWP } from './wordpress-sync.js';
 *
 *   // Após salvarEventoCompleto():
 *   await notificarWP('salvo', eventoId);
 *
 *   // Após excluir evento:
 *   await notificarWP('excluido', eventoId);
 *
 *   // Sync completo forçado (ex: botão admin):
 *   await sincronizarTudo();
 */

const WP_REST_URL = 'http://localhost/portalbomjesus/wp-json/paroquia/v1';
const WP_SECRET   = 'sd_wp_2026_paroquia';

/**
 * Notifica o WordPress sobre um evento específico.
 * @param {'salvo'|'excluido'} acao
 * @param {string} eventoId  - UUID do evento no Supabase
 */
export async function notificarWP(acao, eventoId) {
  if (!WP_SECRET || WP_SECRET === 'sd_wp_2026_paroquia') {
    console.warn('[WP Sync] Webhook secret não configurado. Pulando notificação.');
    return false;
  }
  try {
    const res = await fetch(`${WP_REST_URL}/evento/${acao}`, {
      method:  'POST',
      headers: {
        'Content-Type':        'application/json',
        'X-SD-Webhook-Secret': WP_SECRET,
      },
      body: JSON.stringify({ id: eventoId }),
    });
    if (!res.ok) {
      console.warn('[WP Sync] Resposta inesperada:', res.status, await res.text());
      return false;
    }
    const data = await res.json();
    console.log(`[WP Sync] ✓ evento/${acao}:`, data.acao ?? data);
    return true;
  } catch (err) {
    // Falha silenciosa — o WP-Cron faz o sync automático em 30 min
    console.warn('[WP Sync] Erro de rede (será corrigido pelo cron):', err.message);
    return false;
  }
}

/**
 * Dispara sync completo de todas as entidades.
 * Use em botão admin "Forçar sync com portal".
 */
export async function sincronizarTudo() {
  console.log('[WP Sync] Iniciando sync completo...');
  try {
    const res = await fetch(`${WP_REST_URL}/sync/tudo`, {
      method:  'POST',
      headers: { 'X-SD-Webhook-Secret': WP_SECRET },
    });
    const data = await res.json();
    console.log('[WP Sync] ✓ Sync completo:', data);
    return data;
  } catch (err) {
    console.error('[WP Sync] Erro no sync completo:', err);
    return null;
  }
}

/**
 * Verifica o status da integração com o portal.
 * Use para diagnóstico.
 */
export async function statusPortal() {
  try {
    const res  = await fetch(`${WP_REST_URL}/status`);
    const data = await res.json();
    console.table(data);
    return data;
  } catch (err) {
    console.error('[WP Sync] Portal inacessível:', err);
    return null;
  }
}