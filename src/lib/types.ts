export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: Exclude<ChatRole, "system">;
  content: string;
};

export type KnowledgeState = {
  concepts: string[];
  misconceptions: string[];
  openQuestions: string[];
  confidence: Record<string, number>;
};

export type NoviceAgentResponse = {
  assistantMessage: string;
  codeDraft: string;
  knowledgeState: KnowledgeState;
};
