// app/api/paint/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/auth"; // auth.ts dosyanızın yolu
import { adminDb } from "@/lib/firebase"; // Firebase admin bağlantısı
import { FieldValue } from "firebase-admin/firestore";

const COOLDOWN_MINUTES = 1;

export async function POST(request: Request) {
  // 1. Kullanıcı oturumunu kontrol et
  const session = await getServerSession(authConfig);
  if (!session?.user?.walletAddress) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { x, y, color } = await request.json();
  const address = session.user.walletAddress;

  // 2. Gelen veriyi doğrula
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    !/^#[0-9A-F]{6}$/i.test(color)
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const userRef = adminDb.collection("users").doc(address);
  const pixelRef = adminDb.collection("pixels").doc(`${x}-${y}`);

  try {
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    // 3. Cooldown kontrolü yap
    if (userData && userData.last_painted_at) {
      const lastPaintedDate = (userData.last_painted_at as admin.firestore.Timestamp).toDate();
      const cooldownEnd = lastPaintedDate.getTime() + COOLDOWN_MINUTES * 60 * 1000;

      if (Date.now() < cooldownEnd) {
        const remainingSeconds = Math.ceil((cooldownEnd - Date.now()) / 1000);
        return NextResponse.json(
          { error: `Please wait ${remainingSeconds} more seconds.` },
          { status: 429 } // Too Many Requests
        );
      }
    }

    // 4. Veritabanı işlemlerini tek bir batch'te yap
    const batch = adminDb.batch();

    // Pikseli güncelle
    batch.set(pixelRef, { x, y, color, updated_by: address });

    // Kullanıcının son boyama zamanını güncelle
    batch.set(userRef, { address, last_painted_at: FieldValue.serverTimestamp() }, { merge: true });

    await batch.commit();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error painting pixel:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}