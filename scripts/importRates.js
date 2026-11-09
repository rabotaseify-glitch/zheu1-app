const admin = require("firebase-admin");
const fs = require("fs");

// Скачайте serviceAccountKey.json из Firebase Console:
// Настройки проекта → Сервисные аккаунты → Создать новый закрытый ключ
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importRates() {
  const ratesData = JSON.parse(fs.readFileSync("../public/rates_db.json", "utf-8"));
  
  const batch = db.batch();
  ratesData.forEach((rate) => {
    const ref = db.collection("rates_belarus").doc();
    batch.set(ref, rate);
  });
  
  await batch.commit();
  console.log(`✅ Импортировано ${ratesData.length} расценок`);
}

importRates().catch(console.error);