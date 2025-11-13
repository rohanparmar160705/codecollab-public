// src/modules/file/file.validation.ts
import { z } from "zod";

export const CreateFileSchema = z.object({
  name: z.string().min(1),
  content: z.string().optional(),
  path: z.string().optional(),
});

export const UpdateFileSchema = z.object({
  name: z.string().min(1).optional(),
  content: z.string().optional(),
  path: z.string().optional(),
});

export const CreateSnapshotSchema = z.object({
  code: z.string(),
  language: z.string(),
  description: z.string().optional(),
});
