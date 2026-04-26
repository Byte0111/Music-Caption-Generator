@echo off
echo ========================================
echo AI Live Captions - Quick Start
echo ========================================
echo.

echo [1/3] Installing dependencies...
pip install -r backend\requirements.txt >nul 2>&1

echo [2/3] Checking API key...
python -c "from backend.config import OPENAI_API_KEY; print('API configured' if len(OPENAI_API_KEY) > 30 else 'WARNING: API key not set')"

echo [3/3] Starting backend server...
echo.
echo Server: ws://localhost:8001
echo Keep this window open!
echo.
echo Next steps:
echo 1. Open Chrome
echo 2. Go to chrome://extensions/
echo 3. Enable Developer mode
echo 4. Click "Load unpacked"
echo 5. Select this folder
echo 6. Go to YouTube and play a video
echo 7. Click the extension icon
echo 8. Toggle "Start Capture" ON
echo ========================================

python backend\server.py

pause