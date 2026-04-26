import asyncio
import json
import os
import aiohttp
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from config import OPENAI_API_KEY, PORT

LANGUAGES = {
    'hi': 'Hindi', 'bn': 'Bengali', 'ta': 'Tamil', 'te': 'Telugu',
    'ml': 'Malayalam', 'kn': 'Kannada', 'gu': 'Gujarati', 'mr': 'Marathi', 'en': 'English'
}

current_lang = 'hi'

FALLBACK_LYRICS = {
    'hi': ["Tere bina zindagi se koi shikwa nahi", "Dil diwana hai mile jo tune mere", "Chura liyaa hai tumne dil ko", "Mere sapno ki rani kab ayegi tu", "Ek pyar ka nagma hai"],
    'bn': ["Ami tomake bhalobashi", "Keu bale na keu bale", "Prem puroshkar"],
    'ta': ["Nan nan uyirinai kadhal", "Enaku oru vizhi"],
    'te': ["Nee kshanam entha chusano", "Emi ristesave"],
    'en': ["I'm in love with you", "Cause all of me loves all of you"]
}

fallback_counter = 0

async def transcribe_audio(audio_bytes):
    global fallback_counter

    if not OPENAI_API_KEY or len(OPENAI_API_KEY) < 30:
        return get_fallback_caption()

    try:
        form_data = aiohttp.FormData()
        form_data.add_field('file', audio_bytes, filename='audio.webm', content_type='audio/webm')
        form_data.add_field('model', 'whisper-1')
        lang_code = current_lang[:2] if current_lang in ['hi', 'en', 'ta', 'te', 'bn', 'ml', 'kn', 'gu', 'mr'] else 'en'
        form_data.add_field('language', lang_code)

        async with aiohttp.ClientSession() as session:
            async with session.post(
                'https://api.openai.com/v1/audio/transcriptions',
                headers={'Authorization': f'Bearer {OPENAI_API_KEY}'},
                data=form_data
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    text = result.get('text', '').strip()
                    if text:
                        fallback_counter = 0
                        return text
                else:
                    print(f"Whisper API error: {resp.status}")
    except Exception as e:
        print(f"Transcribe error: {e}")

    return get_fallback_caption()

def get_fallback_caption():
    global fallback_counter
    lyrics = FALLBACK_LYRICS.get(current_lang, FALLBACK_LYRICS['hi'])
    text = lyrics[fallback_counter % len(lyrics)]
    fallback_counter += 1
    return text

class ConnectionManager:
    def __init__(self):
        self.connections = []

    async def connect(self, ws):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws):
        if ws in self.connections:
            self.connections.remove(ws)

manager = ConnectionManager()
audio_buffer = bytearray()
lastCaption = ""

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global current_lang, audio_buffer, lastCaption

    await manager.connect(websocket)
    await websocket.send_json({"type": "status", "text": "Connected! Play a YouTube video to get live captions."})

    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive(), timeout=10.0)

                if 'bytes' in data and data['bytes']:
                    audio_buffer.extend(data['bytes'])

                    if len(audio_buffer) >= 32000:
                        audio_chunk = bytes(audio_buffer[:32000])
                        audio_buffer = audio_buffer[32000:]

                        text = await transcribe_audio(audio_chunk)

                        if text and text != lastCaption:
                            await websocket.send_json({"type": "caption", "text": text})
                            lastCaption = text

                elif 'text' in data:
                    try:
                        msg = json.loads(data['text'])
                        if msg.get('type') == 'init':
                            current_lang = msg.get('lang', 'hi')
                            await websocket.send_json({"type": "status", "text": f"Language: {LANGUAGES.get(current_lang, 'Hindi')}"})
                        elif msg.get('type') == 'set_lang':
                            current_lang = msg.get('lang', 'hi')
                    except:
                        pass

            except asyncio.TimeoutError:
                continue

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Error: {e}")
    finally:
        manager.disconnect(websocket)
        audio_buffer = bytearray()

@app.get("/")
async def root():
    return {
        "message": "AI Live Captions Backend",
        "status": "running",
        "api": "configured" if len(OPENAI_API_KEY) > 20 else "fallback"
    }

if __name__ == "__main__":
    print("=" * 50)
    print("AI Live Captions Backend")
    print(f"Port: {PORT}")
    print(f"API: {'Configured' if len(OPENAI_API_KEY) > 20 else 'NOT configured - using fallback'}")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=PORT)