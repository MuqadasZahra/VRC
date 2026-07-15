// api/admin/queries.js
import { getDb } from '../../lib/firebaseAdmin.js';
import { isAuthed } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Not authenticated' });
  const db = getDb();
  const col = db.collection('queries');

  if (req.method === 'GET') {
    const snap = await col.orderBy('createdAt', 'desc').get();
    return res.status(200).json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  if (req.method === 'POST') {
    const { id, ...data } = req.body || {};
    if (id) {
      await col.doc(id).update(data);
      return res.status(200).json({ id });
    } else {
      const ref = await col.add({ createdAt: new Date().toISOString(), source: 'manual', ...data });
      return res.status(200).json({ id: ref.id });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await col.doc(id).delete();
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
