/* eslint-disable no-unused-vars */
"use client";

import { createContext, useCallback, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocalStorage } from "usehooks-ts";

interface ChatContextType {
  initialMessage: string | null;
  setInitialMessage: (value: string | null) => void;
  shouldAutoSubmit: boolean;
  setShouldAutoSubmit: (value: boolean) => void;
  clearInitialState: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [initialMessage, setInitialMessage] = useLocalStorage<string | null>(
    "initialMessage",
    null
  );
  const [shouldAutoSubmit, setShouldAutoSubmit] = useLocalStorage<boolean>(
    "shouldAutoSubmit",
    false
  );
  const pathname = usePathname();

  const clearInitialState = useCallback(() => {
    setInitialMessage(null);
    setShouldAutoSubmit(false);
  }, [setInitialMessage, setShouldAutoSubmit]);

  // Reset context when navigating away from chat
  useEffect(() => {
    if (pathname === "/") {
      clearInitialState();
    }
  }, [pathname, clearInitialState]);

  return (
    <ChatContext.Provider
      value={{
        initialMessage,
        setInitialMessage,
        shouldAutoSubmit,
        setShouldAutoSubmit,
        clearInitialState,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
