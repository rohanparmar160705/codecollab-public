// src/modules/collab/ot.service.ts
import redis from "../../config/redis";

interface Operation {
  userId: string;
  roomId: string;
  version: number;
  diff: string; // simple diff string, e.g. using text-diff or diff-match-patch
}

export class OTService {
  // Each room maintains a version number and latest code snapshot in Redis
  static async applyOperation(op: Operation): Promise<{ code: string; version: number }> {
    const roomKey = `room:${op.roomId}:doc`;

    const [storedCode, storedVersionRaw] = await redis.hmGet(roomKey, ["code", "version"]);
    const storedVersion = parseInt(storedVersionRaw || "0", 10);
    const baseCode = storedCode || "";

    // Reject if client version is older than current
    if (op.version < storedVersion) {
      const current = await redis.hGet(roomKey, "code");
      return { code: current || "", version: storedVersion };
    }

    // Naive patch application (you can later replace with a diff lib)
    const mergedCode = op.diff;

    // Save new state
    const newVersion = storedVersion + 1;
    await redis.hSet(roomKey, {
      code: mergedCode,
      version: newVersion.toString(),
    });

    return { code: mergedCode, version: newVersion };
  }

  static async getDocument(roomId: string) {
    const [code, version] = await redis.hmGet(`room:${roomId}:doc`, ["code", "version"]);
    return {
      code: code || "",
      version: parseInt(version || "0", 10),
    };
  }

  static async resetDocument(roomId: string) {
    await redis.del(`room:${roomId}:doc`);
  }
}
