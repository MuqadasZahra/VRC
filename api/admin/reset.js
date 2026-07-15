// api/admin/reset.js
import { getDb } from '../../lib/firebaseAdmin.js';
import { isAuthed } from '../../lib/auth.js';

const CAR_SEED = [
  { id: 1, name: "Mercedes-Benz S-Class", cat: "Luxury Sedan", price: 650, seats: 5, trans: "Automatic", fuel: "Petrol", bags: 3, available: true, img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop" },
  { id: 2, name: "Range Rover Sport", cat: "SUV & 4x4", price: 950, seats: 5, trans: "Automatic", fuel: "Petrol", bags: 4, available: true, img: "https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?q=80&w=800&auto=format&fit=crop" },
  { id: 3, name: "Porsche 911 Carrera", cat: "Sports & Supercar", price: 1800, seats: 2, trans: "Automatic", fuel: "Petrol", bags: 1, available: true, img: "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?q=80&w=800&auto=format&fit=crop" },
  { id: 4, name: "BMW 7 Series", cat: "Luxury Sedan", price: 700, seats: 5, trans: "Automatic", fuel: "Petrol", bags: 3, available: true, img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop" },
  { id: 5, name: "Lamborghini Huracán", cat: "Sports & Supercar", price: 2400, seats: 2, trans: "Automatic", fuel: "Petrol", bags: 1, available: false, img: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=800&auto=format&fit=crop" },
  { id: 6, name: "Rolls-Royce Ghost", cat: "Chauffeur Service", price: 2200, seats: 4, trans: "Automatic", fuel: "Petrol", bags: 3, available: true, img: "https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=800&auto=format&fit=crop" }
];
const FIRST_NAMES = ["Omar","Elena","Hannah","Faisal","Marco","Aisha","Yusuf","Priya","Daniel","Sara","Grace","Khalid","Layla","Tom","Nadia","James","Fatima","Chris","Zainab","Robert","Mei","Ahmed","Sophie","Karim"];
const LAST_NAMES = ["Al Farsi","Kovač","Whitfield","Noor","Ricci","Khan","Demir","Nair","Osei","Malik","Lin","Rahman","Haddad","Reed","Ibrahim","Foster","Siddiqui","Bennett","Karimi","Park"];
const LOCATIONS = ["DXB Terminal 3","Downtown Dubai Hotel","Business Bay Office","JBR Marina Walk","Dubai Mall Valet","Palm Jumeirah Villa","DIFC Tower"];
const WA_MESSAGES = [
  "Hi, is the Range Rover available this weekend?",
  "Can I get a quote for a 5-day rental?",
  "Do you offer airport pickup at DXB Terminal 1?",
  "Is a chauffeur included with the Rolls-Royce?",
  "What documents do I need to rent a car?",
  "Can I extend my current booking by 2 days?",
  "Is the Porsche available for a same-day pickup?",
  "Do you have a car seat option for toddlers?",
  "What's included in the insurance package?",
  "Can I pay with a credit card on delivery?",
  "Looking for a wedding car with driver for Saturday.",
  "Is there a discount for a monthly rental?"
];

function dateStr(d) { return d.toISOString().slice(0, 10); }

async function wipeCollection(db, name) {
  const snap = await db.collection(name).get();
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  if (snap.docs.length) await batch.commit();
}

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Not authenticated' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const db = getDb();
  await wipeCollection(db, 'bookings');
  await wipeCollection(db, 'queries');
  await wipeCollection(db, 'fleet');

  const now = new Date();

  const fleetBatch = db.batch();
  CAR_SEED.forEach(car => {
    const { id, ...rest } = car;
    fleetBatch.set(db.collection('fleet').doc(String(id)), { ...rest, id });
  });
  await fleetBatch.commit();

  const statuses = ['completed', 'completed', 'completed', 'confirmed', 'pending', 'cancelled'];
  let bookingBatch = db.batch();
  let count = 0;
  for (let i = 0; i < 70; i++) {
    const daysAgo = Math.floor(Math.random() * 120);
    const pickup = new Date(now); pickup.setDate(pickup.getDate() - daysAgo);
    const dur = 1 + Math.floor(Math.random() * 5);
    const dropoff = new Date(pickup); dropoff.setDate(dropoff.getDate() + dur);
    const car = CAR_SEED[Math.floor(Math.random() * CAR_SEED.length)];
    const status = daysAgo < 2 ? (Math.random() < 0.6 ? 'pending' : 'confirmed') : statuses[Math.floor(Math.random() * statuses.length)];
    const ref = db.collection('bookings').doc();
    bookingBatch.set(ref, {
      customer: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] + ' ' + LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)],
      phone: '+971 5' + Math.floor(Math.random() * 10) + ' ' + Math.floor(100 + Math.random() * 900) + ' ' + Math.floor(1000 + Math.random() * 9000),
      email: '',
      car: car.name, carId: car.id,
      pickup: dateStr(pickup), dropoff: dateStr(dropoff),
      location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
      notes: '', status, amount: car.price * dur,
      createdAt: pickup.toISOString()
    });
    count++;
    if (count % 400 === 0) { await bookingBatch.commit(); bookingBatch = db.batch(); }
  }
  await bookingBatch.commit();

  const queryBatch = db.batch();
  for (let i = 0; i < 16; i++) {
    const daysAgo = Math.floor(Math.random() * 20);
    const created = new Date(now); created.setDate(created.getDate() - daysAgo); created.setHours(9 + Math.floor(Math.random() * 11));
    const statusPool = daysAgo < 1 ? ['new', 'new', 'replied'] : ['replied', 'closed', 'closed', 'new'];
    const ref = db.collection('queries').doc();
    queryBatch.set(ref, {
      name: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] + ' ' + LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)],
      phone: '9715' + Math.floor(10000000 + Math.random() * 89999999),
      message: WA_MESSAGES[Math.floor(Math.random() * WA_MESSAGES.length)],
      status: statusPool[Math.floor(Math.random() * statusPool.length)],
      source: 'whatsapp',
      createdAt: created.toISOString()
    });
  }
  await queryBatch.commit();

  return res.status(200).json({ ok: true });
}
