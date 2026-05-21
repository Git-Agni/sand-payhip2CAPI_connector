import { app } from "./app.js";
import { config } from "./config/env.js";
import { logger } from "./services/logging.service.js";

app.listen(config.port, () => {
  logger.info("Payhip CAPI webhook listener started", { port: config.port });
});
