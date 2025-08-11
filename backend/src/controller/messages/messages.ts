import supabase from "../../lib/supabase";
import { Request, Response } from "express";

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface User {
      id: string;
      // add other properties if needed
    }
    interface Request {
      user?: User;
    }
  }
}

// Helper function to get user_id from auth_user_id
const getUserIdFromAuth = async (authUserId: string): Promise<number | null> => {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();
  
  if (error || !data) {
    console.error("Error getting user ID:", error);
    return null;
  }
  
  return data.id;
};

const getMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const authUserId = req.user?.id; 
    
    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get the integer user_id from auth_user_id
    const userId = await getUserIdFromAuth(authUserId);
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }
    
    let query = supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    // Filter by conversation ID to get all messages in the conversation
    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching messages:", error.message);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }

    return res.status(200).json({ 
      content: data || [],
      messages: data || []
    });
  } catch (error: any) {
    console.error("Unexpected error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const createMessage = async (req: Request, res: Response) => {
  try {
    const { conversationId, sender, content } = req.body;
    const authUserId = req.user?.id;

    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get the integer user_id from auth_user_id
    const userId = await getUserIdFromAuth(authUserId);
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId, // Use the integer user_id
        sender,
        content
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating message:", error.message);
      return res.status(500).json({ error: "Failed to create message" });
    }

    return res.status(201).json(data);
  } catch (error: any) {
    console.error("Unexpected error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

// Alternative approach: Create a view that joins messages with users
// This can simplify your queries and include user information
const createMessagesView = async () => {
  const viewQuery = `
    create or replace view messages_with_users as
    select 
      m.*,
      u.username,
      u.email,
      u.auth_user_id
    from messages m
    join users u on m.user_id = u.id
  `;
  
  // Execute this in your database to create the view
  // Then you can query from 'messages_with_users' instead
};

export { getMessages, createMessage, getUserIdFromAuth };