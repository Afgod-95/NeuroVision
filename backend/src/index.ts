import express from 'express';
import cors from 'cors';
import { rateLimiter, validateApiKey } from './middlewares/validation';
import router from './routes/authRouter';
import chatsRouter from './routes/chatsRouter';


// Create an Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static('public'));
app.use(express.static('src'));

//rate limiting 
app.use(rateLimiter(60000, 100))

//api key validation
app.use('/api/chats/', validateApiKey);

app.use(router);

app.use('/api/chats/', chatsRouter);






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