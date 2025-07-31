// components/Canvas.tsx
"use client";

import React, { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { db } from "@/lib/firebase-client";
import { collection, onSnapshot } from "firebase/firestore";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { contractAddress, contractAbi } from "@/lib/contract";

// Palette Colors'ı burada da tanımlayalım ki index'i renge çevirebilelim
const paletteColors = [
  "#FF0000", "#00FF00", "#0000FF", "#FFFF00",
  "#FF00FF", "#00FFFF", "#000000", "#FFFFFF",
];

type CanvasProps = {
  selectedColor: string;
};

const GRID_SIZE = 100;

type Pixel = {
  color: string;
};

export default function Canvas({ selectedColor }: CanvasProps) {
  const { status } = useSession();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  
  const [grid, setGrid] = useState<Pixel[][]>(() =>
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill({ color: "#FFFFFF" }))
  );

  // Firestore'u anlık olarak dinlemeye devam ediyoruz
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "pixels"), (snapshot) => {
      setGrid((prevGrid) => {
        const newGrid = prevGrid.map(row => [...row]);
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            const { x, y, colorIndex } = change.doc.data();
            if (x < GRID_SIZE && y < GRID_SIZE && colorIndex < paletteColors.length) {
              newGrid[y][x] = { color: paletteColors[colorIndex] };
            }
          }
        });
        return newGrid;
      });
    });
    return () => unsubscribe();
  }, []);

  // Transaction'ın sonucunu izleyip toast göstermek için
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirming) {
      toast.loading("Transaction is being confirmed...");
    }
    if (isConfirmed) {
      toast.success("Pixel painted successfully!");
    }
    if (error) {
      toast.error(error.shortMessage || "An error occurred.");
    }
  }, [isConfirming, isConfirmed, error]);


  const handlePixelClick = async (row: number, col: number) => {
    if (status !== "authenticated") {
      toast.error("Please connect your wallet to paint a pixel.");
      return;
    }

    // Seçili rengin palet içindeki index'ini bul
    const colorIndex = paletteColors.findIndex(c => c === selectedColor);
    if (colorIndex === -1) {
      toast.error("Invalid color selected.");
      return;
    }

    // wagmi ile kontratın paint fonksiyonunu çağır
    writeContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "paint",
      args: [col, row, colorIndex],
      value: parseEther("0.05"), // 0.05 MONAD gönderiyoruz
    });
  };

  return (
    
    <div className="w-full h-full cursor-grab active:cursor-grabbing">
      <TransformWrapper limitToBounds={false} minScale={0.5} maxScale={30} initialScale={1}>
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              width: `${GRID_SIZE * 20}px`,
              height: `${GRID_SIZE * 20}px`,
              border: "2px solid #4a5568",
              backgroundColor: "#E2E8F0",
            }}
          >
            {grid.map((rowItems, rowIndex) =>
              rowItems.map((pixel, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="w-5 h-5 border-r border-b border-gray-300 hover:border-blue-500 hover:border-2"
                  style={{ backgroundColor: pixel.color }}
                  onClick={() => handlePixelClick(rowIndex, colIndex)}
                />
              ))
            )}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}