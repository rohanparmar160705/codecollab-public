// src/services/docker.service.ts
import { runInDocker } from "../utils/docker";
import Docker from "dockerode";
import { ENV } from "../config/env";
import { logger } from "../utils/logger";

export interface ExecutionResult {
  success: boolean;
  output: string;
  duration: number;
  memory?: number;
  error?: string | null;
  rawStdout?: string;
  rawStderr?: string;
}

export class DockerService {
  static async execute(
    language: string,
    code: string,
    input = ""
  ): Promise<ExecutionResult> {
    const start = Date.now();

    console.log("1. DockerService.execute() called with:", { language, inputLength: input?.length || 0 });

    try {
      console.log("2. Calling runInDocker()...");
      const result: any = await runInDocker(language, code, input);

      console.log("3. Raw result returned from runInDocker:", result);

      // Normalize possible shapes from runner: { stdout, stderr, output, error, duration, memory }
      const cands = [result.output, result.stdout, result.stdoutText, result.stderr];
      let combined = "";
      for (const v of cands) {
        if (typeof v === "string" && v.trim().length > 0) {
          combined = v;
          break;
        }
      }

      console.log("4. Combined output after normalization:", combined);

      const durationCalc = (typeof result.duration === "number" && result.duration > 0)
        ? result.duration
        : (typeof result.durationMs === "number" ? result.durationMs : (Date.now() - start));

      console.log("5. Computed duration (ms):", durationCalc);

      const finalResult: ExecutionResult = {
        success: result.success ?? true,
        output: combined,
        duration: durationCalc,
        memory: result.memory ?? 0,
        error: result.error || null,
        rawStdout: result.stdout ?? "",
        rawStderr: result.stderr ?? "",
      };

      console.log("6. Final normalized result object:", finalResult);

      return finalResult;
    } catch (err: any) {
      console.error("7. DockerService.execute() failed:", err);
      const failedResult: ExecutionResult = {
        success: false,
        output: "",
        duration: Date.now() - start,
        memory: 0,
        error: err.message || "Internal Docker error",
        rawStdout: "",
        rawStderr: err?.stderr ?? "",
      };
      console.log("8. Returning failed result:", failedResult);
      return failedResult;
    }
  }
}

export async function ensureCompilerImages() {
  console.log("9. Checking compiler images presence...");

  const required = [
    ENV.DOCKER_IMAGE_NODE,
    ENV.DOCKER_IMAGE_PYTHON,
    ENV.DOCKER_IMAGE_CPP,
    ENV.DOCKER_IMAGE_JAVA,
  ].filter(Boolean) as string[];

  console.log("10. Required compiler images:", required);

  const docker = new Docker();
  const images = await docker.listImages();
  const tags = new Set<string>();

  console.log("11. Found Docker images on system:", images.map(img => img.RepoTags).flat());

  for (const img of images) {
    for (const repoTag of img.RepoTags || []) tags.add(repoTag);
  }

  const missing = required.filter((t) => !tags.has(t));
  if (missing.length) {
    console.error("12. Missing compiler images:", missing);
    logger.error(`Missing required compiler images: ${missing.join(", ")}`);
    throw new Error(`Missing compiler images: ${missing.join(", ")}. Build them via scripts/build_compilers.*`);
  }

  logger.info("All compiler images present: " + required.join(", "));
  console.log("13. All compiler images verified successfully.");
}
