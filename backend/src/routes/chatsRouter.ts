import express, { Request, Response } from 'express';
import { generateCompletion, getModels, healthCheck, sendChatMessage, sendStreamingMessage, testDatabase } from '../controller/chats/chats';
import { transcribeAudio } from '../controller/assembly_ai/transcribeAudio';
import { getMessages } from '../controller/messages/messages';

const chatsRouter = express.Router()
// Chat endpoints
chatsRouter.post('/stream', sendStreamingMessage);
chatsRouter.post('/send-message', sendChatMessage);

// Completion endpoint
chatsRouter.post('/completion', generateCompletion);

// Utility endpoints
chatsRouter.get('/models', getModels);
chatsRouter.get('/health', healthCheck);

//assembly ai for audio transcription
chatsRouter.post('/transcribe-audio', async (req: Request, res: Response) => {
    try {
        await transcribeAudio(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

//get all messages endpoint for specific user
chatsRouter.get('/user/:id', async (req: Request, res: Response) => {
    await getMessages(req, res);
})

//test chats storage 
chatsRouter.get('/test', testDatabase);

export default chatsRouter;