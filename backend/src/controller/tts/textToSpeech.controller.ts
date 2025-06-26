import { Router, Request, Response } from 'express';
import { config } from 'dotenv';
config();

const router = Router();

const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // You can change this to any voice ID

// Environment check on startup
console.log('Environment check:');
console.log('- API Key exists:', !!elevenLabsApiKey);
console.log('- API Key length:', elevenLabsApiKey?.length);
console.log('- API Key preview:', elevenLabsApiKey?.substring(0, 8) + '...');

if (!elevenLabsApiKey) {
  console.error('ELEVENLABS_API_KEY environment variable is not set');
}


// POST route for text-to-speech conversion
export const tts = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    // Check if API key is available
    if (!elevenLabsApiKey) {
      console.error('ElevenLabs API key not configured');
      return res.status(500).json({
        error: "API key not configured"
      });
    }

    // Validate input text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: "Text is required and must be a non-empty string"
      });
    }

    console.log('Generating TTS for text length:', text.length);

    // Use direct fetch to ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: 'eleven_multilingual_v2',
        output_format: 'mp3_44100_128'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API Error:', response.status, errorText);
      
      // Handle specific error cases
      if (response.status === 401) {
        return res.status(401).json({
          error: "Invalid API key or account issue",
          details: errorText
        });
      }
      
      if (response.status === 429) {
        return res.status(429).json({
          error: "API quota exceeded. Please try again later.",
          details: errorText
        });
      }
      
      return res.status(response.status).json({
        error: `API request failed: ${response.status}`,
        details: errorText
      });
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);
    
    console.log('Generated audio buffer size:', buffer.length);

    // Set response headers and send audio
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'no-cache',
    });

    res.send(buffer);

  } catch (error) {
    console.error('TTS API Error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      if (error.message.includes('quota')) {
        return res.status(429).json({
          error: "API quota exceeded. Please try again later."
        });
      }
      
      if (error.message.includes('unauthorized') || error.message.includes('401')) {
        return res.status(401).json({
          error: "Invalid API key"
        });
      }
    }

    res.status(500).json({
      error: "An error occurred while generating audio",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

