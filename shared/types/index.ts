// 共有型定義（後で拡張）

export interface Project {
  id: number;
  name: string;
  clientName: string | null;
  color: string;
  icon: string | null;
  hourlyRate: number | null;
  budgetHours: number | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Entry {
  id: number;
  projectId: number | null;
  startTime: string;
  endTime: string | null;
  confidence: number;
  aiReasoning: string | null;
  subtask: string | null;
  isManual: boolean;
  isWork: boolean;
  createdAt: string;
  updatedAt: string;
}

