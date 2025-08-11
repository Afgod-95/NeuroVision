import express from 'express';
import cors from 'cors';
import { rateLimiter, validateApiKey } from './middlewares/validation';
import chatsRouter from './routes/chatsRouter';
import authRouter from './routes/authRouter';
import cron from 'node-cron'
import { cleanupExpiredTokens } from './middlewares/auth.middleware';


// Create an Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

/* 
  Middleware from auth to expired tokens and run it every midnight
*/
cron.schedule('0 0 * * *', async () => {
  console.log("Cleaning up expired tokens...")
  const success = await cleanupExpiredTokens();
  console.log(success ? 'Cleanup complete ✅' : 'Cleanup failed ❌');
})


app.use(express.static('public'));
app.use(express.static('src'));

//rate limiting 
app.use(rateLimiter(60000, 100))

//api key validation
app.use('/api/conversations/', validateApiKey);

app.use('/api/auth', authRouter);

app.use('/api/conversations', chatsRouter);

console.log(process.env.ACCESS_TOKEN_SECRET);




// Start server with proper error handling
const startServer = async () => {
  try {
    const PORT = process.env.PORT || 5000;
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = () => {
      console.log('\n👋 Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
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