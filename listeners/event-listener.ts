// listeners/event-listener.ts
import "dotenv/config";
import { createPublicClient, http, webSocket } from "viem";
import { monadTestnet } from "viem/chains";
import { contractAddress, contractAbi } from "../lib/contract";
import { adminDb } from "../lib/firebase-admin";

// Gerekli ortam değişkenlerinin varlığını kontrol et
if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.MONAD_RPC_URL || // HTTP RPC her zaman zorunlu
  !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
) {
  console.error(
    "HATA: Gerekli ortam değişkenleri eksik. .env.local dosyasını kontrol edin."
  );
  process.exit(1);
}

// Ortam değişkenine göre WSS veya HTTP transport'u seç
const useWss = !!process.env.MONAD_WSS_RPC_URL;
const transport = useWss
  ? webSocket(process.env.MONAD_WSS_RPC_URL)
  : http(process.env.MONAD_RPC_URL);

console.log(
  `Listener başlatılıyor (${useWss ? "WebSocket" : "HTTP Polling"} modu)...`
);

const client = createPublicClient({
  chain: monadTestnet,
  transport: transport,
});

async function main() {
  console.log(`Akıllı kontrat dinleniyor: ${contractAddress}`);

  // Olay dinleyici
  client.watchContractEvent({
    address: contractAddress,
    abi: contractAbi,
    eventName: "PixelPainted",
    // WSS kullanmıyorsak, polling aralığını belirle
    pollingInterval: useWss ? undefined : 2000,
    onLogs: (logs) => {
      for (const log of logs) {
        const { x, y, colorIndex, paintedBy } = log.args;

        if (x === undefined || y === undefined || colorIndex === undefined) {
          console.error("[HATA] Gelen olay verisi eksik:", log.args);
          continue;
        }

        const pixelId = `${x}-${y}`;
        const pixelRef = adminDb.collection("pixels").doc(pixelId);
        
        pixelRef
          .set({ x, y, colorIndex, updated_by: paintedBy })
          .then(() => {
            console.log(`Firestore güncellendi: Piksel (${pixelId}) | Boyayan: ${paintedBy}`);
          })
          .catch((error) => {
            console.error(`[HATA] Firestore güncelleme hatası, piksel ${pixelId}:`, error);
          });
      }
    },
    onError: (error) => console.error("[HATA] Olay dinleyicide sorun oluştu:", error.message),
  });

  console.log("... Canlı olaylar bekleniyor ...");
}

main().catch((error) => {
  console.error("[KRİTİK HATA] Listener başlatılamadı:", error);
  process.exit(1);
});