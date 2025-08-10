// app/api/nonce/route.ts
import { NextResponse } from "next/server";
import { generateNonce } from "siwe";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const nonce = generateNonce();
    // Güvenli ve httpOnly bir cookie oluşturuyoruz
    (await cookies()).set("siwe-nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return NextResponse.json({ nonce: nonce });
  } catch (error: unknown) {
    return NextResponse.json(
      { message: (error as Error).message },
      { status: 500 }
    );
  }
}
