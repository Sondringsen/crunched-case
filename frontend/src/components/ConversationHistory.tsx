import type { ConversationSummary } from "@/types";
import styles from "./ConversationHistory.module.css";

interface Props {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationHistory({ conversations, activeConversationId, onSelect }: Props) {
  return (
    <div className={styles.dropdown}>
      <div className={styles.header}>History</div>
      {conversations.length === 0 ? (
        <div className={styles.empty}>No conversations yet</div>
      ) : (
        conversations.map((c) => (
          <button
            key={c.id}
            className={`${styles.item} ${c.id === activeConversationId ? styles.itemActive : ""}`}
            onClick={() => onSelect(c.id)}
          >
            <div className={styles.itemTitle}>{c.title}</div>
            <div className={styles.itemDate}>
              {new Date(c.created_at).toLocaleDateString()}
            </div>
          </button>
        ))
      )}
    </div>
  );
}
