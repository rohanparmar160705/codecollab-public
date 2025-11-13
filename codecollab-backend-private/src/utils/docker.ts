// src/utils/docker.ts
import { exec } from "child_process";
import { promisify } from "util";
import { ENV } from "../config/env";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export interface DockerResult {
  success: boolean;
  output?: string;
  stdout?: string;
  stderr?: string;
  error?: string;
  durationMs?: number;
  exitCode?: number;
}

function toDockerPath(localPath: string): string {
  // 1. Convert Windows paths like C:\... → /mnt/c/...
  if (process.platform === "win32") {
    const match = localPath.match(/^([A-Za-z]):\\(.*)$/);
    if (match) {
      const drive = match[1].toLowerCase();
      const rest = match[2].replace(/\\/g, "/");
      return `/mnt/${drive}/${rest}`;
    }
  }
  return localPath;
}

export async function runInDocker(language: string, code: string, input = ""): Promise<DockerResult> {
  const id = Date.now();
  console.log("1. [runInDocker] Start execution", { language, id });

  const fileMap: Record<string, string> = {
    javascript: "main.js",
    python: "main.py",
    cpp: "main.cpp",
    java: "Main.java",
  };

  const filename = fileMap[language];
  if (!filename) throw new Error(`Unsupported language: ${language}`);

  console.log(`2. [runInDocker] Code size=${code.length}, input size=${input.length}`);

  const imageMap: Record<string, string> = {
    javascript: ENV.DOCKER_IMAGE_NODE,
    python: ENV.DOCKER_IMAGE_PYTHON,
    cpp: ENV.DOCKER_IMAGE_CPP,
    java: ENV.DOCKER_IMAGE_JAVA,
  };

  const cmdMap: Record<string, string> = {
    javascript: `node /app/${filename}`,
    python: `python3 /app/${filename}`,
    cpp: `g++ /app/${filename} -o /app/a.out && /app/a.out`,
    java: `javac /app/${filename} && java -cp /app Main`,
  };


  const image = imageMap[language];
  const command = cmdMap[language];
  const timeoutMs = Number(ENV.EXECUTION_TIMEOUT) || 5000;

  console.log("6. [runInDocker] Preparing docker command...");
  // Inject code & input via env vars to avoid host-path mounts and quoting issues
  const CODE_B64 = Buffer.from(code, "utf-8").toString("base64");
  const INPUT_B64 = input ? Buffer.from(input, "utf-8").toString("base64") : "";

  // Build an in-container script safely. Use env vars for large payloads and decode inside.
  const scriptMap: Record<string, string> = {
    javascript: `mkdir -p /app && echo "$CODE_B64" | base64 -d > /app/${filename} && echo "$INPUT_B64" | base64 -d > /app/input.txt && node /app/${filename} < /app/input.txt`,
    python: `mkdir -p /app && echo "$CODE_B64" | base64 -d > /app/${filename} && echo "$INPUT_B64" | base64 -d > /app/input.txt && python3 /app/${filename} < /app/input.txt`,
    cpp: `mkdir -p /app && echo "$CODE_B64" | base64 -d > /app/${filename} && echo "$INPUT_B64" | base64 -d > /app/input.txt && g++ /app/${filename} -o /app/a.out && /app/a.out < /app/input.txt`,
    java: `mkdir -p /app && echo "$CODE_B64" | base64 -d > /app/${filename} && echo "$INPUT_B64" | base64 -d > /app/input.txt && javac /app/${filename} && java -cp /app Main < /app/input.txt`,
  };

  const script = scriptMap[language];
  if (!script) throw new Error(`Unsupported language: ${language}`);

  const dockerCmd = [
    "docker run --rm",
    "--network=none --cpus=0.5 -m 256m",
    "--entrypoint \"\"",
    `-e CODE_B64="${CODE_B64}"`,
    `-e INPUT_B64="${INPUT_B64}"`,
    image,
    "sh -lc",
    `"${script}"`,
  ].join(" ");

  console.log("7. [runInDocker] Executing docker command:\n", dockerCmd);
  const start = Date.now();

  try {
    const { stdout, stderr } = await execAsync(dockerCmd, { timeout: timeoutMs });
    const duration = Date.now() - start;
    console.log("8. [runInDocker] Docker finished", {
      stdoutPreview: (stdout ?? "").slice(0, 150),
      stderrPreview: (stderr ?? "").slice(0, 150),
    });

    const trimmedStdout = (stdout ?? "").trim();
    const trimmedStderr = (stderr ?? "").trim();
    const output = trimmedStdout || trimmedStderr;

    if (!output.length) {
      console.warn("9. [runInDocker] Warning: Empty output from container", { trimmedStdout, trimmedStderr });
    }

    return {
      success: true,
      stdout: trimmedStdout,
      stderr: trimmedStderr,
      output,
      durationMs: duration,
      exitCode: 0,
    };
  } catch (err: any) {
    const duration = Date.now() - start;
    console.error("10. [runInDocker] Error during execution", {
      message: err?.message,
      stdoutPreview: (err?.stdout ?? "").slice(0, 150),
      stderrPreview: (err?.stderr ?? "").slice(0, 150),
    });
    return {
      success: false,
      error: err?.stderr?.trim?.() || err?.message,
      stdout: err?.stdout ?? "",
      stderr: err?.stderr ?? "",
      durationMs: duration,
      exitCode: err?.code ?? -1,
    };
  } finally {
    // no temp dirs created with env injection
  }
}
