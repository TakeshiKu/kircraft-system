import "dotenv/config";
import { loadConfig } from "./shared/config/env.js";
import { createLogger } from "./shared/logger/logger.js";
import { buildApp } from "./app.js";

const config = loadConfig();
const log = createLogger(config.nodeEnv);
const { app, pool } = buildApp(config, log);

const close = async () => {
  await app.close();
  await pool.end();
};

process.on("SIGINT", async () => {
  await close();
  process.exit(0);
});

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
  log.info({ port: config.port }, "Kircraft API listening");
} catch (err) {
  log.error(err);
  await close();
  process.exit(1);
}
