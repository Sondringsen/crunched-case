import styles from "./InputArea.module.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  loading: boolean;
}

export function InputArea({ value, onChange, onSend, loading }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={styles.inputArea}>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Crunched... (Enter to send)"
        rows={3}
        disabled={loading}
      />
      <button
        className={styles.sendBtn}
        onClick={onSend}
        disabled={loading || !value.trim()}
      >
        Send
      </button>
    </div>
  );
}
