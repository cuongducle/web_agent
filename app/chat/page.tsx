/* eslint-disable no-console, no-unused-vars, react-hooks/exhaustive-deps, tailwindcss/no-custom-classname, @next/next/no-img-element */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CheckIcon, Crosshair2Icon, ReaderIcon } from "@radix-ui/react-icons";
import { Message } from "ai";
import { useChat } from "ai/react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthModal } from "@/components/ui/AuthModal";
import { Browser } from "@/components/ui/Browser";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ui/ChatInput";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ToolInvocations } from "@/components/ui/tool";

import { useToast } from "@/hooks/use-toast";

import { useBrowserContext } from "@/app/contexts/BrowserContext";
import { useChatContext } from "@/app/contexts/ChatContext";
import { useSettings } from "@/app/contexts/SettingsContext";

// UPDATED CodeBlock component for rendering code blocks with a copy button and language display.
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  if (language) {
    return (
      <div className="my-4  overflow-hidden rounded">
        {/* Header bar displaying the language (if provided) and the copy button */}
        <div className="flex items-center justify-between bg-[--gray-1] px-3 py-1 text-xs text-[--gray-12]">
          <span>{language.toUpperCase()}</span>
          <button
            onClick={handleCopy}
            className="rounded border border-[--gray-3] bg-[--gray-1] px-2 py-1 text-xs transition-colors hover:bg-[--gray-2]"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <SyntaxHighlighter
          language={language}
          style={atomDark}
          customStyle={{ padding: "1rem", margin: 0, borderRadius: "0.5rem" }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }

  // Fallback if no language is provided: show the copy button as an overlay.
  return (
    <div className="group relative my-4">
      <SyntaxHighlighter
        language="text"
        style={atomDark}
        customStyle={{ padding: "1rem", borderRadius: "0.5rem" }}
      >
        {code}
      </SyntaxHighlighter>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 hidden rounded bg-gray-700 px-2 py-1 text-xs text-white group-hover:block"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// UPDATED MarkdownText component to support code blocks along with inline markdown
function MarkdownText({ content }: { content: string }) {
  // Helper function to process inline markdown (links, bold, italics)
  const parseInlineMarkdown = (text: string, keyOffset: number) => {
    const segments = text.split(/(\[.*?\]\(.*?\))|(\*.*?\*)|(_.*?_)/g).filter(Boolean);
    return segments.map((segment, index) => {
      const key = `${keyOffset}-${index}`;
      // Handle markdown links [text](url)
      if (/^\[.*?\]\(.*?\)$/.test(segment)) {
        const linkMatch = segment.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
          return (
            <a
              key={key}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[--blue-11] hover:underline"
            >
              {linkMatch[1]}
            </a>
          );
        }
      }
      // Handle bold text *text*
      if (/^\*.*\*$/.test(segment)) {
        const boldMatch = segment.match(/^\*(.*?)\*$/);
        if (boldMatch) {
          return <strong key={key}>{boldMatch[1]}</strong>;
        }
      }
      // Handle italics _text_
      if (/^_.*_$/.test(segment)) {
        const italicMatch = segment.match(/^_(.*?)_$/);
        if (italicMatch) {
          return <em key={key}>{italicMatch[1]}</em>;
        }
      }
      // Return plain text if no markdown matched
      return <span key={key}>{segment}</span>;
    });
  };

  // Main parser that first detects code blocks and falls back to inline markdown
  const parseContent = (text: string) => {
    const elements = [];
    let lastIndex = 0;
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Process any text before the code block as inline markdown
      if (match.index > lastIndex) {
        const inlineText = text.substring(lastIndex, match.index);
        elements.push(...parseInlineMarkdown(inlineText, key));
        key++;
      }
      // Extract language (if provided) and code content, then render the CodeBlock
      const language = match[1] || "";
      const codeContent = match[2];
      elements.push(<CodeBlock key={`code-${key}`} language={language} code={codeContent} />);
      key++;
      lastIndex = codeBlockRegex.lastIndex;
    }

    // Process any remaining text after the last code block
    if (lastIndex < text.length) {
      const inlineText = text.substring(lastIndex);
      elements.push(...parseInlineMarkdown(inlineText, key));
    }
    return elements;
  };

  const isMemory = content.startsWith("*Memory*:");
  const isGoal = content.startsWith("*Next Goal*:") || content.startsWith("*Previous Goal*:");

  if (isMemory || isGoal) {
    // Extract the title and content
    const titleMatch = content.match(/^\*(Memory|Next Goal|Previous Goal)\*:/);
    const title = titleMatch ? titleMatch[1] : ""; // Remove the asterisks and colon
    const strippedContent = content.replace(/^\*(Memory|Next Goal|Previous Goal)\*:/, "").trim();

    return (
      <div className="relative">
        {isMemory ? (
          <ReaderIcon className="absolute right-4 top-4 size-4 text-[--gray-11]" />
        ) : (
          <Crosshair2Icon className="absolute right-4 top-4 size-4 text-[--gray-11]" />
        )}
        <div className="rounded-2xl border border-[--gray-3] bg-[--gray-2] p-4">
          <div className="pr-8">
            <div className="mb-1 text-sm font-medium text-[--gray-12]">{title}</div>
            {strippedContent ? (
              <div className="text-sm text-[--gray-10]">{parseContent(strippedContent)}</div>
            ) : (
              <span className="text-sm text-[--gray-10]">Empty</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{parseContent(content)}</>;
}

interface UserMessageProps {
  content: string;
}

function UserMessage({ content }: UserMessageProps) {
  const hasLineBreaks = content.includes("\n");
  const longestLine = Math.max(...content.split("\n").map(line => line.length));
  const isLongMessage = longestLine > 60;

  return (
    <div className="flex w-full justify-end">
      <div
        className={`
          inline-flex w-fit max-w-[85%] p-3 font-geist
          ${isLongMessage || hasLineBreaks ? "rounded-3xl" : "rounded-full px-4"}
          shrink-0 bg-[--blue-9]
        `}
      >
        <div
          className={`
            w-full overflow-hidden whitespace-pre-wrap 
            break-words font-geist text-base
            font-normal leading-normal text-[--gray-12]
          `}
        >
          <MarkdownText content={content} />
        </div>
      </div>
    </div>
  );
}

/**
 * ChatScrollAnchor:
 * - Used with Intersection Observer to track visibility of the bottom of the chat.
 * - If isAtBottom and trackVisibility are both true, it automatically scrolls
 *   the chat area to bottom whenever the anchor is out of view (new messages).
 */
interface ChatScrollAnchorProps {
  trackVisibility: boolean;
  isAtBottom: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
}

function ChatScrollAnchor({ trackVisibility, isAtBottom, scrollAreaRef }: ChatScrollAnchorProps) {
  const { ref, inView } = useInView({
    trackVisibility,
    delay: 100,
  });

  useEffect(() => {
    if (isAtBottom && trackVisibility && !inView && scrollAreaRef.current?.children[0]) {
      const messagesContainer = scrollAreaRef.current.children[0];
      messagesContainer.scrollTop = messagesContainer.scrollHeight - messagesContainer.clientHeight;
    }
  }, [inView, isAtBottom, trackVisibility]);

  return <div ref={ref} className="h-px w-full" />;
}

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  result?: unknown;
}

interface Attachment {
  name?: string;
  contentType?: string;
  url: string;
}

export default function ChatPage() {
  console.info("🔄 Initializing ChatPage component");
  const router = useRouter();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { ref: scrollAnchorRef, inView } = useInView();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(false);
  const [hasShownConnection, setHasShownConnection] = useState(false);
  const { currentSession, setDebugUrl, isCreatingSession, isExpired, createSession } =
    useBrowserContext();
  const { currentSettings, updateSettings } = useSettings();
  const { initialMessage, setInitialMessage } = useChatContext();
  const { toast } = useToast();
  const pendingMessageRef = useRef<string>("");

  const handleImageClick = (imageSrc: string) => {
    setSelectedImage(imageSrc);
  };

  function handleScroll() {
    if (!scrollAreaRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setIsAtBottom(isAtBottom);
  }

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, reload, stop } =
    useChat({
      api: "/api/chat",
      id: currentSession?.id || undefined,
      maxSteps: 10,
      initialMessages: initialMessage
        ? [{ id: "1", role: "user", content: initialMessage }]
        : undefined,
      body: {
        session_id: currentSession?.id,
        agent_type: currentSettings?.selectedAgent,
        provider: currentSettings?.selectedProvider,
        api_key: currentSettings?.providerApiKeys?.[currentSettings?.selectedProvider || ""] || "",
        model_settings: {
          model_choice: currentSettings?.selectedModel,
          max_tokens: Number(currentSettings?.modelSettings.max_tokens),
          temperature: Number(currentSettings?.modelSettings.temperature),
          top_p: currentSettings?.modelSettings.top_p
            ? Number(currentSettings?.modelSettings.top_p)
            : undefined,
          top_k: currentSettings?.modelSettings.top_k
            ? Number(currentSettings?.modelSettings.top_k)
            : undefined,
          frequency_penalty: currentSettings?.modelSettings.frequency_penalty
            ? Number(currentSettings?.modelSettings.frequency_penalty)
            : undefined,
          presence_penalty: currentSettings?.modelSettings.presence_penalty
            ? Number(currentSettings?.modelSettings.presence_penalty)
            : undefined,
        },
        agent_settings: Object.fromEntries(
          Object.entries(currentSettings?.agentSettings ?? {})
            .filter(([_, value]) => value !== undefined && !isSettingConfig(value))
            .map(([key, value]) => [key, typeof value === "string" ? value : Number(value)])
        ),
      },
      onFinish: (message: Message) => {
        console.info("✅ Chat finished:", message);
      },
      onError: (error: Error) => {
        console.error("❌ Chat error:", error);
        toast({
          title: "Error",
          description: error?.message || "An unexpected error occurred",
          className:
            "text-[var(--gray-12)] border border-[var(--red-11)] bg-[var(--red-2)] text-sm",
        });
      },
      onToolCall: ({ toolCall }) => {
        console.info("🛠️ Tool call received:", toolCall);
      },
      onResponse: (response: Response) => {
        // Get debugUrl from response headers
        const debugUrl = response.headers.get("debug-url");
        if (debugUrl) {
          console.info("🔍 Debug URL received:", debugUrl);
          setDebugUrl(debugUrl);
        }
      },
    });

  // Parse debugUrl from message content if it starts with "*Debug URL*:"
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.content?.startsWith("*Debug URL*:")) {
        const debugUrl = lastMessage.content.split("\n")[1];
        console.info("🔍 Debug URL received from message:", debugUrl);
        setDebugUrl(debugUrl);
      }
    }
  }, [messages, setDebugUrl]);

  const checkApiKey = () => {
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
    console.info("🔑 Handling API key submission");
    const provider = currentSettings?.selectedProvider;
    if (!provider) return;

    console.info("⚙️ Updating settings with new API key for provider:", provider);
    const currentKeys = currentSettings?.providerApiKeys || {};
    updateSettings({
      ...currentSettings!,
      providerApiKeys: {
        ...currentKeys,
        [provider]: key,
      },
    });
    setShowApiKeyModal(false);

    if (pendingMessageRef.current) {
      console.info("📝 Setting initial message from pending ref:", pendingMessageRef.current);
      setInitialMessage(pendingMessageRef.current);
      pendingMessageRef.current = "";
    }
  };

  // Track message state changes
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.info("📥 New message received:", {
        id: lastMessage.id,
        role: lastMessage.role,
        content: lastMessage.content,
        toolInvocations: lastMessage.toolInvocations?.map((t: ToolInvocation) => ({
          name: t.toolName,
          args: t.args,
          state: t.state,
        })),
        totalMessages: messages.length,
        messageHistory: messages.map((m: Message) => ({
          id: m.id,
          role: m.role,
          hasContent: !!m.content,
          toolCallsCount: m.toolInvocations?.length || 0,
        })),
      });
    }
  }, [messages]);

  // Track loading and submission states
  useEffect(() => {
    console.info("🔄 Chat interaction state:", {
      isLoading,
      isSubmitting,
      hasInput: !!input,
      messagesCount: messages.length,
    });
  }, [isLoading, isSubmitting, input, messages.length]);

  // Enhanced handleSend with more logging
  async function handleSend(e: React.FormEvent, messageText: string, attachments: File[]) {
    console.info("📤 Handling message send:", {
      messageText,
      attachments,
      currentState: {
        hasSession: !!currentSession?.id,
        messagesCount: messages.length,
        isFirstMessage: messages.length === 0,
        isSubmitting,
        hasApiKey: checkApiKey(),
      },
    });

    e.preventDefault();

    if (!checkApiKey()) {
      console.info("🔑 No API key found, storing message and showing modal");
      pendingMessageRef.current = messageText;
      setShowApiKeyModal(true);
      return;
    }

    setIsSubmitting(true);
    if (messages.length === 0) {
      console.info("📝 Setting initial message with context:", {
        messageText,
        sessionId: currentSession?.id,
        provider: currentSettings?.selectedProvider,
        agent: currentSettings?.selectedAgent,
      });
      setInitialMessage(messageText);
      handleInputChange({ target: { value: "" } } as any);
    } else {
      console.info("📤 Submitting message to existing chat:", {
        messageText,
        sessionId: currentSession?.id,
        existingMessages: messages.length,
      });
      handleSubmit(e);
      return;
    }

    let session = currentSession;
    if (!session?.id) {
      console.info("🔄 Creating new session for message");
      session = await createSession();
      console.info("✅ New session created:", session);
    }
  }

  // Add new useEffect to handle initial message on mount
  useEffect(() => {
    async function handleInitialMessage() {
      if (initialMessage && !currentSession?.id && !isSubmitting) {
        setIsSubmitting(true);
        // Create new session
        await createSession();
      }
    }

    handleInitialMessage();
  }, [initialMessage, currentSession?.id, isSubmitting]);

  // Modify the useEffect that handles session creation
  useEffect(() => {
    const isNewSession = currentSession?.id && !hasShownConnection;
    if (isNewSession) {
      reload();
      setIsSubmitting(false);
      setInitialMessage(null);
      setHasShownConnection(true);
    }
  }, [currentSession?.id, hasShownConnection]);

  // Enhanced removeIncompleteToolCalls with more detailed logging
  function removeIncompleteToolCalls() {
    console.info("🧹 Starting cleanup of incomplete tool calls");
    console.info(
      "📊 Current messages state:",
      messages.map((m: Message) => ({
        id: m.id,
        role: m.role,
        toolCalls: m.toolInvocations?.map((t: ToolInvocation) => ({
          state: t.state,
        })),
      }))
    );

    setMessages((prev: Message[]) => {
      const updatedMessages = prev
        .map((msg: Message) => {
          if (msg.role === "assistant" && Array.isArray(msg.toolInvocations)) {
            const filteredToolInvocations = msg.toolInvocations.filter(
              (invocation: ToolInvocation) => invocation.state === "result"
            );
            console.info("🔍 Processing message tool calls:", {
              messageId: msg.id,
              before: msg.toolInvocations.length,
              after: filteredToolInvocations.length,
              removed: msg.toolInvocations.length - filteredToolInvocations.length,
              removedStates: msg.toolInvocations
                .filter((t: ToolInvocation) => t.state !== "result")
                .map((t: ToolInvocation) => ({ state: t.state })),
            });
            return {
              ...msg,
              toolInvocations: filteredToolInvocations,
            };
          }
          return msg;
        })
        .filter((msg: Message) => {
          if (
            msg.role === "assistant" &&
            !msg.content?.trim() &&
            (!msg.toolInvocations || msg.toolInvocations.length === 0)
          ) {
            console.info("🗑️ Removing empty assistant message");
            return false;
          }
          return true;
        });

      console.info("✅ Cleanup complete:", {
        beforeCount: prev.length,
        afterCount: updatedMessages.length,
        removedCount: prev.length - updatedMessages.length,
      });

      return updatedMessages;
    });
  }

  function handleStop() {
    console.info("🛑 Stopping chat");
    stop();
    removeIncompleteToolCalls();
  }

  // Helper function to check if a value is a setting config object
  function isSettingConfig(value: any): boolean {
    return value && typeof value === "object" && "type" in value && "default" in value;
  }

  // Reuse the same handler from NavBar for consistency
  const handleNewChat = async () => {
    console.info("🆕 Starting new chat");
    router.push("/");
  };

  // Add effect to handle session expiration
  useEffect(() => {
    console.info("⏰ Session expiration status changed:", { isExpired });
    if (isExpired) {
      console.info("⚠️ Session expired, cleaning up");
      stop();
      removeIncompleteToolCalls();
    }
  }, [isExpired]);

  return (
    <>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col-reverse md:flex-row">
        {/* Left (chat) - Fluid responsive width */}
        <div
          className="
          flex h-[40vh] 
          w-full flex-col border-t border-[--gray-3]
          md:h-full md:w-[clamp(280px,30vw,460px)]
          md:border-r md:border-t-0
        "
        >
          <div className="flex-1 overflow-hidden" ref={scrollAreaRef} onScroll={handleScroll}>
            <div
              className="scrollbar-gutter-stable scrollbar-thin flex size-full flex-col gap-4 overflow-y-auto overflow-x-hidden
                p-4
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:border-4
                [&::-webkit-scrollbar-thumb]:bg-[--gray-3]
                [&::-webkit-scrollbar-thumb]:transition-colors
                [&::-webkit-scrollbar-thumb]:hover:bg-[--gray-3]
                [&::-webkit-scrollbar-track]:rounded-full
                [&::-webkit-scrollbar-track]:bg-[--gray-1]
                [&::-webkit-scrollbar]:w-1.5"
            >
              {messages.map((message: Message, index: number) => {
                return (
                  <div key={message.id || index} className="flex w-full max-w-full flex-col gap-2">
                    {/* Force message content to respect container width */}
                    <div className="w-full max-w-full">
                      {message.role === "user" ? (
                        <>
                          <UserMessage content={message.content} />
                          {index === 0 && isCreatingSession && (
                            <div className="flex h-full flex-col items-center justify-center">
                              <div className="flex flex-col items-center justify-center space-y-4">
                                <div className="size-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
                                <div className="text-sm text-gray-500">
                                  Connecting to Browser Session...
                                </div>
                              </div>
                            </div>
                          )}
                          {index === 0 && currentSession?.id && (
                            <div className="mx-auto mt-2 flex w-[85%] items-center gap-2 rounded-md border border-[--green-3] bg-[--green-2] px-4 py-2 font-geist text-sm text-[--green-11]">
                              <CheckIcon className="size-4" />
                              Connected to Browser Session
                            </div>
                          )}
                        </>
                      ) : message.content ? (
                        <div className="w-full max-w-full whitespace-pre-wrap break-words">
                          <MarkdownText content={message.content} />
                        </div>
                      ) : null}
                    </div>
                    {message.toolInvocations?.map((tool: ToolInvocation, toolIndex: number) => (
                      <div key={toolIndex}>
                        <ToolInvocations toolInvocations={[tool]} onImageClick={handleImageClick} />
                      </div>
                    ))}
                    {message.experimental_attachments?.map(
                      (attachment: Attachment, idx: number) => (
                        <div
                          key={idx}
                          className="
                          mt-1
                          inline-flex
                          h-8 items-center
                          gap-2
                          rounded-full
                          border
                          border-[--gray-3]
                          bg-[--gray-2]
                          px-2
                        "
                        >
                          <span className="font-geist text-sm font-normal leading-[18px] text-[--gray-11]">
                            {attachment.name}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="size-4 animate-spin rounded-full border-2 border-[--gray-12] border-t-transparent" />
              )}

              {/* Simplified scroll anchor */}
              <ChatScrollAnchor
                scrollAreaRef={scrollAreaRef}
                isAtBottom={isAtBottom}
                trackVisibility={isLoading}
              />
            </div>
          </div>

          {/* Chat input or Expired State */}
          <div className="border-t border-[--gray-3]" />
          <div className="min-h-44 flex-none p-4 drop-shadow-md">
            {isExpired ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm font-medium text-[--gray-11]">
                  Your browser session has expired
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-[--gray-3] bg-[--gray-1] text-[--gray-11]"
                  onClick={handleNewChat}
                >
                  <Plus className="size-4" />
                  <span className="px-1 font-geist">New Chat</span>
                </Button>
              </div>
            ) : (
              <ChatInput
                value={input}
                onChange={(value: string) => handleInputChange({ target: { value } } as any)}
                onSubmit={handleSend}
                disabled={isLoading}
                isLoading={isLoading}
                onStop={handleStop}
              />
            )}
          </div>
        </div>

        {/* Right (browser) - Keep more prominent */}
        <div
          className="
          h-[60vh] 
          flex-1 border-b
          border-[--gray-3]
          md:h-full
          md:border-b-0
        "
        >
          <Browser />
        </div>
      </div>

      {/* Image preview dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>Image Preview</DialogTitle>
          {selectedImage && (
            <div className="relative aspect-video">
              <img
                src={selectedImage}
                alt="Preview"
                className="absolute inset-0 size-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* API key modal */}
      <AuthModal
        isOpen={showApiKeyModal}
        provider={currentSettings?.selectedProvider || ""}
        onSubmit={handleApiKeySubmit}
      />
    </>
  );
}
