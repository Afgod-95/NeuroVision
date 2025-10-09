import supabase from "../../lib/supabase";
import { Request, Response } from 'express';
import { isValidUUID } from "../../helpers/isValidUUID";
export const deleteConversationSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.query;
    const authUserId = req?.user?.id;
    const userId = parseInt(authUserId as string);

    if (!conversationId || !userId) {
      res.status(400).json({
        success: false,
        error: 'conversationId (query) and userId are required',
      });
      return;
    }

    const conversationIdStr = conversationId.toString();

    if (!isValidUUID(conversationIdStr)) {
      res.status(400).json({
        success: false,
        error: 'Invalid conversationId format. Must be a valid UUID.',
      });
      return;
    }

    // Step 1: Delete related messages
    const { error: messageError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationIdStr)
      .eq('user_id', userId);

    if (messageError) {
      throw new Error(`Failed to delete related messages: ${messageError.message}`);
    }

    // Step 2: Delete the conversation summary
    const { error: summaryError } = await supabase
      .from('ai_conversation_summaries')
      .delete()
      .eq('conversation_id', conversationIdStr)
      .eq('user_id', userId);

    if (summaryError) {
      throw new Error(`Failed to delete conversation summary: ${summaryError.message}`);
    }

    res.json({
      success: true,
      message: 'Conversation and related messages deleted successfully',
      conversationId: conversationIdStr,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete conversation and messages',
    });
  }
};
