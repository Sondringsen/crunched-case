"use client";

import { useState, useRef, useEffect } from "react";
import { useOffice } from "@/hooks/useOffice";
import type { ChatMessage, ChatResponse } from "@/types";

export default function TaskPane() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isReady, getContext, applyOperations } = useOffice();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const context = await getContext();

      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Request failed");
      }

      const data: ChatResponse = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);

      if (data.operations?.length > 0) {
        await applyOperations(data.operations);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.logo}>Crunched</span>
        <span style={styles.status}>
          {isReady ? (
            <span style={{ color: "#22c55e" }}>● Excel connected</span>
          ) : (
            <span style={{ color: "#f59e0b" }}>● Connecting...</span>
          )}
        </span>
      </div>

      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            Ask me anything about your spreadsheet, or tell me what to do.
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.bubble,
              ...(msg.role === "user" ? styles.userBubble : styles.assistantBubble),
            }}
          >
            <div style={styles.bubbleRole}>
              {msg.role === "user" ? "You" : "Crunched"}
            </div>
            <div style={styles.bubbleContent}>{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.bubble, ...styles.assistantBubble }}>
            <div style={styles.bubbleRole}>Crunched</div>
            <div style={styles.bubbleContent}>
              <span style={styles.dots}>
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </div>
          </div>
        )}
        {error && <div style={styles.error}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputArea}>
        <textarea
          style={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Crunched... (Enter to send)"
          rows={3}
          disabled={loading}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
          onClick={send}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    background: "#f8f9fa",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "#1a1a2e",
    color: "#fff",
    flexShrink: 0,
  },
  logo: {
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: "-0.5px",
  },
  status: {
    fontSize: 11,
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  empty: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 40,
    fontSize: 12,
    lineHeight: 1.6,
  },
  bubble: {
    padding: "8px 10px",
    borderRadius: 8,
    maxWidth: "100%",
    wordBreak: "break-word",
  },
  userBubble: {
    background: "#e0e7ff",
    alignSelf: "flex-end",
    marginLeft: 20,
  },
  assistantBubble: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    alignSelf: "flex-start",
    marginRight: 20,
  },
  bubbleRole: {
    fontWeight: 600,
    fontSize: 10,
    color: "#64748b",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  bubbleContent: {
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  error: {
    background: "#fee2e2",
    color: "#dc2626",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
  },
  dots: {
    display: "inline-flex",
    gap: 2,
  },
  inputArea: {
    borderTop: "1px solid #e2e8f0",
    padding: "8px 10px",
    display: "flex",
    gap: 6,
    background: "#fff",
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    resize: "none",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "6px 8px",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  },
  sendBtn: {
    background: "#1a1a2e",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "0 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    alignSelf: "flex-end",
    height: 32,
  },
};
