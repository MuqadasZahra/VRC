// api/admin/fleet.js
import { getDb } from '../../lib/firebaseAdmin.js';
import { isAuthed } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Not authenticated' });
  const db = getDb();
  const col = db.collection('fleet');

  if (req.method === 'GET') {
    const snap = await col.get();
    const rows = snap.docs.map(d => ({ id: Number(d.id), ...d.data() }));
    rows.sort((a, b) => a.id - b.id);
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { id, ...data } = req.body || {};
    if (id) {
      await col.doc(String(id)).update(data);
      return res.status(200).json({ id });
    } else {
      const snap = await col.get();
      const ids = snap.docs.map(d => Number(d.id));
      const newId = ids.length ? Math.max(...ids) + 1 : 1;
      await col.doc(String(newId)).set({ id: newId, ...data });
      return res.status(200).json({ id: newId });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await col.doc(String(id)).delete();
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
