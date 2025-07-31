// app/api/paint/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import admin from "firebase-admin"; // <-- EKLENEN SATIR: Bu import hatayı çözecek

const COOLDOWN_MINUTES = 1;

export async function POST(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.walletAddress) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { x, y, color } = await request.json();
  const address = session.user.walletAddress;

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

    if (userData && userData.last_painted_at) {
      // Artık 'admin' tipi tanındığı için bu satır hata vermeyecektir.
      const lastPaintedDate = (userData.last_painted_at as admin.firestore.Timestamp).toDate();
      const cooldownEnd = lastPaintedDate.getTime() + COOLDOWN_MINUTES * 60 * 1000;

      if (Date.now() < cooldownEnd) {
        const remainingSeconds = Math.ceil((cooldownEnd - Date.now()) / 1000);
        return NextResponse.json(
          { error: `Please wait ${remainingSeconds} more seconds.` },
          { status: 429 }
        );
      }
    }

    const batch = adminDb.batch();
    batch.set(pixelRef, { x, y, color, updated_by: address });
    batch.set(userRef, { address, last_painted_at: FieldValue.serverTimestamp() }, { merge: true });
    await batch.commit();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error painting pixel:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}