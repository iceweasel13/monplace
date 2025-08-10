"use client";

import React from "react";
import { clsx } from "clsx"; 
// Bileşenin alacağı proplar için type tanımı
type ColorPaletteProps = {
  selectedColor: string;
  setSelectedColor: (color: string) => void;
};

// Palet renklerimiz
const paletteColors = [
  "#3E3472", // Dark Monad
  "#6950F0", // Monad Purple
  "#A3D8F4", // Pastel Blue
  "#F6A5C0", // Pastel Pink
  "#FF3F33", // Pastel Red
  "#F9D57E", // Pastel Yellow
  "#AED9B6", // Pastel Green
  // "#FBFAF9", // Monad White
  "#1A1530", // Monad Black
];

export default function ColorPalette({
  selectedColor,
  setSelectedColor,
}: ColorPaletteProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {paletteColors.map((color) => (
        <button
          key={color}
          onClick={() => setSelectedColor(color)}
          className={clsx(
            "w-8 h-8 rounded-md border-2 transition-transform duration-150 ease-in-out",
            // Eğer bu renk seçili ise, çerçevesini belirgin yap ve biraz büyüt
            selectedColor === color
              ? "border-blue-500 scale-110"
              : "border-gray-400",
            // Beyaz renk için özel bir çerçeve rengi ki kaybolmasın
            color === "#FFFFFF" && selectedColor !== color && "border-gray-300"
          )}
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
}