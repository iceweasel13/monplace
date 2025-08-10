// components/Canvas.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  TransformWrapper,
  TransformComponent,
  ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { db } from "@/lib/firebase-client";
import { collection, onSnapshot } from "firebase/firestore";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { contractAddress, contractAbi } from "@/lib/contract";
import Image from "next/image";

const paletteColors = [
  "#3E3472", // Dark Monad
  "#6950F0", // Monad Purple
  "#A3D8F4", // Pastel Blue
  "#F6A5C0", // Pastel Pink
  "#FF3F33", // Pastel Red
  "#F9D57E", // Pastel Yellow
  "#AED9B6", // Pastel Green
  "#FBFAF9", // Monad White
  "#1A1530", // Monad Black
];

type CanvasProps = {
  selectedColor: string;
};

const GRID_SIZE = 100;
const PIXEL_SIZE = 20; // px
type Pixel = { color: string };
type OptimisticUpdate = { row: number; col: number; originalColor: string } | null;

export default function Canvas({ selectedColor }: CanvasProps) {
  const { status } = useSession();
  const { data: hash, writeContract, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  const [grid, setGrid] = useState<Pixel[][] | null>(null);
  const [toastId, setToastId] = useState<string | number | undefined>(undefined);
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [optimisticUpdate, setOptimisticUpdate] = useState<OptimisticUpdate>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "pixels"), (snapshot) => {
      setGrid((prevGrid) => {
        const baseGrid = prevGrid
          ? prevGrid.map((row) => [...row])
          : Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill({ color: "#FBFAF9" }));
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            const { x, y, colorIndex } = change.doc.data();
            if (x < GRID_SIZE && y < GRID_SIZE && colorIndex < paletteColors.length) {
              baseGrid[y][x] = { color: paletteColors[colorIndex] };
            }
          }
        });
        return baseGrid;
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const error = writeError || confirmError;
    
    // İşlem cüzdanda reddedildiğinde veya bir hata olduğunda rengi geri al
    if (error && optimisticUpdate) {
        if (toastId) {
            toast.error( "Transaction failed.", { id: toastId });
        } else {
            // Eğer toast henüz oluşmadıysa (cüzdan direkt reddettiyse) yeni bir tane oluştur
            toast.error("Transaction failed.");
        }
      
        setGrid((prevGrid) => {
            if (!prevGrid) return null;
            const newGrid = prevGrid.map((row) => [...row]);
            newGrid[optimisticUpdate.row][optimisticUpdate.col] = { color: optimisticUpdate.originalColor };
            return newGrid;
        });

        setToastId(undefined);
        setOptimisticUpdate(null);
        reset();
        return;
    }
    
    // Başarılı işlem akışı
    if (isPending && !toastId) {
      const id = toast.loading("Waiting for approval in your wallet...");
      setToastId(id);
    } else if (hash && isConfirming && toastId) {
      toast.loading(
        <>
          <div>Transaction is confirming...</div>
          <a href={`https://testnet.monadexplorer.com/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline">
            View on Explorer
          </a>
        </>,
        { id: toastId }
      );
    } else if (isConfirmed && toastId) {
      toast.success("Transaction confirmed!", { id: toastId });
      setToastId(undefined);
      setOptimisticUpdate(null);
      reset();
    }
  }, [isPending, hash, isConfirming, isConfirmed, writeError, confirmError, toastId, optimisticUpdate, reset]);
  
  const handlePixelClick = (row: number, col: number) => {
    if (status !== "authenticated") {
      toast.error("Please connect your wallet to paint a pixel.");
      return;
    }
    if (isPending || isConfirming) {
        toast.info("Another transaction is already in progress.");
        return;
    }
    const colorIndex = paletteColors.findIndex((c) => c === selectedColor);
    if (colorIndex === -1) {
      toast.error("Invalid color selected.");
      return;
    }
    
    // 1. İYİMSER GÜNCELLEME: Tıklandığı anda rengi değiştir
    const originalColor = grid![row][col].color;
    setOptimisticUpdate({ row, col, originalColor });
    setGrid((prev) => {
      if (!prev) return prev;
      const newGrid = prev.map((r) => [...r]);
      newGrid[row][col] = { color: selectedColor };
      return newGrid;
    });

    writeContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "paint",
      args: [col, row, colorIndex],
      value: parseEther("0.05"),
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => setMouseDownPos({ x: e.clientX, y: e.clientY });
  const handleMouseUp = (e: React.MouseEvent, row: number, col: number) => {
    if (!mouseDownPos) return;
    const dx = Math.abs(e.clientX - mouseDownPos.x);
    const dy = Math.abs(e.clientY - mouseDownPos.y);
    if (dx < 5 && dy < 5) {
      handlePixelClick(row, col);
    }
    setMouseDownPos(null);
  };

  if (!grid) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-monad"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full cursor-grab active:cursor-grabbing">
      <TransformWrapper
        limitToBounds={false}
        minScale={0.5}
        maxScale={30}
        initialScale={1}
        // 2. GÜNCELLENMİŞ BAŞLANGIÇ POZİSYONU
        onInit={(ref: ReactZoomPanPinchRef) => {
          setTimeout(() => {
            const scale = 0.75; // Başlangıç zoom out seviyesi
            const canvasWidth = GRID_SIZE * PIXEL_SIZE * scale;
            const positionX = (window.innerWidth - canvasWidth) / 2;
            const positionY = 100; // Navbar'dan 100px boşluk
            ref.setTransform(positionX, positionY, scale, 100);
          }, 100);
        }}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              width: `${GRID_SIZE * PIXEL_SIZE}px`,
              height: `${GRID_SIZE * PIXEL_SIZE}px`,
              border: "2px solid #6950F0",
              backgroundColor: "#E2E8F0",
            }}
          >
            {grid.map((rowItems, rowIndex) =>
              rowItems.map((pixel, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="w-5 h-5 border-r border-b border-purple-200 hover:border-monad hover:border-2"
                  style={{ backgroundColor: pixel.color }}
                  onMouseDown={handleMouseDown}
                  onMouseUp={(e) => handleMouseUp(e, rowIndex, colIndex)}
                />
              ))
            )}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}