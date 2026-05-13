/**
 * Thin wrapper around the Expo push API.
 *
 * https://exp.host/--/api/v2/push/send accepts a JSON array of messages.
 * Each message: { to, title, body, data, sound, channelId, priority }.
 *
 * The service is deliberately tiny — we don't bring in expo-server-sdk
 * because that pulls a large dependency tree for what is essentially one
 * HTTP POST per fan-out. Failed tokens are returned so the caller can prune
 * dead tokens from the recipient's `pushTokens` array.
 */
const EXPO_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a single push to one or more Expo tokens. Tokens are deduplicated
 * here so callers can pass tokens from multiple sources without worry.
 *
 * @returns {Promise<{ sent: number, errors: Array<{ token, error }> }>}
 */
async function sendPush(tokens, { title, body, data = {} }) {
  const list = Array.from(new Set((Array.isArray(tokens) ? tokens : [tokens]).filter(Boolean)));
  if (!list.length) return { sent: 0, errors: [] };

  // Expo accepts at most 100 messages per request — chunk to be safe.
  const chunks = [];
  for (let i = 0; i < list.length; i += 100) chunks.push(list.slice(i, i + 100));

  const errors = [];
  let sent = 0;

  for (const chunk of chunks) {
    const messages = chunk.map((to) => ({
      to,
      title,
      body,
      sound: 'default',
      priority: 'high',
      data,
    }));
    try {
      const res = await fetch(EXPO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });
      const json = await res.json();
      // Expo returns { data: [{ status, id, message, details }] }.
      const tickets = Array.isArray(json?.data) ? json.data : [];
      tickets.forEach((t, i) => {
        if (t.status === 'ok') sent += 1;
        else errors.push({ token: chunk[i], error: t.message || 'unknown', details: t.details });
      });
    } catch (err) {
      // Whole-chunk failure (network, JSON parse). Surface but don't throw —
      // we want notification fan-out to be best-effort, never blocking.
      console.error('[expoPush] chunk failed:', err.message);
      chunk.forEach((token) => errors.push({ token, error: err.message }));
    }
  }
  return { sent, errors };
}

module.exports = { sendPush };
