"use client";

import { useState } from "react";
import { Github, Menu, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import { useBrowserContext } from "@/app/contexts/BrowserContext";
import { useChatContext } from "@/app/contexts/ChatContext";

import { Button } from "./button";

export function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const { clearInitialState } = useChatContext();
  const { resetSession } = useBrowserContext();

  const handleNewChat = async () => {
    clearInitialState();
    resetSession();
    router.push("/");
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-50 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="font-instrument-serif text-xl font-semibold text-[--gray-12]">
                Web Surf Agent
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-4 md:flex">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2 rounded-full text-[--gray-11] hover:bg-[--gray-3] hover:text-[--gray-12]"
              onClick={handleNewChat}
            >
              <Plus className="size-4" />
              <span className="font-medium">New Chat</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-full border-[--gray-6] bg-[--gray-2] text-[--gray-11] hover:bg-[--gray-3] hover:text-[--gray-12]"
              asChild
            >
              <Link href="https://github.com/cuongducle/web_agent" target="_blank">
                <Github className="size-4" />
                <span className="font-medium">GitHub</span>
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="inline-flex size-10 items-center justify-center rounded-full bg-[--gray-2] text-[--gray-11] hover:bg-[--gray-3] hover:text-[--gray-12] md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "absolute inset-x-0 top-16 z-50 origin-top bg-[--gray-1] p-4 shadow-lg transition-all duration-200 ease-in-out md:hidden",
            isMenuOpen ? "scale-y-100 opacity-100" : "pointer-events-none scale-y-95 opacity-0"
          )}
        >
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 rounded-lg text-[--gray-11] hover:bg-[--gray-3] hover:text-[--gray-12]"
              onClick={() => {
                handleNewChat();
                setIsMenuOpen(false);
              }}
            >
              <Plus className="size-4" />
              <span className="font-medium">New Chat</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-2 rounded-lg text-[--gray-11] hover:bg-[--gray-3] hover:text-[--gray-12]"
              asChild
              onClick={() => setIsMenuOpen(false)}
            >
              <Link href="https://github.com/cuongducle/web_agent" target="_blank">
                <Github className="size-4" />
                <span className="font-medium">GitHub</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
