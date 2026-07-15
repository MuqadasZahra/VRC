# Making bookings & WhatsApp messages appear automatically

This connects your website, admin panel, and WhatsApp Business account to one
shared database (Firebase Firestore), with your admin panel protected by a
plain password instead of Firebase Authentication — so you never need to go
back into the Firebase Console after the one-time setup below.

**How the pieces fit together:**
- Your **public website** writes new bookings directly into Firestore (no login needed for a customer to book — this hasn't changed).
- Your **admin panel** never talks to Firestore directly. It logs in with a password, then talks to small server functions (`/api/admin/...`) that use a Firebase *service account* to read/write data. This is more secure than the previous version — customer data isn't reachable from the browser at all.
- **WhatsApp messages** land on the same server functions via a webhook, and show up in the panel automatically (it checks for updates every few seconds).

Total time: ~25–35 minutes, plus Meta's review time for WhatsApp.

---

## Step 1 — Create your Firebase project (~10 min)

You'll need to get past your Google account's 2-Step Verification requirement to access the Firebase Console for this one-time setup — after this, you won't need to open it again.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in.
2. Click **Add project** → name it e.g. `victoria-rental-car` → skip Google Analytics if asked → **Create project**.
3. Left sidebar → **Build → Firestore Database** → **Create database** → pick a region close to Dubai (e.g. `me-central1` if offered) → start in **Production mode**.
4. Click the ⚙️ gear icon (top left) → **Project settings** → scroll to **Your apps** → click the **</>** (Web) icon → nickname it `victoria-web` → **Register app**. You'll see a config object like:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "victoria-rental-car.firebaseapp.com",
     projectId: "victoria-rental-car",
     storageBucket: "victoria-rental-car.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```
   Open `firebase-config.js` and paste your real values in place of the `PASTE_YOUR_...` placeholders. This file is only used by your **public website**, for the booking form — the admin panel doesn't need it.

5. Still in Project Settings, go to the **Service accounts** tab → **Generate new private key** → confirm. A JSON file downloads — keep it safe, you'll need its full contents in Step 2.

### Secure your data (Firestore rules)

Go to **Firestore Database → Rules** and replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // The public website can only ever SUBMIT a booking or a query —
    // it can't read, edit, or delete anything.
    match /bookings/{id} {
      allow create: if true;
      allow read, update, delete: if false;
    }
    match /queries/{id} {
      allow create: if true;
      allow read, update, delete: if false;
    }
    // Fleet & settings are never touched directly by any browser —
    // only your server functions (via the service account) manage these.
    match /fleet/{id} {
      allow read, write: if false;
    }
    match /settings/{id} {
      allow read, write: if false;
    }
  }
}
```

Click **Publish**. Because your admin panel now goes through your server functions (which use the service account and bypass these rules entirely), nothing here needs `request.auth` — there's no Firebase Authentication involved at all.

---

## Step 2 — Deploy to Vercel (~10 min)

Unzip the project — it's already structured correctly for a single upload:

```
victoria-project/                  ← upload this whole folder
├── victoria-admin-panel.html      ← password login → dashboard
├── victoria-rental-car.html       ← your public site, unchanged
├── firebase-config.js             ← paste your real values in (Step 1.4)
├── package.json
├── vercel.json
├── lib/
│   ├── auth.js
│   └── firebaseAdmin.js
└── api/
    ├── admin-login.js
    ├── admin-logout.js
    ├── whatsapp-webhook.js
    └── admin/
        ├── bookings.js
        ├── queries.js
        ├── fleet.js
        ├── settings.js
        └── reset.js
```

1. Deploy this folder to Vercel (drag-and-drop the whole folder on the dashboard, or `vercel --prod` from inside it via the CLI).
2. In Vercel → your project → **Settings → Environment Variables**, add:
   - `FIREBASE_SERVICE_ACCOUNT` — paste the *entire contents* of the JSON file you downloaded in Step 1.5.
   - `ADMIN_PASSWORD` — whatever password you want to log into the admin panel with.
   - `SESSION_SECRET` — any long random string (e.g. mash your keyboard for 30 characters) — used to sign your login session, not something you need to remember.
   - `WHATSAPP_VERIFY_TOKEN` — any string you make up, e.g. `victoria-verify-2026`. You'll reuse this in Step 3.
3. Redeploy (Vercel → Deployments → ⋯ → Redeploy) so the new environment variables take effect.
4. Visit `https://your-domain.vercel.app/victoria-admin-panel.html`, and log in with just the `ADMIN_PASSWORD` you set.

At this point, submitting the booking form on your live site should already appear in the admin panel's Bookings tab within a few seconds — try it.

---

## Step 3 — Connect WhatsApp Business (~15–20 min, plus Meta review time)

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App** → type **Business** → name it.
2. On the app dashboard, find **WhatsApp** → **Set up**. Meta gives you a free test phone number to start.
3. Under **API Setup**, note the **Phone number ID** (you won't need the temporary token for this setup).
4. Back in the Meta app dashboard → **WhatsApp → Configuration**:
   - **Callback URL**: `https://your-domain.vercel.app/api/whatsapp-webhook`
   - **Verify token**: the same string you set as `WHATSAPP_VERIFY_TOKEN` in Step 2.2
   - Click **Verify and save**, then subscribe to the **messages** webhook field.
5. Send a WhatsApp message to the test number from your phone. It should appear in the admin panel's WhatsApp Queries tab within a few seconds.

**To go live with your real number** (`+971 50 123 4567`), Meta requires a verified Business Portfolio and a one-time verification of that number — this can take a few hours to a few days. Everything works end-to-end on the free test number in the meantime, so you can fully test before switching over.

---

## What you get

- A customer submits the booking form → appears in **Bookings** within seconds, with a toast notification.
- A customer messages your WhatsApp number → appears in **WhatsApp Queries** within seconds.
- Logging into the admin panel just needs the one password — no Google account, no Firebase Authentication.
- Charts and reports update automatically as bookings come in.

## If something doesn't show up

- Open the browser console (F12) on the admin panel — API errors will show there.
- In Vercel → your project → **Functions**, click into `admin-login`, `bookings`, `whatsapp-webhook` etc. to see server-side logs and errors for each.
- A 401 error on any admin action almost always means your session expired (12 hours) — just log in again.
- If bookings/messages aren't appearing: check `FIREBASE_SERVICE_ACCOUNT` is the *complete* JSON (a truncated paste is the most common cause of silent failures).
