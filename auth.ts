import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { SiweMessage } from "siwe";
import { cookies } from "next/headers";

interface AuthUser {
  id: string;
  accessToken: string;
  walletAddress: string;
}

export const authConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        message: { label: "message", type: "string" },
        signature: { label: "signature", type: "string" },
      },
      authorize: async (
        credentials: Record<"message" | "signature", string> | undefined
      ): Promise<AuthUser | null> => {
        if (!credentials) {
          console.error("No credentials provided.");
          return null;
        }

        try {
          const siweMessage = new SiweMessage(credentials.message);
          
          // 1. Nonce'ı iron-session yerine doğrudan cookie'den oku
          const cookieStore = await cookies();
          const nonce = cookieStore.get("siwe-nonce")?.value;

          // 2. Nonce'ın eşleşip eşleşmediğini kontrol et
          if (nonce !== siweMessage.nonce) {
            throw new Error("Invalid nonce: Nonce mismatch detected.");
          }

          // 3. İmzayı doğrula
          const verificationResult = await siweMessage.verify({
            signature: credentials.signature,
            domain: siweMessage.domain,
            nonce: siweMessage.nonce,
          });

          if (verificationResult) {
            // 4. Başarılı doğrulamadan sonra nonce cookie'sini sil (tek kullanımlık olması için)
            cookieStore.delete("siwe-nonce");

            const user: AuthUser = {
              id: verificationResult.data.address,
              accessToken: "Ox1010", // Example token, replace with actual logic
              walletAddress: verificationResult.data.address,
            };
            return user;
          }

          return null;
        } catch (error) {
          if (error instanceof Error) {
            console.error("Login error:", error.message);
            throw new Error(error.message);
          } else {
            console.error("Login error:", error);
            throw new Error("An unknown error occurred.");
          }
        }
      },
    }),
  ],
  secret: process.env.SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken as string;
        token.walletAddress = user.walletAddress as string;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      if (session.user) {
          session.user.walletAddress = token.walletAddress as string;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  // events bloğu genellikle production'da loglama için kullanılır, isteğe bağlıdır.
  events: {}, 
};

// TypeScript tip tanımlamaları (Bunlar doğru ve gerekli)
declare module "next-auth" {
  interface User {
    accessToken: string;
    walletAddress: string;
  }

  interface Session {
    accessToken: string;
    user: {
      walletAddress: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    walletAddress: string;
  }
}
