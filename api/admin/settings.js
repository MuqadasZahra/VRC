// api/admin/settings.js
import { getDb } from '../../lib/firebaseAdmin.js';
import { isAuthed } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Not authenticated' });
  const db = getDb();
  const ref = db.collection('settings').doc('main');

  if (req.method === 'GET') {
    const doc = await ref.get();
    return res.status(200).json(doc.exists ? doc.data() : {});
  }

  if (req.method === 'POST') {
    await ref.set(req.body || {}, { merge: true });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
