import axios from "axios";
import { Request, Response } from "express";
import supabase from "../../lib/supabase";

const transcribeAudio = async (req: Request, res: Response) => {
  const baseUrl = "https://api.assemblyai.com";
  const headers = {
    authorization: process.env.ASSEMBLY_AI_AUTHORIZATION_KEY,
  };

  try {
    const { userId, audioUrl  } = req.body;

    if (!(audioUrl && userId)) {
      return res.status(400).json({ error: "Missing audioUrl or userId" });
    }

    const data = {
      audio_url: audioUrl,
      speech_model: "universal",
    };

    const response = await axios.post(`${baseUrl}/v2/transcript`, data, { headers });
    const transcriptId = response.data.id;
    const pollingEndpoint = `${baseUrl}/v2/transcript/${transcriptId}`;

    while (true) {
      const pollingResponse = await axios.get(pollingEndpoint, { headers });
      const transcriptionResult = pollingResponse.data;

      if (transcriptionResult.status === "completed") {
        const text = transcriptionResult.text;

        // ✅ INSERT into Supabase messages table
        const { data: insertData, error: insertError } = await supabase
          .from("messages")
          .insert([
            {
              user_id: userId,
              sender: "user", 
              content: text,
            },
          ]);

        if (insertError) {
          console.error("Supabase insert error:", insertError);
          return res.status(500).json({ error: "Failed to insert message into database" });
        }

        return res.status(200).json({
          message: "Transcription completed and inserted into DB",
          transcriptionResult,
          insertedMessage: insertData?.[0],
        });
      }

      if (transcriptionResult.status === "error") {
        throw new Error(`Transcription failed: ${transcriptionResult.error}`);
      }

      // Wait 3 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (error: any) {
    console.error("Transcription error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { transcribeAudio };
