import { createApp } from './app';
import http from 'http';
import { getSocketIO } from './websocket';

const PORT = process.env.PORT || 4000;

async function main() {
  const app = await createApp();
  const server = http.createServer(app);

  // Initialize Socket.IO
  getSocketIO(server);

  server.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`WebSocket server initialized`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    server.close(() => process.exit(0));
  });
}

main().catch(console.error);
