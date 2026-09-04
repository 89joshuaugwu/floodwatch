const path = require("node:path");
const admin = require("firebase-admin");

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT ||
  path.resolve(__dirname, "..", "floodwatch-bbd39-firebase-adminsdk.json");
const serviceAccount = require(serviceAccountPath);

const stations = [
  {
    id: "ogui-nike-road-drainage",
    name: "Ogui-Nike Road Drainage",
    riverName: "Ekulu River",
    lat: 6.4728,
    lng: 7.5325,
    thresholds: { watchCm: 55, warningCm: 70, dangerCm: 85, riseRateThresholdCmPerHour: 15 },
  },
  {
    id: "new-haven-ekulu-bridge",
    name: "New Haven Ekulu Bridge",
    riverName: "Ekulu River",
    lat: 6.4639,
    lng: 7.5086,
    thresholds: { watchCm: 60, warningCm: 75, dangerCm: 90, riseRateThresholdCmPerHour: 15 },
  },
  {
    id: "coal-camp-ekulu-crossing",
    name: "Coal Camp Ekulu Crossing",
    riverName: "Ekulu River",
    lat: 6.4397,
    lng: 7.4975,
    thresholds: { watchCm: 55, warningCm: 70, dangerCm: 85, riseRateThresholdCmPerHour: 15 },
  },
  {
    id: "ogui-road-idaw-channel",
    name: "Ogui Road Idaw Channel",
    riverName: "Idaw River",
    lat: 6.4588,
    lng: 7.4932,
    thresholds: { watchCm: 50, warningCm: 65, dangerCm: 80, riseRateThresholdCmPerHour: 12 },
  },
  {
    id: "independence-layout-nyaba",
    name: "Independence Layout Nyaba",
    riverName: "Nyaba River",
    lat: 6.4307,
    lng: 7.4991,
    thresholds: { watchCm: 60, warningCm: 75, dangerCm: 90, riseRateThresholdCmPerHour: 15 },
  },
  {
    id: "trans-ekulu-bridge",
    name: "Trans-Ekulu Bridge",
    riverName: "Ekulu River",
    lat: 6.4892,
    lng: 7.5458,
    thresholds: { watchCm: 60, warningCm: 75, dangerCm: 90, riseRateThresholdCmPerHour: 15 },
  },
  {
    id: "emene-industrial-drainage",
    name: "Emene Industrial Drainage",
    riverName: "Nyaba River",
    lat: 6.4714,
    lng: 7.6044,
    thresholds: { watchCm: 50, warningCm: 65, dangerCm: 80, riseRateThresholdCmPerHour: 12 },
  },
  {
    id: "nike-lake-road-culvert",
    name: "Nike Lake Road Culvert",
    riverName: "Nworie River",
    lat: 6.4931,
    lng: 7.5884,
    thresholds: { watchCm: 55, warningCm: 70, dangerCm: 85, riseRateThresholdCmPerHour: 15 },
  },
  {
    id: "uwaani-nyaba-crossing",
    name: "Uwani Nyaba Crossing",
    riverName: "Nyaba River",
    lat: 6.4189,
    lng: 7.4917,
    thresholds: { watchCm: 55, warningCm: 70, dangerCm: 85, riseRateThresholdCmPerHour: 15 },
  },
];

async function main() {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();
  const stationsRef = db.collection("stations");
  const existingSnapshot = await stationsRef.limit(1).get();
  const createdBy = process.env.SEED_CREATED_BY || existingSnapshot.docs[0]?.data().createdBy;

  if (!createdBy) {
    throw new Error("Could not determine createdBy. Set SEED_CREATED_BY to an admin UID.");
  }

  const batch = db.batch();
  const created = [];
  const skipped = [];

  for (const station of stations) {
    const ref = stationsRef.doc(station.id);
    const snapshot = await ref.get();
    if (snapshot.exists) {
      skipped.push(station.id);
      continue;
    }

    batch.set(ref, {
      name: station.name,
      riverName: station.riverName,
      location: { lat: station.lat, lng: station.lng },
      thresholds: station.thresholds,
      createdBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    created.push(station.id);
  }

  if (created.length) await batch.commit();
  console.log(`Created ${created.length} station(s). Skipped ${skipped.length} existing station(s).`);
  created.forEach((id) => console.log(`created: ${id}`));
  skipped.forEach((id) => console.log(`skipped: ${id}`));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => admin.app().delete().catch(() => {}));