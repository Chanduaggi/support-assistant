const BASE_URL = process.env.REACT_APP_API_URL || '';

export async function sendMessage(sessionId, message) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send message');
  }
  return res.json();
}

export async function fetchConversation(sessionId) {
  const res = await fetch(`${BASE_URL}/api/conversations/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch conversation');
  return res.json();
}

export async function listSessions() {
  const res = await fetch(`${BASE_URL}/api/sessions`);
  if (!res.ok) throw new Error('Failed to list sessions');
  return res.json();
}
