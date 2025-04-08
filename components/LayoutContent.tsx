"use client";

import { NavBar } from "@/components/ui/navbar";
import { Toaster } from "@/components/ui/toaster";

import { SettingsProvider } from "@/app/contexts/SettingsContext";
import { ChatProvider } from "@/app/contexts/ChatContext";
import { BrowserProvider } from "@/app/contexts/BrowserContext";

export function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <SettingsProvider>
        <BrowserProvider>
          <NavBar />
          <div className="bg-[--gray-1] pt-14">{children}</div>
          <Toaster />
        </BrowserProvider>
      </SettingsProvider>
    </ChatProvider>
  );
}
