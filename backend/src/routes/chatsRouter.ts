import express, { Request, RequestHandler, Response } from 'express';
import { generateCompletion, getConversation, getConversationMessages, getModels, sendChatMessage } from '../controller/conversation/conversations.controller';
import { transcribeAudio } from '../controller/assembly_ai/transcribeAudio';
import { getMessages } from '../controller/messages/messages';
import { bulkGenerateSummaries, getUserConversationSummaries } from '../controller/conversation/conversation.summaries';
import { tts } from '../controller/tts/textToSpeech.controller';


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


/**
 * get messages endpoint
 */
chatsRouter.get('/messages', getConversationMessages);

//get conversation history
chatsRouter.get('/:conversationId/history', getConversation)



//chatsRouter.put('/conversations/summary', updateConversationSummary);
chatsRouter.post('/summaries/bulk-generate', bulkGenerateSummaries);


/**
 * GET CONVERSATION SUMMARIES FOR A SPECIFIC USER
*/
chatsRouter.get('/user/summaries/', getUserConversationSummaries);

/**
 * TEXT TO SPEECH ENDPOINT
 */
chatsRouter.post('/messages/text-to-speech', tts as RequestHandler);


export default chatsRouter;