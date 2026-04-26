let isOn = false;
let captionInterval = null;

function setStatus(text, isOn) {
  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  if (isOn === true) {
    dot.className = 'statusDot green';
  } else if (isOn === false) {
    dot.className = 'statusDot red';
  } else {
    dot.className = 'statusDot';
  }
  statusText.textContent = text;
}

function updatePreview(text) {
  const preview = document.getElementById('previewText');
  if (text) {
    preview.textContent = text;
    preview.className = 'previewText';
  }
}

function startCaptions() {
  isOn = true;
  const lang = document.getElementById('langInput').value;
  
  setStatus('Capturing...', true);
  updatePreview('Waiting for audio...');
  
  chrome.runtime.sendMessage({
    type: 'START_CAPTURES',
    lang: lang
  });
}

function stopCaptions() {
  isOn = false;
  setStatus('Stopped', false);
  chrome.runtime.sendMessage({ type: 'STOP_CAPTURES' });
  updatePreview('-');
}

document.addEventListener('DOMContentLoaded', function() {
  setStatus('Ready', null);
  
  document.getElementById('powerToggle').addEventListener('change', function(e) {
    if (e.target.checked) {
      startCaptions();
    } else {
      stopCaptions();
    }
  });
  
  document.getElementById('langInput').addEventListener('change', function(e) {
    if (isOn) {
      chrome.runtime.sendMessage({
        type: 'SET_LANG',
        lang: e.target.value
      });
    }
  });
  
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SHOW_CAPTION') {
      updatePreview(message.text);
    }
  });
});