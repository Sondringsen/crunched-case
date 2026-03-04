export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface WriteOperation {
  type: "write";
  sheet: string;
  range: string;
  values: (string | number | boolean | null)[][];
}

export interface AddSheetOperation {
  type: "add_sheet";
  name: string;
}

export interface AppendRowOperation {
  type: "append_row";
  sheet: string;
  values: (string | number | boolean | null)[];
}

export type Operation = WriteOperation | AddSheetOperation | AppendRowOperation;

export interface ChatResponse {
  reply: string;
  operations: Operation[];
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
