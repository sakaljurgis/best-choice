import app from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/run-migrations.js';

const startServer = async () => {
  try {
    await runMigrations();

    const port = env.port;
    app.listen(port, () => {
      console.log(`API server ready on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

void startServer();
