/* eslint-disable @typescript-eslint/no-explicit-any */
// components/Canvas.tsx
"use client";

import React, { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useSession } from "next-auth/react";
import { toast } from "sonner"; // DEĞİŞİKLİK: sonner'dan toast importu
import { db } from "@/lib/firebase-client";
import { collection, onSnapshot } from "firebase/firestore";

type CanvasProps = {
  selectedColor: string;
};

const GRID_SIZE = 100;
const COOLDOWN_SECONDS = 60;

type Pixel = {
  color: string;
};

export default function Canvas({ selectedColor }: CanvasProps) {
  const { status } = useSession();
  // DEĞİŞİKLİK: useToast hook'unu kaldırdık
  const [lastPaintTimestamp, setLastPaintTimestamp] = useState(0);

  const [grid, setGrid] = useState<Pixel[][]>(() =>
    Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill({ color: "#FFFFFF" }))
  );

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "pixels"), (snapshot) => {
      setGrid((prevGrid) => {
        const newGrid = prevGrid.map(row => [...row]);
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            const { x, y, color } = change.doc.data();
            if (x < GRID_SIZE && y < GRID_SIZE) {
              newGrid[y][x] = { color };
            }
          }
        });
        return newGrid;
      });
    });
    return () => unsubscribe();
  }, []);

  const handlePixelClick = async (row: number, col: number) => {
    if (status !== "authenticated") {
      // DEĞİŞİKLİK: Yeni toast kullanımı
      toast.error("Please connect your wallet to paint a pixel.");
      return;
    }

    const now = Date.now();
    const timeSinceLastPaint = (now - lastPaintTimestamp) / 1000;
    if (timeSinceLastPaint < COOLDOWN_SECONDS) {
      const remainingSeconds = Math.ceil(COOLDOWN_SECONDS - timeSinceLastPaint);
      // DEĞİŞİKLİK: Yeni toast kullanımı
      toast.warning(`Please wait ${remainingSeconds} more seconds before painting again.`);
      return;
    }

    try {
      const response = await fetch("/api/paint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: col, y: row, color: selectedColor }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to paint pixel.");
      }

      setLastPaintTimestamp(Date.now());
      // DEĞİŞİKLİK: Yeni toast kullanımı (başarı mesajı)
      toast.success(`Pixel at (${col}, ${row}) has been painted.`);
    } catch (error: any) {
      console.error(error);
      // DEĞİŞİKLİK: Yeni toast kullanımı (hata mesajı)
      toast.error(error.message);
    }
  };

  return (
    <div className="w-full h-full cursor-grab active:cursor-grabbing">
      <TransformWrapper
        limitToBounds={false}
        minScale={0.5}
        maxScale={30}
        initialScale={1}
      >
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