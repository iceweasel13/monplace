// components/Canvas.tsx
"use client";

import React, { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// Canvas'ın propları için type tanımı
type CanvasProps = {
  selectedColor: string;
};

// Grid'in boyutlarını belirliyoruz
const GRID_SIZE = 100;

// Her bir pikselin type'ı (şimdilik sadece renk bilgisi)
type Pixel = {
  color: string;
};

export default function Canvas({ selectedColor }: CanvasProps) {
  // 100x100'lük grid'in state'ini tutuyoruz.
  // Varsayılan olarak tüm pikselleri gri yapalım.
  const [grid, setGrid] = useState<Pixel[][]>(() =>
    Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill({ color: "#D3D3D3" }))
  );

  const handlePixelClick = (row: number, col: number) => {
    // Tıklanan pikselin rengini, seçili renk ile değiştir.
    const newGrid = grid.map((r, rowIndex) =>
      r.map((pixel, colIndex) => {
        if (rowIndex === row && colIndex === col) {
          return { ...pixel, color: selectedColor };
        }
        return pixel;
      })
    );
    setGrid(newGrid);
    console.log(`Pixel (${row}, ${col}) boyandı: ${selectedColor}`);
  };

  return (
    <div className="w-full h-full cursor-grab">
      <TransformWrapper
        limitToBounds={false}
        minScale={0.2}
        maxScale={15}
        initialScale={1}
        initialPositionX={0}
        initialPositionY={0}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{
            width: `${GRID_SIZE * 16}px`, // Piksellerin toplam genişliği
            height: `${GRID_SIZE * 16}px`, // Piksellerin toplam yüksekliği
          }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              width: `${GRID_SIZE * 16}px`,
              height: `${GRID_SIZE * 16}px`,
              border: "1px solid #444",
            }}
          >
            {grid.map((rowItems, rowIndex) =>
              rowItems.map((pixel, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="w-4 h-4 border-r border-b border-gray-400 hover:opacity-80"
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