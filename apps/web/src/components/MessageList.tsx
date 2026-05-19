import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check } from "lucide-react";
import type { Message } from "@/hooks/useChat";
import { StreamingIndicator } from "@/components/StreamingIndicator";
import { AssistantMessageActions, UserMessageActions } from "@/components/MessageActions";

interface Props {
  messages: Message[];
  onRegenerate?: (index: number) => void;
  onEdit?: (index: number, newText: string) => void;
}

export function MessageList({ messages, onRegenerate, onEdit }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new content arrives, unless user scrolled up
  useEffect(() => {
    if (!userScrolled) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, userScrolled]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setUserScrolled(!nearBottom);
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
        <p className="text-sm">Send a message to start the conversation.</p>
      </div>
    );
  }

  const lastAssistantIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant") return i;
    }
    return -1;
  })();

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-6"
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {messages.map((msg, i) => (
          <MessageItem
            key={i}
            message={msg}
            index={i}
            isLastAssistant={i === lastAssistantIndex}
            onRegenerate={onRegenerate}
            onEdit={onEdit}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

interface ItemProps {
  message: Message;
  index: number;
  isLastAssistant: boolean;
  onRegenerate?: (index: number) => void;
  onEdit?: (index: number, newText: string) => void;
}

function MessageItem({ message, index, isLastAssistant, onRegenerate, onEdit }: ItemProps) {
  const isUser = message.role === "user";
  const isStreaming = message.streaming;
  const isEmpty = !message.content && isStreaming;

  return (
    <div className={`flex group ${isUser ? "justify-end" : "justify-start"}`}>
      {isUser ? (
        <div className="flex flex-col items-end gap-1 max-w-[85%]">
          {/* Attached image */}
          {message.imageDataUrl && (
            <img
              src={message.imageDataUrl}
              alt="attached"
              className="max-h-48 w-auto rounded-xl object-cover"
            />
          )}
          <div
            className="px-4 py-2.5 rounded-2xl rounded-br-md text-sm whitespace-pre-wrap"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {message.content}
          </div>
          {/* Token info */}
          {message.tokenCount !== undefined && (
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              ↑ {message.tokenCount.toLocaleString()} tokens
            </span>
          )}
          {onEdit && (
            <UserMessageActions message={message} onEdit={(t) => onEdit(index, t)} />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-1 max-w-[90%] min-w-0">
          {/* Streaming empty state */}
          {isEmpty ? (
            <StreamingIndicator />
          ) : (
            <div className="text-sm min-w-0 w-full">
              <MarkdownContent content={message.content} streaming={isStreaming} />
              {isStreaming && <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse" style={{ background: "var(--text)" }} />}
            </div>
          )}
          {/* Token info */}
          {message.tokenCount !== undefined && (
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              ↓ {message.tokenCount.toLocaleString()} tokens
            </span>
          )}
          {!isStreaming && message.content && (
            <AssistantMessageActions
              message={message}
              onCopy={() => {}}
              onRegenerate={isLastAssistant && onRegenerate ? () => onRegenerate(index) : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MarkdownContent({ content, streaming }: { content: string; streaming?: boolean }) {
  if (streaming) {
    // While streaming, render plain text to avoid markdown parsing mid-stream
    return <span className="whitespace-pre-wrap" style={{ color: "var(--text)" }}>{content}</span>;
  }

  return (
    <div className="prose prose-sm max-w-none" style={{ color: "var(--text)" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match?.[1];
            const code = String(children).replace(/\n$/, "");
            const isBlock = code.includes("\n") || !!className;

            if (!isBlock) {
              return (
                <code
                  className={className}
                  style={{
                    background: "var(--bg-panel)",
                    padding: "0.1em 0.3em",
                    borderRadius: "4px",
                    fontSize: "0.85em",
                    color: "var(--text)",
                  }}
                  {...(props as React.HTMLAttributes<HTMLElement>)}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlock lang={lang} code={code} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ lang, code }: { lang?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative rounded-xl overflow-hidden my-2" style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
      {(lang || true) && (
        <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{lang ?? "code"}</span>
          <button
            className="flex items-center gap-1 text-[11px] transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
            onClick={copy}
          >
            {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3 text-xs leading-relaxed m-0" style={{ color: "var(--text)" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
