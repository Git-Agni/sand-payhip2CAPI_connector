import mongoose from 'mongoose';

import { logger } from './logging.service.js';

let connectionPromise: Promise<void> | null = null;

export const connectToDatabase = async (mongoDbUrl: string): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(mongoDbUrl, {
        serverSelectionTimeoutMS: 5_000,
      })
      .then(() => {
        logger.info('MongoDB connected', {
          databaseName: mongoose.connection.db?.databaseName,
        });
      })
      .catch((error: unknown) => {
        connectionPromise = null;
        throw error;
      });
  }

  await connectionPromise;
};
