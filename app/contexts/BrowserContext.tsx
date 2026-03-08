/* eslint-disable no-console, no-unused-vars */
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import { useSettings } from "./SettingsContext";

// Define our Session type
interface Session {
  id: string;
  ws_url: string;
  debugUrl: string;
}

interface BrowserContextType {
  currentSession: Session | null;
  debugUrl: string | null;
  createSession: () => Promise<Session | null>;
  isCreatingSession: boolean;
  resetSession: () => Promise<void>;
  sessionTimeElapsed: number;
  isExpired: boolean;
  maxSessionDuration: number;
  setDebugUrl: (url: string | null) => void;
}

const MAX_SESSION_DURATION = 15 * 60; // 15 minutes in seconds

const BrowserContext = createContext<BrowserContextType | undefined>(undefined);

export function BrowserProvider({ children }: { children: React.ReactNode }) {
  console.info("🔄 Initializing BrowserProvider");
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionTimeElapsed, setSessionTimeElapsed] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const { currentSettings } = useSettings();

  // Timer effect
  useEffect(() => {
    console.info("⏱️ Timer effect triggered", { currentSession, isExpired });
    let intervalId: NodeJS.Timeout;

    if (currentSession && !isExpired) {
      console.info("⏰ Starting session timer");
      intervalId = setInterval(() => {
        setSessionTimeElapsed(prev => {
          const newTime = prev + 1;
          if (newTime >= MAX_SESSION_DURATION) {
            console.warn("⚠️ Session expired after reaching MAX_SESSION_DURATION");
            setIsExpired(true);
            clearInterval(intervalId);
            return MAX_SESSION_DURATION;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        console.info("🛑 Clearing session timer");
        clearInterval(intervalId);
      }
    };
  }, [currentSession, isExpired]);

  // Helper function to release a session
  const releaseSession = async (sessionId: string) => {
    console.info("🔓 Attempting to release session:", sessionId);
    try {
      await fetch(`/api/sessions/${sessionId}/release`, {
        method: "POST",
      });
      console.info("✅ Successfully released session:", sessionId);
    } catch (error) {
      console.error("❌ Failed to release session:", error);
    }
  };

  // Cleanup effect when page is closed/unloaded
  useEffect(() => {
    console.info("🧹 Setting up cleanup effect");
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentSession?.id) {
        console.info("🔄 BeforeUnload triggered - releasing session:", currentSession.id);
        navigator.sendBeacon(`/api/sessions/${currentSession.id}/release`);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      console.info("🧹 Cleaning up event listeners");
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (currentSession?.id) {
        console.info("🔓 Cleanup: releasing session:", currentSession.id);
        releaseSession(currentSession.id);
      }
    };
  }, [currentSession?.id]);

  async function createSession() {
    console.info("🚀 Attempting to create new session", { currentSettings });
    try {
      if (currentSettings) {
        setIsCreatingSession(true);
        console.info("⏳ Creating session with settings:", {
          agent_type: currentSettings.selectedAgent,
          timeout: MAX_SESSION_DURATION,
        });

        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agent_type: currentSettings.selectedAgent,
            timeout: MAX_SESSION_DURATION,
          }),
        });
        const session = await response.json();
        console.info("✅ Session created successfully:", session);
        setCurrentSession(session);
        setDebugUrl(session.debugUrl);
        setSessionTimeElapsed(0);
        setIsExpired(false);
        return session;
      }
    } catch (err) {
      console.error("❌ Failed to create session:", err);
      return null;
    } finally {
      setIsCreatingSession(false);
    }
  }

  const resetSession = async () => {
    console.info("🔄 Resetting session");
    if (currentSession?.id) {
      console.info("🔓 Releasing current session before reset:", currentSession.id);
      await releaseSession(currentSession.id);
    }

    setCurrentSession(null);
    setDebugUrl(null);
    setIsCreatingSession(false);
    setSessionTimeElapsed(0);
    setIsExpired(false);
    console.info("✅ Session reset complete");
  };

  return (
    <BrowserContext.Provider
      value={{
        currentSession,
        debugUrl,
        createSession,
        isCreatingSession,
        resetSession,
        sessionTimeElapsed,
        isExpired,
        maxSessionDuration: MAX_SESSION_DURATION,
        setDebugUrl,
      }}
    >
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowserContext() {
  const context = useContext(BrowserContext);
  if (context === undefined) {
    throw new Error("useBrowserContext must be used within a BrowserProvider");
  }
  return context;
}
