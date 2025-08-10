// components/Navbar.tsx
"use client";

import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import ColorPalette from "./ColorPalette";

// Navbar'ın alacağı proplar için type tanımı
type NavbarProps = {
  selectedColor: string;
  setSelectedColor: (color: string) => void;
};

export default function Navbar({
  selectedColor,
  setSelectedColor,
}: NavbarProps) {
  return (
    <header className="w-full p-4 bg-dark-monad  border-monad border-b-4">
      <div className="container mx-auto flex flex-wrap items-center justify-between">
        <div className="text-xl font-bold text-monad-white">MonPlace</div>
        <div className="w-full md:w-auto order-last md:order-none mt-4 md:mt-0">
          <ColorPalette
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
          />
        </div>
        <div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}