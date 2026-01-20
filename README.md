NeuroVision AI Assistant
NeuroVision is a multimodal AI assistant built with React Native and Next.js, designed to provide seamless AI-powered interactions across text, audio, and visual inputs. It combines real-time AI responses with an intuitive mobile-first interface, enabling users to interact naturally with AI for productivity, learning, and entertainment.

Features

1. Multimodal AI Interaction: Communicate via text, voice, or images.
2. Real-time AI Responses: Instant responses with typing animations for a human-like chat experience.
3. Audio Upload & Playback: Record or upload audio, receive AI-generated responses in text or audio.
4. Conversation History: Chat history stored securely and displayed in a smooth UI.
5. Customizable UI: Dark/light mode and ChatGPT-style interface for immersive experience.
6. Responsive & Mobile-Friendly: Built for smooth performance on iOS and Android.
7. File Upload Support: Users can send images or documents for AI processing.
8. Seamless Backend Integration: Powered by Supabase for auth, storage, and database, plus AI APIs for multimodal processing.

Tech Stack

Frontend
1. React Native (Expo)
2. Next.js (for web companion or dashboard)
3. TypeScript
4. Tailwind CSS
5. Framer Motion (for UI animations)

Backend / Data
1. Supabase (Auth, DB, Storage)
2. REST APIs & AI integrations
3. Node.js & Express (if applicable)
4. AI & Multimodal Processing

OpenAI / Gemini / ElevenLabs (text-to-speech, AI responses, image processing)

Installation

Clone the repository:

git clone https://github.com/Afgod-95/neurovision.git
cd neurovision


Install dependencies:

npm install
# or
yarn install


Set up environment variables:

Create a .env file:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
AI_API_KEY=your_ai_service_key


Run the app:
# For Expo mobile app
expo start

# For web dashboard (Next.js)
npm run dev


Usage
1. Open the app on mobile or web.
2. Log in / sign up using Supabase authentication.
3. Start a new conversation: type text, upload audio, or send images.
4. AI responds in real-time; audio responses are playable directly in the app.
5. View conversation history and interact seamlessly.



Contributing
NeuroVision is currently a personal project. Contributions are welcome — especially ideas for new multimodal interactions or UI improvements.

License
MIT License © 2026 Afari Boadu Godwin
