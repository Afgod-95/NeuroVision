import supabase from "../../lib/supabase";
import { Request, Response } from "express";

const getMessages = async (req: Request, res: Response) => {
  try {
    // Get userId from route params instead of query
    const { userId } = req.params;
    
    let query = supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    // If userId is provided, filter by it
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching messages:", error.message);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }

    // Return messages in the expected format
    return res.status(200).json({ 
      content: data || [],
      messages: data || [] // Keep both for compatibility
    });
  } catch (error: any) {
    console.error("Unexpected error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

export { getMessages };

