import { app } from './app.js';
import { config } from './config/env.js';
import { connectToDatabase } from './services/database.service.js';
import { logger } from './services/logging.service.js';

const startServer = async (): Promise<void> => {
  try {
    await connectToDatabase(config.mongoDbUrl);

    app.listen(config.port, () => {
      logger.info('Payhip CAPI webhook listener started', {
        port: config.port,
      });
    });
  } catch (error) {
    logger.error('Failed to start Payhip CAPI webhook listener', error);
    process.exit(1);
  }
};

void startServer();
