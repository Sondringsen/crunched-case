import type { ChatMessage } from "@/types";
import styles from "./MessageList.module.css";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  bottomRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({ messages, loading, error, bottomRef }: Props) {
  return (
    <div className={styles.messages}>
      {messages.length === 0 && (
        <div className={styles.empty}>
          Ask me anything about your spreadsheet, or tell me what to do.
        </div>
      )}
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.assistantBubble}`}
        >
          <div className={styles.bubbleRole}>{msg.role === "user" ? "You" : "Crunched"}</div>
          <div className={styles.bubbleContent}>{msg.content}</div>
        </div>
      ))}
      {loading && (
        <div className={`${styles.bubble} ${styles.assistantBubble}`}>
          <div className={styles.bubbleRole}>Crunched</div>
          <div className={styles.bubbleContent}>
            <span className={styles.dots}>
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}
      <div ref={bottomRef} />
    </div>
  );
}
