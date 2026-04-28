export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, source: 'ping' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
