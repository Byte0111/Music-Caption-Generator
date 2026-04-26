# AI Live Captions

Real-time AI captions for YouTube videos using Chrome extension + OpenAI Whisper API.

## 🎯 Features

- **Live Audio Capture** - Captures audio directly from YouTube tabs
- **Whisper Transcription** - Uses OpenAI Whisper for accurate speech-to-text
- **Multi-language** - Supports Hindi, Bengali, Tamil, Telugu, Malayalam, Kannada, Gujarati, Marathi, English
- **Live Overlay** - Shows captions overlaid on YouTube video

## 🏗️ Architecture

```
YouTube → chrome.tabCapture → MediaRecorder → WebSocket → Backend → Whisper API → Caption Overlay
```

## 📦 Installation

### 1. Backend Setup

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Set your OpenAI API key
# Edit backend/.env and add:
OPENAI_API_KEY=your_openai_api_key_here
```

Get API key from: https://platform.openai.com/api-keys

### 2. Run Backend

```bash
# Windows
start.bat

# Or manually
python backend\server.py
```

The server runs on `ws://localhost:8001`

### 3. Load Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder

## 🚀 Usage

1. Start the backend (`start.bat`)
2. Open YouTube and play a video
3. Click the extension icon in Chrome
4. Select your language
5. Toggle **Start Capture** ON

Captions will appear overlaid on the video.

## 📁 Project Structure

```
├── manifest.json      # Extension config
├── background.js     # Audio capture & WebSocket
├── content.js       # Caption overlay
├── popup.html/js   # Extension UI
├── offscreen.js    # Audio processing
├── content.css     # Overlay styles
├── backend/
│   ├── server.py   # WebSocket server + Whisper
│   ├── config.py  # Configuration
│   └── .env      # API keys (local)
└── start.bat      # Quick start script
```

## 🔧 Troubleshooting

### No audio detected
- Make sure YouTube video is actually playing audio
- Refresh the YouTube page after starting capture

### API not working
- Check your OpenAI API key in `backend/.env`
- Make sure you have credits available

### Extension not loading
- Go to `chrome://extensions/`
- Check for any error messages
- Try removing and reloading

## 📝 License

MIT