import express from 'express';
import cors from 'cors';
import { rateLimiter, validateApiKey } from './middlewares/validation';
import chatsRouter from './routes/chatsRouter';
import authRouter from './routes/authRouter';
import cron from 'node-cron';
import { cleanupExpiredTokens } from './middlewares/auth.middleware';



// Create an Express app
const app = express();

// IMPORTANT: Order matters! Apply middleware in correct sequence
app.use(cors());

// JSON and URL-encoded parsing - INCREASED LIMITS for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ 
    limit: '50mb', 
    extended: true,
    parameterLimit: 50000 
}));

console.log('Loading environment...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Loaded ✅' : 'Missing ❌');



// Static files
app.use(express.static('public'));
app.use(express.static('src'));

// Rate limiting 
app.use(rateLimiter(60000, 100));

// API key validation - only for conversation routes
app.use('/api/conversations/', validateApiKey);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/conversations', chatsRouter);

/* 
  Cron job to cleanup expired tokens - runs every midnight
*/
cron.schedule('0 0 * * *', async () => {
  console.log("🧹 Cleaning up expired tokens...");
  const success = await cleanupExpiredTokens();
  console.log(success ? '✅ Cleanup complete' : '❌ Cleanup failed');
});

// Start server with proper error handling
const startServer = async () => {
  try {
    const PORT = process.env.PORT || 5000;
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📁 File uploads enabled on specific routes`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = () => {
      console.log('\n👋 Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export default app;