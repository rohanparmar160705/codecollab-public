// src/modules/execution/execution.dtos.ts

export interface ExecutionCreateDTO {
  code: string;
  language: "javascript" | "python" | "cpp" | "java";
  input?: string;
}

export interface ExecutionQueueJob {
  id: string;
  userId: string;
  code: string;
  language: string;
  input?: string;
}

export interface ExecutionResultDTO {
  id: string;
  userId: string;
  language: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  output?: string | null;
  errorMessage?: string | null;
  execTimeMs?: number;
  memoryUsedKb?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
