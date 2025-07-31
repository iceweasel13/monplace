// lib/firebase-admin.ts
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// Sadece admin SDK'sının henüz başlatılmadığını kontrol ederek başlatıyoruz.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // .env.local dosyasındaki \n'leri gerçek satır sonlarına çeviriyoruz.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminDb = getFirestore();

export { adminDb };