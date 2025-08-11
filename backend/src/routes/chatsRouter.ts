import express, { Request, RequestHandler, Response } from 'express';
import { generateCompletion, getConversation, getConversationMessages, getModels, sendChatMessage } from '../controller/conversation/conversations.controller';
import { transcribeAudio } from '../controller/assembly_ai/transcribeAudio';
import { getMessages } from '../controller/messages/messages';
import { bulkGenerateSummaries, getUserConversationSummaries } from '../controller/conversation/conversation.summaries';
import { tts } from '../controller/tts/textToSpeech.controller';
import { verifyAccessToken } from '../middlewares/auth.middleware';


const chatsRouter = express.Router()
// Chat endpoints
chatsRouter.post('/send-message', verifyAccessToken as RequestHandler, sendChatMessage);

// Completion endpoint
chatsRouter.post('/completion',verifyAccessToken as RequestHandler, generateCompletion);

chatsRouter.get('/conversations',verifyAccessToken as RequestHandler, getConversation);

// Utility endpoints
chatsRouter.get('/models', verifyAccessToken as RequestHandler, getModels as RequestHandler);

//assembly ai for audio transcription
chatsRouter.post('/transcribe-audio', verifyAccessToken as RequestHandler, async (req: Request, res: Response) => {
    try {
        await transcribeAudio(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


/**
 * get messages endpoint
 */
chatsRouter.get('/messages',verifyAccessToken as RequestHandler, getConversationMessages);

//get conversation history
chatsRouter.get('/:conversationId/history',verifyAccessToken as RequestHandler, getConversation)



//chatsRouter.put('/conversations/summary', updateConversationSummary);
chatsRouter.post('/summaries/bulk-generate',verifyAccessToken as RequestHandler, bulkGenerateSummaries);


/**
 * GET CONVERSATION SUMMARIES FOR A SPECIFIC USER
*/
chatsRouter.get('/user/summaries/',verifyAccessToken as RequestHandler, getUserConversationSummaries);

/**
 * TEXT TO SPEECH ENDPOINT
 */
chatsRouter.post('/text-to-speech',verifyAccessToken as RequestHandler, tts as RequestHandler);


export default chatsRouter;