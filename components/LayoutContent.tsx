"use client";

import { NavBar } from "@/components/ui/navbar";
import { Toaster } from "@/components/ui/toaster";

import { BrowserProvider } from "@/app/contexts/BrowserContext";
import { ChatProvider } from "@/app/contexts/ChatContext";
import { SettingsProvider } from "@/app/contexts/SettingsContext";

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
