/* "use client";
import Navbar from "@/components/Navbar";

import { useSession } from "next-auth/react";
import React from "react";

export default function Page() {
  const session = useSession();

  return (
     <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-screen">
        {/* <p>{session.data?.accessToken}</p>
        <p>{session.data?.user.walletAddress}</p> 
      </div>
    </div>
  );
} */

  // app/page.tsx
"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Canvas from "@/components/Canvas"; 

export default function Page() {
  // Seçili rengin state'ini artık ana sayfada tutuyoruz.
  const [selectedColor, setSelectedColor] = useState<string>("#000000");

  return (
    <div className="flex flex-col h-screen bg-dark-monad">
      <Navbar
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
      />
      <main className="flex-grow flex items-center justify-center overflow-hidden">
        {/* Canvas alanı buraya gelecek */}
        <Canvas selectedColor={selectedColor} />
      </main>
    </div>
  );
}