import express, { Request, RequestHandler, Response } from 'express';
import { deleteConversationSummary, generateCompletion, getConversation, getSummaryMessages, getModels } from '../controller/conversation/conversations.controller';
import { sendChatMessage } from '../controller/conversation/send_message_controller';
import { transcribeAudio } from '../controller/assembly_ai/transcribeAudio';
import { get_conversation_from_ids } from '../controller/messages/messages';
import { bulkGenerateSummaries, getUserConversationSummaries } from '../controller/conversation/conversation.summaries';
import { tts } from '../controller/tts/textToSpeech.controller';
import { verifyAccessToken } from '../middlewares/auth.middleware';
import { uploadMiddleware } from '../middlewares/upload.middleware';



const chatsRouter = express.Router()
// Chat endpoints
chatsRouter.post('/send-message', 
    verifyAccessToken as RequestHandler, 
    uploadMiddleware, 
    sendChatMessage
);

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
chatsRouter.get('/summary/messages',verifyAccessToken as RequestHandler, getSummaryMessages);

//get conversation history by ids
chatsRouter.get(
    '/:conversationId',
    verifyAccessToken as RequestHandler,
    (req: Request, res: Response, next) => {
        Promise.resolve(get_conversation_from_ids(req, res)).catch(next);
    }
)


/**
 * GET CONVERSATION SUMMARIES FOR A SPECIFIC USER
*/
chatsRouter.get('/user/summaries/',verifyAccessToken as RequestHandler, getUserConversationSummaries);

//chatsRouter.put('/conversations/summary', updateConversationSummary);
chatsRouter.post('/summaries/bulk-generate',verifyAccessToken as RequestHandler, bulkGenerateSummaries);

//TEXT TO SPEECH ENDPOINT
chatsRouter.post('/text-to-speech',verifyAccessToken as RequestHandler, tts as RequestHandler);

//GET CONVERSATION SUMMARIES FOR A SPECIFIC USER
chatsRouter.get('/user/summary/message',verifyAccessToken as RequestHandler, getUserConversationSummaries);

//delete conversation summary
chatsRouter.delete('/user/summary/messages',verifyAccessToken as RequestHandler, deleteConversationSummary);



export default chatsRouter;