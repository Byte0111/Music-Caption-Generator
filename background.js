let ws = null;
let mediaRecorder = null;
let isCapturing = false;
let currentLang = 'hi';
let capturedStream = null;
let recorderChunks = [];

const WS_URL = 'ws://localhost:8001/ws';

function sendCaptionToContent(text) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0 && tabs[0].url && tabs[0].url.includes('youtube.com')) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SHOW_CAPTION', text: text }, () => {});
    }
  });
}

async function connectWebSocket() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('WS connected');
      ws.send(JSON.stringify({ type: 'init', lang: currentLang }));
      resolve();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'caption' || data.type === 'status') {
          sendCaptionToContent(data.text);
        }
      } catch (e) {}
    };

    ws.onerror = (e) => reject(e);

    ws.onclose = () => {
      ws = null;
      if (isCapturing) {
        setTimeout(() => { if (isCapturing) connectWebSocket(); }, 2000);
      }
    };
  });
}

async function startCapture(tabId) {
  if (isCapturing) return;
  isCapturing = true;

  try {
    const mediaStream = await chrome.tabCapture.capture({
      tabId: tabId,
      audio: true,
      video: false
    });

    if (!mediaStream || mediaStream.getAudioTracks().length === 0) {
      isCapturing = false;
      sendCaptionToContent('No audio. Play a YouTube video & refresh the page.');
      return;
    }

    capturedStream = mediaStream;
    
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
      ? 'audio/webm;codecs=opus' 
      : 'audio/webm';

    mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
    recorderChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recorderChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      if (!isCapturing || recorderChunks.length === 0) return;
      
      const audioBlob = new Blob(recorderChunks, { type: mimeType });
      recorderChunks = [];
      
      const buffer = await audioBlob.arrayBuffer();
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(buffer);
      }
    };

    mediaRecorder.start(2000);
    
    await connectWebSocket();
    sendCaptionToContent('Listening...');

  } catch (err) {
    console.error('Capture error:', err);
    isCapturing = false;
    sendCaptionToContent('Error: ' + err.message);
  }
}

function stopCapture() {
  isCapturing = false;
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder = null;
  }
  
  if (capturedStream) {
    capturedStream.getTracks().forEach(t => t.stop());
    capturedStream = null;
  }
  
  if (ws) {
    ws.close();
    ws = null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_CAPTURES') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length > 0) {
        currentLang = message.lang || 'hi';
        await startCapture(tabs[0].id);
      }
    });
  } else if (message.type === 'STOP_CAPTURES') {
    stopCapture();
  } else if (message.type === 'SET_LANG') {
    currentLang = message.lang;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'set_lang', lang: currentLang }));
    }
  }
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.includes('youtube.com') && isCapturing) {
    stopCapture();
  }
});