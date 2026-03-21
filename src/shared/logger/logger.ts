import pino from "pino";

export function createLogger(nodeEnv: string) {
  return pino({
    level: nodeEnv === "production" ? "info" : "debug",
    transport:
      nodeEnv !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
