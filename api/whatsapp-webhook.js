// /api/whatsapp-webhook.js
// Vercel serverless function — receives WhatsApp Business Cloud API events from Meta
// and writes each incoming message into the same Firestore database the admin
// panel is listening to, so new messages appear automatically.
//
// SETUP (see SETUP-GUIDE.md for the full walkthrough):
// 1. npm install firebase-admin
// 2. In Vercel → Project → Settings → Environment Variables, add:
//      FIREBASE_SERVICE_ACCOUNT   (paste the full JSON from your Firebase service account key)
//      WHATSAPP_VERIFY_TOKEN      (any string you make up, e.g. "victoria-verify-2026")
// 3. Deploy. Your webhook URL will be:
//      https://YOUR-VERCEL-DOMAIN.vercel.app/api/whatsapp-webhook
// 4. Paste that URL + your WHATSAPP_VERIFY_TOKEN into Meta's WhatsApp
//    "Configuration → Webhook" screen, and subscribe to the "messages" field.

import { getDb } from '../lib/firebaseAdmin.js';

export default async function handler(req, res) {
  // --- Step 1: Meta's one-time webhook verification (GET request) ---
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification failed');
  }

  // --- Step 2: Incoming message events (POST request) ---
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        // Could be a status update (delivered/read) rather than a new message — ignore those.
        return res.status(200).send('ok');
      }

      const db = getDb();
      const contact = value.contacts?.[0];
      const name = contact?.profile?.name || 'WhatsApp Contact';

      for (const msg of messages) {
        const phone = msg.from; // e.g. "971501234567"
        const text = msg.text?.body || `[${msg.type} message]`;
        const timestamp = msg.timestamp
          ? new Date(Number(msg.timestamp) * 1000).toISOString()
          : new Date().toISOString();

        await db.collection('queries').add({
          name,
          phone,
          message: text,
          status: 'new',
          source: 'whatsapp',
          createdAt: timestamp,
        });
      }

      return res.status(200).send('ok');
    } catch (err) {
      console.error('Webhook error:', err);
      // Still return 200 so Meta doesn't disable the webhook after repeated failures —
      // log the error and inspect it in Vercel's function logs instead.
      return res.status(200).send('logged');
    }
  }

  return res.status(405).send('Method not allowed');
}
