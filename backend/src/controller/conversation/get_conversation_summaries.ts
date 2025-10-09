import supabase from "../../lib/supabase";
import { Request, Response } from "express";
import { isValidUUID } from "../../helpers/isValidUUID";

export const getSummaryMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.query;
    const authUserId = req?.user?.id;
    const userId = parseInt(authUserId as string);

    if (!conversationId || !userId) {
      res.status(400).json({
        success: false,
        error: "conversationId and userId are required",
      });
      return;
    }

    if (!isValidUUID(conversationId as string)) {
      res.status(400).json({
        success: false,
        error: "Invalid conversationId format",
      });
      return;
    }

    // ✅ Verify conversation ownership
    const { data: conversationExists } = await supabase
      .from("ai_conversation_summaries")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .single();

    if (!conversationExists) {
      res.status(404).json({
        success: false,
        error: "Conversation not found or access denied",
      });
      return;
    }

    // ✅ Get messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    // ✅ Get related file metadata from `message_files`
    const { data: fileRecords, error: filesError } = await supabase
      .from("message_files")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    if (filesError) throw filesError;

    // Group files by message_id for easier attachment
    const filesByMessageId: Record<string, any[]> = {};
    fileRecords?.forEach((file) => {
      if (!filesByMessageId[file.message_id]) filesByMessageId[file.message_id] = [];
      filesByMessageId[file.message_id].push(file);
    });

    // ✅ Combine messages with file URLs
    const messagesWithFiles = await Promise.all(
      (messages || []).map(async (msg) => {
        const attachedFiles = filesByMessageId[msg.id] || [];

        // If file is text-like, optionally fetch content from bucket
        const filesWithContent = await Promise.all(
          attachedFiles.map(async (f) => {
            if (f.file_uri && /\.(txt|md|json)$/i.test(f.file_name)) {
              try {
                const response = await fetch(f.file_uri);
                const textContent = await response.text();
                return { ...f, textContent };
              } catch (err) {
                console.error("Error fetching file content:", f.file_uri, err);
                return { ...f, textContent: null };
              }
            }
            return f;
          })
        );

        return {
          ...msg,
          files: filesWithContent,
        };
      })
    );

    res.json({
      success: true,
      conversationId,
      messages: messagesWithFiles,
      messageCount: messagesWithFiles.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Get conversation messages error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch conversation messages",
    });
  }
};
