// src/modules/file/file.types.ts
export interface CreateFilePayload {
  name: string;
  content?: string;
  path?: string;
}

export interface UpdateFilePayload {
  name?: string;
  content?: string;
  path?: string;
}

export interface CreateSnapshotPayload {
  code: string;
  language: string;
  description?: string;
}
