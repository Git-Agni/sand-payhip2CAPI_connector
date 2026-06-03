import mongoose from 'mongoose';

import { logger } from './logging.service.js';

export const connectToDatabase = async (mongoDbUrl: string): Promise<void> => {
  await mongoose.connect(mongoDbUrl);

  logger.info('MongoDB connected', {
    databaseName: mongoose.connection.db?.databaseName,
  });
};
