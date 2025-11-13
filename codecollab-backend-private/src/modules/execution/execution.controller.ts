// src/modules/execution/execution.controller.ts
import { Request, Response } from "express";
import { ExecutionService } from "./execution.service";
import { success, error } from "../../utils/response";
import { ExecutionCreateDTO } from "./execution.dtos";
import { AppError } from "../../utils/appError";

export const ExecutionController = {
  // ✅ Create new execution request
  async executeCode(req: Request, res: Response) {
    try {
      const { code, language, input, roomId }: ExecutionCreateDTO & { roomId?: string } = req.body;
      const userId = (req.user as any)?.id;

      if (!code || !language)
        return error(res, "Code and language are required", 400);
      if (!roomId) return error(res, "roomId is required", 400);

      const record = await ExecutionService.createExecution({
        userId,
        code,
        language,
        input: input || "",
        roomId,
      });

      return success(res, "Execution job queued", {
        jobId: record.jobId,
        executionId: record.id,
        status: record.status,
      });
    } catch (err: any) {
      console.error("Execution error:", err);
      if (err instanceof AppError) return error(res, err.message, err.statusCode);
      return error(res, err.message || "Execution failed", 500);
    }
  },

  // ✅ NEW: Fetch all executions for a user
  async list(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;
      const executions = await ExecutionService.fetchAll(userId);
      return success(res, "Execution history fetched", executions);
    } catch (err: any) {
      console.error("List executions error:", err);
      return error(res, "Failed to fetch executions", 500);
    }
  },

  // ✅ NEW: Fetch single execution by ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const exec = await ExecutionService.fetchById(id);
      if (!exec) return error(res, "Execution not found", 404);
      return success(res, "Execution fetched", exec);
    } catch (err: any) {
      console.error("Get execution error:", err);
      return error(res, "Failed to fetch execution", 500);
    }
  },
};
