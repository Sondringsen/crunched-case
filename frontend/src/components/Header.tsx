"use client";

import { useRef, useState, useEffect } from "react";
import type { ConversationSummary } from "@/types";
import { ConversationHistory } from "./ConversationHistory";
import styles from "./Header.module.css";

interface Props {
  isReady: boolean;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

export function Header({ isReady, conversations, activeConversationId, onSelectConversation, onNewChat }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (id: string) => {
    setShowHistory(false);
    onSelectConversation(id);
  };

  return (
    <header className={styles.header}>
      <span className={styles.logo}>Crunched</span>
      <div className={styles.headerRight}>
        <span className={styles.status}>
          {isReady ? (
            <span className={styles.connected}>● Excel connected</span>
          ) : (
            <span className={styles.connecting}>● Connecting...</span>
          )}
        </span>
        <div className={styles.historyWrapper} ref={historyRef}>
          <button
            className={styles.iconBtn}
            onClick={() => setShowHistory((v) => !v)}
            title="Chat history"
          >
            ☰
          </button>
          {showHistory && (
            <ConversationHistory
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelect={handleSelect}
            />
          )}
        </div>
        <button className={styles.iconBtn} onClick={onNewChat} title="New chat">
          +
        </button>
      </div>
    </header>
  );
}
