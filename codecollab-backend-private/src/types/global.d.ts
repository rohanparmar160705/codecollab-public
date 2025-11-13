// src/types/global.d.ts
export type LanguageType = "cpp" | "python" | "javascript" | "java";

export interface ExecutionJob {
  id: string;
  code: string;
  language: LanguageType;
  input?: string;
  userId?: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}
