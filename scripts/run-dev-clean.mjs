import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { resolve } from "node:path";

import nextEnv from "@next/env";

const projectRoot = process.cwd();
const { loadEnvConfig } = nextEnv;
const shouldLogToFile = process.env.LOG_TO_FILE === "1";
const logFile = shouldLogToFile
  ? createWriteStream(resolve(projectRoot, "app.log"), { flags: "w" })
  : null;

loadEnvConfig(projectRoot);

process.on("exit", () => {
  logFile?.end();
});

process.on("SIGINT", () => {
  logMessage("\nReceived SIGINT. Stopping dev:clean.\n");
  logFile?.end();
  process.exit(130);
});

process.on("SIGTERM", () => {
  logMessage("\nReceived SIGTERM. Stopping dev:clean.\n");
  logFile?.end();
  process.exit(143);
});

try {
  if (shouldLogToFile) {
    logMessage("LOG_TO_FILE=1 enabled. Writing combined output to app.log.\n");
  }

  await runCommand("docker", ["compose", "down", "-v", "--remove-orphans"]);
  await runCommand("pnpm", ["run", "db:up"]);
  await runCommand("pnpm", ["run", "db:migrate"]);
  await runCommand("pnpm", ["run", "dev"]);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  logMessage(`\n${message}\n`);
  process.exitCode = 1;
} finally {
  logFile?.end();
}

function runCommand(command, args) {
  return new Promise((resolveCommand, rejectCommand) => {
    logMessage(`\n$ ${[command, ...args].join(" ")}\n`);

    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });

    child.stdout.on("data", writeOutput);
    child.stderr.on("data", writeOutput);

    child.on("error", (error) => {
      rejectCommand(error);
    });

    child.on("close", (code, signal) => {
      if (signal) {
        rejectCommand(new Error(`${command} ${args.join(" ")} stopped by signal ${signal}.`));
        return;
      }

      if (code !== 0) {
        rejectCommand(new Error(`${command} ${args.join(" ")} exited with code ${code}.`));
        return;
      }

      resolveCommand();
    });
  });
}

function writeOutput(chunk) {
  process.stdout.write(chunk);
  logFile?.write(chunk);
}

function logMessage(message) {
  process.stdout.write(message);
  logFile?.write(message);
}
