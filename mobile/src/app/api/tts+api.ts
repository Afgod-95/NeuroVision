import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { config } from 'dotenv';
config();


const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

console.log('Environment check:');
console.log('- API Key exists:', !!elevenLabsApiKey);
console.log('- API Key length:', elevenLabsApiKey?.length);
console.log('- API Key preview:', elevenLabsApiKey?.substring(0, 8) + '...');

if (!elevenLabsApiKey) {
  throw new Error('ELEVENLABS_API_KEY environment variable is not set');
}

const elevenlabs = new ElevenLabsClient({
  apiKey: elevenLabsApiKey
});

export const GET = async (request: Request) => {
  console.log('API Key loaded:', !!elevenLabsApiKey);
  
  if (!elevenLabsApiKey) {
    return Response.json({
      error: "API key not configured or loaded"
    }, { status: 500 });
  }
  
  return Response.json({
    message: "TTS API is ready",
    hasApiKey: !!elevenLabsApiKey
  });
};

export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const { text } = body;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return Response.json({
        error: "Text is required and must be a non-empty string"
      }, { status: 400 });
    }

    // Use direct fetch instead of SDK
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb', {
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
      return Response.json({
        error: `API request failed: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      }
    });

  } catch (error) {
    console.error('TTS API Error:', error);
    return Response.json({
      error: "An error occurred while generating audio",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};