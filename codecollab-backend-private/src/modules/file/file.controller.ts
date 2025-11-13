// src/modules/file/file.controller.ts
import { Request, Response, NextFunction } from "express";
import { FileService } from "./file.service";
import { CreateFileSchema, UpdateFileSchema, CreateSnapshotSchema } from "./file.validation";
import * as perms from "./file.permission";
import { CreateFilePayload, UpdateFilePayload, CreateSnapshotPayload } from "./file.types";
import { success, error } from "../../utils/response";
import prisma from "../../config/prisma";

/**
 * Controller instanced with service (service may include io)
 * Methods use simple error handling and role checks.
 */
export class FileController {
  private service: FileService;

  constructor(service: FileService) {
    this.service = service;
  }

  // POST /rooms/:roomId/files
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params;
      const parse = CreateFileSchema.safeParse(req.body);
      if (!parse.success) return error(res, parse.error.message, 400);

      const userId = (req as any).user?.id;
      if (!userId) return error(res, "Unauthorized", 401);

      const canCreate = await perms.isEditorOrOwner(userId, roomId);
      if (!canCreate) return error(res, "Forbidden", 403);

      const payload = parse.data as CreateFilePayload;
      const file = await this.service.createFile(roomId, userId, payload);

      // Add activity log
      await prisma.userActivityLog.create({
        data: { userId, action: "file.create", meta: { fileId: file.id, roomId } },
      });

      return success(res, "File created", file, 201);
    } catch (err: any) {
      next(err);
    }
  }

  // GET /rooms/:roomId/files
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) return error(res, "Unauthorized", 401);

      const member = await perms.isRoomMember(userId, roomId);
      if (!member) return error(res, "Forbidden", 403);

      const files = await this.service.listFiles(roomId);
      return success(res, "Files fetched", files);
    } catch (err: any) {
      next(err);
    }
  }

  // GET /files/:id
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) return error(res, "Unauthorized", 401);

      const file = await this.service.getFileById(id);
      if (!file) return error(res, "File not found", 404);

      const member = await perms.isRoomMember(userId, file.roomId);
      if (!member) return error(res, "Forbidden", 403);

      return success(res, "File fetched", file);
    } catch (err: any) {
      next(err);
    }
  }

  // PUT /files/:id
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parse = UpdateFileSchema.safeParse(req.body);
      if (!parse.success) return error(res, parse.error.message, 400);

      const userId = (req as any).user?.id;
      if (!userId) return error(res, "Unauthorized", 401);

      const file = await this.service.getFileById(id);
      if (!file) return error(res, "File not found", 404);

      const canEdit = await perms.isEditorOrOwner(userId, file.roomId);
      if (!canEdit) return error(res, "Forbidden", 403);

      const updated = await this.service.updateFile(id, userId, parse.data as UpdateFilePayload);

      await prisma.userActivityLog.create({
        data: { userId, action: "file.update", meta: { fileId: id, roomId: file.roomId } },
      });

      return success(res, "File updated", updated);
    } catch (err: any) {
      next(err);
    }
  }

  // DELETE /files/:id
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) return error(res, "Unauthorized", 401);

      const file = await this.service.getFileById(id);
      if (!file) return error(res, "File not found", 404);

      const isOwner = await perms.isRoomOwner(userId, file.roomId);
      if (!isOwner) return error(res, "Forbidden - only room owner can delete files", 403);

      await this.service.deleteFile(id, userId);

      await prisma.userActivityLog.create({
        data: { userId, action: "file.delete", meta: { fileId: id, roomId: file.roomId } },
      });

      return success(res, "File deleted", null);
    } catch (err: any) {
      next(err);
    }
  }

  // POST /files/:id/snapshots
  async createSnapshot(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parse = CreateSnapshotSchema.safeParse(req.body);
      if (!parse.success) return error(res, parse.error.message, 400);

      const userId = (req as any).user?.id;
      if (!userId) return error(res, "Unauthorized", 401);

      const file = await this.service.getFileById(id);
      if (!file) return error(res, "File not found", 404);

      const member = await perms.isRoomMember(userId, file.roomId);
      if (!member) return error(res, "Forbidden", 403);

      const snapshot = await this.service.createSnapshot(
        id,
        userId,
        parse.data as CreateSnapshotPayload
      );

      await prisma.userActivityLog.create({
        data: { userId, action: "file.snapshot.create", meta: { fileId: id, roomId: file.roomId } },
      });

      return success(res, "Snapshot created", snapshot, 201);
    } catch (err: any) {
      next(err);
    }
  }

  // GET /files/:id/snapshots
  async listSnapshots(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) return error(res, "Unauthorized", 401);

      const file = await this.service.getFileById(id);
      if (!file) return error(res, "File not found", 404);

      const member = await perms.isRoomMember(userId, file.roomId);
      if (!member) return error(res, "Forbidden", 403);

      const snaps = await this.service.listSnapshots(id);
      return success(res, "Snapshots fetched", snaps);
    } catch (err: any) {
      next(err);
    }
  }
}
