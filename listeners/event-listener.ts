// listeners/event-listener.ts

import "dotenv/config";
import { createPublicClient, http } from "viem";
// viem/chains içinde monad tanımı olmayabilir, bu yüzden custom chain olarak eklemek daha güvenli.
// hardhat.config.ts dosyanızdaki chainId'yi kullanın.
import { defineChain } from "viem";
import { contractAddress, contractAbi } from "../lib/contract";
import { adminDb } from "../lib/firebase-admin";

// Monad Testnet'i custom chain olarak tanımlayalım
const monadTestnet = defineChain({
  id: 8008135, // hardhat.config.ts dosyanızdaki chainId
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MONAD',
    symbol: 'MONAD',
  },
  rpcUrls: {
    default: {
      http: [process.env.MONAD_RPC_URL!],
    },
  },
});


if (!process.env.FIREBASE_PROJECT_ID || !process.env.MONAD_RPC_URL || !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
  console.error("HATA: Gerekli ortam değişkenleri eksik. .env.local dosyasını kontrol edin.");
  process.exit(1);
}

console.log("Listener başlatılıyor...");

const client = createPublicClient({
  chain: monadTestnet,
  transport: http(process.env.MONAD_RPC_URL),
});

async function main() {
  console.log(`Kontrat dinleniyor: ${contractAddress}`);

  // --- SAĞLIK KONTROLÜ BAŞLANGIÇ ---
  // Her 10 saniyede bir en son blok numarasını kontrol et
  setInterval(async () => {
    try {
      const blockNumber = await client.getBlockNumber();
      // BigInt'i string'e çevirirken 'n' karakterini kaldırıyoruz
      console.log(`[Sağlık Kontrolü] Bağlantı başarılı. En son blok: ${blockNumber.toString()}`);
    } catch (error) {
      console.error("[Sağlık Kontrolü] RPC bağlantı hatası:", error);
    }
  }, 10000); // 10 saniyede bir
  // --- SAĞLIK KONTROLÜ BİTİŞ ---


  client.watchContractEvent({
    address: contractAddress,
    abi: contractAbi,
    eventName: "PixelPainted",
    onLogs: (logs) => {
      // Olay yakalandığında çok belirgin bir log basalım
      console.log("----------- PIXEL OLAYI YAKALANDI! -----------");
      console.log(logs);
      console.log("---------------------------------------------");

      for (const log of logs) {
        const { x, y, colorIndex, paintedBy } = log.args;

        if (x === undefined || y === undefined || colorIndex === undefined) {
          console.error("Olay verisi eksik:", log.args);
          continue;
        }

        const pixelId = `${x}-${y}`;
        const pixelRef = adminDb.collection("pixels").doc(pixelId);

        pixelRef.set({ x, y, colorIndex, updated_by: paintedBy }).then(() => {
          console.log(`Firestore güncellendi: Piksel ${pixelId}`);
        }).catch(error => {
          console.error(`Firestore güncelleme hatası, piksel ${pixelId}:`, error);
        });
      }
    },
    // Polling interval'ı manuel olarak ayarlayarak daha sık kontrol sağlayabiliriz
    pollingInterval: 2000, // Her 2 saniyede bir yeni olayları kontrol et
  });

  console.log("... Olaylar bekleniyor ...");
}

main().catch((error) => {
  console.error("Listener başlatılamadı:", error);
  process.exit(1);
});