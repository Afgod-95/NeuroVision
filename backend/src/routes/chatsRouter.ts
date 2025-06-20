import express, { Request, RequestHandler, Response } from 'express';
import { generateCompletion, getConversation, getModels, sendChatMessage } from '../controller/chats/chats';
import { transcribeAudio } from '../controller/assembly_ai/transcribeAudio';
import { getMessages } from '../controller/messages/messages';
import { bulkGenerateSummaries,  getConversationSummary } from '../controller/chats/chats.conversation.summaries';


const chatsRouter = express.Router()
// Chat endpoints
chatsRouter.post('/send-message', sendChatMessage);

// Completion endpoint
chatsRouter.post('/completion', generateCompletion);

chatsRouter.get('/conversations', getConversation);

// Utility endpoints
chatsRouter.get('/models', getModels);

//assembly ai for audio transcription
chatsRouter.post('/transcribe-audio', async (req: Request, res: Response) => {
    try {
        await transcribeAudio(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


//get conversation history
chatsRouter.get('/conversation/:conversationId/history', getConversation)







// New summary routes
chatsRouter.get('/conversations/summary', getConversationSummary);
//chatsRouter.put('/conversations/summary', updateConversationSummary);
chatsRouter.post('/conversations/summaries/bulk-generate', bulkGenerateSummaries);


export default chatsRouter;