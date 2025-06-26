import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { config } from 'dotenv';
config(); // Loads from .env in development

const router = Router();

const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; 

export const tts = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!ELEVEN_KEY) {
      return res.status(500).json({ error: 'Missing API key' });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVEN_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: 'eleven_monolingual_v1',
          output_format: 'mp3_44100_128',
        }),
      }
    );

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error('TTS error', elevenRes.status, errText);
      return res.status(elevenRes.status).json({ error: errText });
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache',
    });

    elevenRes.body.pipe(res);
  } catch (error) {
    console.error('TTS route error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export default router;
