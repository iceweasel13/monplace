"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSession } from "next-auth/react";
import React from "react";

export default function Page() {
  const session = useSession();

  return (
    <>
      <ConnectButton />

      <div className="flex flex-col items-center justify-center h-screen">
        <p>{session.data?.accessToken}</p>
        <p>{session.data?.user.walletAddress}</p>
      </div>
    </>
  );
}