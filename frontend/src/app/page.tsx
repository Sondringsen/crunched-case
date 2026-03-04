"use client";

import { useState, useRef, useEffect } from "react";
import { useOffice } from "@/hooks/useOffice";
import type {
  ChatMessage,
  ChatResponse,
  ConversationSummary,
  ConversationDetail,
} from "@/types";

export default function TaskPane() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const { isReady, getContext, applyOperations } = useOffice();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation list on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Close history dropdown when clicking outside
  useEffect(() => {
    if (!showHistory) return;
    const handler = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showHistory]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/v1/conversations");
      if (res.ok) {
        const data: ConversationSummary[] = await res.json();
        setConversations(data);
      }
    } catch {
      // silently ignore — history list is non-critical
    }
  };

  const loadConversation = async (id: string) => {
    setShowHistory(false);
    try {
      const res = await fetch(`/api/v1/conversations/${id}`);
      if (!res.ok) return;
      const data: ConversationDetail = await res.json();
      setMessages(data.messages);
      setConversationId(data.id);
    } catch {
      setError("Failed to load conversation");
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setShowHistory(false);
  };

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
        body: JSON.stringify({ message: text, context, conversation_id: conversationId }),
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
      setConversationId(data.conversation_id);

      if (data.operations?.length > 0) {
        await applyOperations(data.operations);
      }

      // Refresh conversation list to include new/updated conversation
      fetchConversations();
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
        <div style={styles.headerRight}>
          <span style={styles.status}>
            {isReady ? (
              <span style={{ color: "#22c55e" }}>● Excel connected</span>
            ) : (
              <span style={{ color: "#f59e0b" }}>● Connecting...</span>
            )}
          </span>
          <div style={{ position: "relative" }} ref={historyRef}>
            <button
              style={styles.iconBtn}
              onClick={() => setShowHistory((v) => !v)}
              title="Chat history"
            >
              ☰
            </button>
            {showHistory && (
              <div style={styles.historyDropdown}>
                <div style={styles.historyHeader}>History</div>
                {conversations.length === 0 ? (
                  <div style={styles.historyEmpty}>No conversations yet</div>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      style={{
                        ...styles.historyItem,
                        ...(c.id === conversationId ? styles.historyItemActive : {}),
                      }}
                      onClick={() => loadConversation(c.id)}
                    >
                      <div style={styles.historyTitle}>{c.title}</div>
                      <div style={styles.historyDate}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button style={styles.iconBtn} onClick={startNewChat} title="New chat">
            +
          </button>
        </div>
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
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  status: {
    fontSize: 11,
    marginRight: 4,
  },
  iconBtn: {
    background: "rgba(255,255,255,0.12)",
    border: "none",
    borderRadius: 4,
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  historyDropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    width: 240,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    zIndex: 100,
    maxHeight: 320,
    overflowY: "auto",
  },
  historyHeader: {
    padding: "8px 12px",
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color: "#64748b",
    borderBottom: "1px solid #e2e8f0",
  },
  historyEmpty: {
    padding: "12px",
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center" as const,
  },
  historyItem: {
    display: "block",
    width: "100%",
    textAlign: "left" as const,
    background: "none",
    border: "none",
    borderBottom: "1px solid #f1f5f9",
    padding: "8px 12px",
    cursor: "pointer",
    color: "#1e293b",
  },
  historyItemActive: {
    background: "#eff6ff",
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  historyDate: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
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
