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

// Pastel palette with dark purple and purple at the start
const paletteColors = [
  "#3E3472", // Dark Monad
  "#6950F0", // Monad Purple
  "#A3D8F4", // Pastel Blue
  "#F6A5C0", // Pastel Pink
  "#F9D57E", // Pastel Yellow
  "#AED9B6", // Pastel Green
  "#FBFAF9", // Monad White
  "#1A1530", // Monad Black
];

type CanvasProps = {
  selectedColor: string;
};

const GRID_SIZE = 100;
const PIXEL_SIZE = 20; // px size per cell

type Pixel = {
  color: string;
};

export default function Canvas({ selectedColor }: CanvasProps) {
  const { status } = useSession();
  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } =
    useWaitForTransactionReceipt({ hash });

  const [grid, setGrid] = useState<Pixel[][] | null>(null); // null = loading state
  const [toastId, setToastId] = useState<string | number | undefined>(undefined);
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);

  // Firestore listener
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "pixels"), (snapshot) => {
      setGrid((prevGrid) => {
        const baseGrid =
          prevGrid && prevGrid.length
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

  // Transaction toast handling
  useEffect(() => {
    if (isPending && hash && !toastId) {
      const id = toast.loading(
        <>
          <div>Transaction sent</div>
          <div className="text-xs text-gray-400">
            <a
              href={`https://monadscan.io/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View on Explorer
            </a>
          </div>
        </>
      );
      setToastId(id);
    } else if (isConfirming && toastId) {
      toast.loading("Awaiting confirmation...", { id: toastId });
    } else if (isConfirmed && toastId) {
      toast.success("Transaction confirmed ✅", { id: toastId });
      setToastId(undefined);
    } else if ((writeError || confirmError) && toastId) {
      toast.error(writeError?.message || confirmError?.message || "Transaction failed", {
        id: toastId,
      });
      setToastId(undefined);
    }
  }, [isPending, hash, isConfirming, isConfirmed, writeError, confirmError, toastId]);

  // Paint pixel (optimistic UI)
  const handlePixelClick = async (row: number, col: number) => {
    if (status !== "authenticated") {
      toast.error("Please connect your wallet to paint a pixel.");
      return;
    }

    const colorIndex = paletteColors.findIndex((c) => c === selectedColor);
    if (colorIndex === -1) {
      toast.error("Invalid color selected.");
      return;
    }

    // Optimistic update
    setGrid((prev) => {
      if (!prev) return prev;
      const newGrid = prev.map((r) => [...r]);
      newGrid[row][col] = { color: selectedColor };
      return newGrid;
    });

    // Send TX
    writeContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "paint",
      args: [col, row, colorIndex],
      value: parseEther("0.05"),
    });
  };

  // Drag vs Click detection
  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseDownPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = (e: React.MouseEvent, row: number, col: number) => {
    if (!mouseDownPos) return;
    const dx = Math.abs(e.clientX - mouseDownPos.x);
    const dy = Math.abs(e.clientY - mouseDownPos.y);
    if (dx < 5 && dy < 5) {
      handlePixelClick(row, col);
    }
    setMouseDownPos(null);
  };

  // Loading animation
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
        onInit={(utils) => {
          const gridPixelSize = GRID_SIZE * PIXEL_SIZE;
          const offsetX = (window.innerWidth - gridPixelSize) / 2;
          const offsetY = (window.innerHeight - gridPixelSize) / 2;
          utils.setTransform(offsetX, offsetY, 1);
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
                  className="w-5 h-5 border-r border-b border-gray-300 hover:border-monad hover:border-2"
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
