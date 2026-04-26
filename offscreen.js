let webSocket = null;
let mediaRecorder = null;
let captureStream = null;
let isCapturing = false;
let targetLang = 'hi';
let recorderChunks = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_RECORDING') {
    startRecording(message.streamId, message.lang);
    sendResponse({ success: true });
  } else if (message.action === 'STOP_RECORDING') {
    stopRecording();
    sendResponse({ success: true });
  } else if (message.action === 'SET_LANGUAGE') {
    targetLang = message.lang;
    sendResponse({ success: true });
  }
  return true;
});

function connectWebSocket() {
  if (webSocket && webSocket.readyState === WebSocket.OPEN) return;

  webSocket = new WebSocket('ws://localhost:8001/ws');

  webSocket.onopen = () => {
    console.log("WebSocket connected");
    webSocket.send(JSON.stringify({ type: 'init', lang: targetLang }));
  };

  webSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'caption' || data.type === 'status') {
        chrome.runtime.sendMessage({
          type: 'SHOW_CAPTION',
          text: data.text
        });
      }
    } catch (e) {}
  };

  webSocket.onclose = () => {
    webSocket = null;
    if (isCapturing) setTimeout(connectWebSocket, 3000);
  };
}

async function startRecording(streamId, lang) {
  if (isCapturing) return;

  targetLang = lang;
  isCapturing = true;
  connectWebSocket();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });

    captureStream = stream;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    recorderChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recorderChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      if (!isCapturing || recorderChunks.length === 0) return;

      const blob = new Blob(recorderChunks, { type: mimeType });
      recorderChunks = [];

      if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(await blob.arrayBuffer());
      }
    };

    mediaRecorder.start(2000);

  } catch (err) {
    console.error("Record error:", err);
    isCapturing = false;
  }
}

function stopRecording() {
  isCapturing = false;

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder = null;
  }

  if (captureStream) {
    captureStream.getTracks().forEach(t => t.stop());
    captureStream = null;
  }

  if (webSocket) {
    webSocket.close();
    webSocket = null;
  }
}