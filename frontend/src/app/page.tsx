"use client";

import { useState, useRef, useEffect } from "react";
import { useOffice } from "@/hooks/useOffice";
import { api } from "@/services/api";
import type { ChatMessage, ChatResponse, ConversationSummary, ConversationDetail } from "@/types";
import { Header } from "@/components/Header";
import { MessageList } from "@/components/MessageList";
import { InputArea } from "@/components/InputArea";
import styles from "./page.module.css";

export default function TaskPane() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isReady, getContext, applyOperations } = useOffice();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const data = await api.get<ConversationSummary[]>("/conversations");
      setConversations(data);
    } catch {
      // silently ignore — history list is non-critical
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const data = await api.get<ConversationDetail>(`/conversations/${id}`);
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
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const context = await getContext();
      const data = await api.post<ChatResponse>("/chat", {
        message: text,
        context,
        conversation_id: conversationId,
      });

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setConversationId(data.conversation_id);

      if (data.operations?.length > 0) {
        await applyOperations(data.operations);
      }

      fetchConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Header
        isReady={isReady}
        conversations={conversations}
        activeConversationId={conversationId}
        onSelectConversation={loadConversation}
        onNewChat={startNewChat}
      />
      <MessageList
        messages={messages}
        loading={loading}
        error={error}
        bottomRef={bottomRef}
      />
      <InputArea value={input} onChange={setInput} onSend={send} loading={loading} />
    </div>
  );
}
