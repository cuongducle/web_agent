"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthModal } from "@/components/ui/AuthModal";
import { ChatInput } from "@/components/ui/ChatInput";

import { useToast } from "@/hooks/use-toast";

import { isLocalhost } from "@/lib/utils";

import { useChatContext } from "./contexts/ChatContext";
import { useSettings } from "./contexts/SettingsContext";
import { useBrowserContext } from "./contexts/BrowserContext";

export default function Home() {
  const router = useRouter();
  const { resetSession } = useBrowserContext();
  const { setInitialMessage, clearInitialState } = useChatContext();
  const { currentSettings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  // Store the pending query when waiting for API key
  const pendingQueryRef = useRef<string>("");

  // Clear all state on mount
  useEffect(() => {
    clearInitialState();
    resetSession();

    // Focus input after cleanup
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => clearTimeout(focusTimer);
  }, []); // Empty deps array means this runs once on mount

  const checkApiKey = () => {
    // const provider = currentSettings?.selectedProvider;
    // if (!provider) return false;
    // return !!currentSettings?.providerApiKeys?.[provider];

    // // For Ollama, we don't need an API key as it connects to a local instance
    // if (currentSettings?.selectedProvider === 'ollama') {
    //   return true;
    // }

    // // For other providers, check if API key exists
    // const provider = currentSettings?.selectedProvider;
    // if (!provider) return false;
    // const hasKey = !!currentSettings?.providerApiKeys?.[provider];
    // return hasKey;

    return true;
  };
  const handleApiKeySubmit = (key: string) => {
    const provider = currentSettings?.selectedProvider;
    if (!provider) return;
    // Update settings with new API key
    const currentKeys = currentSettings?.providerApiKeys || {};
    updateSettings({
      ...currentSettings!,
      providerApiKeys: {
        ...currentKeys,
        [provider]: key,
      },
    });
    setShowApiKeyModal(false);
    // Process the pending query
    if (pendingQueryRef.current) {
      proceedToChat(pendingQueryRef.current);
    }
  };
  const proceedToChat = (queryText: string) => {
    setInitialMessage(queryText);
    router.push(`/chat`);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    try {
      setLoading(true);
      resetSession();
      // Check if we have the API key or if Ollama is selected locally
      if (!checkApiKey()) {
        if (currentSettings?.selectedProvider === "ollama" && !isLocalhost()) {
          toast({
            title: "Cannot use Ollama",
            className:
              "text-[var(--gray-12)] border border-[var(--red-11)] bg-[var(--red-2)] text-sm",
            description:
              "Please select a different model provider or run the app locally to use Ollama.",
          });
        } else {
          pendingQueryRef.current = query;
          setShowApiKeyModal(true);
        }
        return;
      }
      proceedToChat(query);
    } catch (err) {
      console.error("Error creating session:", err);
      alert("Failed to create session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const starterButtons = [
    {
      icon: "/icons/pixel_square.svg",
      title: "Research & Analyze",
      text: "Compare prices and specs of MacBook Pro M3 across different retailers and find the best deal.",
      iconBgColor: "text-[--purple-9]",
    },
    {
      icon: "/icons/pixel_dollar.svg",
      title: "Track & Monitor",
      text: "Check if PlayStation 5 is in stock at major retailers and notify me of the lowest price.",
      iconBgColor: "text-[--green-9]",
    },
    {
      icon: "/icons/pixel_plane.svg",
      title: "Browse & Extract",
      text: "Find the top 10 highest-rated restaurants in New York City from Yelp and create a summary table.",
      iconBgColor: "text-[--blue-9]",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-[--gray-1] to-[--gray-2]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h1 className="font-instrument-serif text-5xl font-bold tracking-tight text-[--gray-12] sm:text-7xl">
            Web Surf Agent
          </h1>
          <div className="mt-8 flex flex-col items-center gap-6">
            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-[--gray-8] to-transparent"></div>
            <p className="max-w-2xl text-lg leading-8 text-[--gray-11]">
              Experience the future of web automation. Our AI agents surf and interact with websites just like humans do, powered by Chrome DevTools Protocol.
            </p>
          </div>
          
          {/* Main Input Section */}
          <div className="mt-12 w-full max-w-2xl">
            <div className="relative rounded-2xl bg-[--gray-1] p-1 shadow-lg ring-1 ring-[--gray-6]">
              <div className="absolute inset-0 bg-gradient-to-r from-[--blue-3] via-[--gray-3] to-[--purple-3] rounded-2xl blur-md opacity-50"></div>
              <div className="relative rounded-xl bg-[--gray-1] p-4">
                <ChatInput
                  ref={inputRef}
                  value={query}
                  onChange={value => setQuery(value)}
                  onSubmit={handleSubmit}
                  disabled={loading}
                  placeholder="What would you like the agent to do?"
                />
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {starterButtons.map((button, index) => (
              <Link
                key={index}
                href="#"
                onClick={e => {
                  e.preventDefault();
                  if (!loading) {
                    resetSession();
                    if (!checkApiKey()) {
                      if (currentSettings?.selectedProvider === "ollama" && !isLocalhost()) {
                        toast({
                          title: "Cannot use Ollama",
                          className: "text-[var(--gray-12)] border border-[var(--red-11)] bg-[var(--red-2)] text-sm",
                          description: "Please select a different model provider or run the app locally to use Ollama.",
                        });
                      } else {
                        pendingQueryRef.current = button.text;
                        setShowApiKeyModal(true);
                      }
                      return;
                    }
                    proceedToChat(button.text);
                  }
                }}
                className="group relative overflow-hidden rounded-2xl bg-[--gray-2] p-6 shadow-md transition-all hover:shadow-lg hover:scale-[1.02] hover:bg-[--gray-3]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[--gray-4] to-transparent opacity-0 group-hover:opacity-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[--gray-4]">
                      <Image
                        src={button.icon}
                        alt={`${button.title} icon`}
                        width={24}
                        height={24}
                        className={button.iconBgColor}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-[--gray-12]">{button.title}</h3>
                  </div>
                  <p className="mt-4 text-[--gray-11]">{button.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      <AuthModal
        provider={currentSettings?.selectedProvider || ""}
        isOpen={showApiKeyModal}
        onSubmit={handleApiKeySubmit}
      />
    </main>
  );
}
