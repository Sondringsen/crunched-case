export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface WriteOperation {
  sheet: string;
  range: string;
  values: (string | number | boolean | null)[][];
}

export interface ChatResponse {
  reply: string;
  operations: WriteOperation[];
  conversation_id: string;
}

export interface SpreadsheetContext {
  sheets: string[];
  current_sheet: string;
  data: (string | number | boolean | null)[][];
  selection: string | null;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[];
}
