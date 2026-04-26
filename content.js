// Content script - YouTube overlay

(function() {
  'use strict';

  let captionContainer = null;
  let captionText = null;

  function createOverlay() {
    if (captionContainer) return;

    captionContainer = document.createElement('div');
    captionContainer.id = 'ai-caption-overlay-container';

    captionText = document.createElement('div');
    captionText.id = 'ai-caption-text';
    captionText.className = 'ai-caption-hidden';

    captionContainer.appendChild(captionText);

    document.body.appendChild(captionContainer);
  }

  function injectOverlay() {
    const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    
    if (!player) {
      setTimeout(injectOverlay, 1000);
      return;
    }

    createOverlay();

    const style = document.createElement('style');
    style.textContent = `
      #ai-caption-overlay-container {
        position: absolute;
        bottom: 10%;
        left: 0;
        width: 100%;
        text-align: center;
        z-index: 999999;
        pointer-events: none;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      #ai-caption-text {
        background-color: rgba(0, 0, 0, 0.75);
        color: #fff;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 28px;
        font-weight: 600;
        padding: 12px 24px;
        border-radius: 12px;
        max-width: 80%;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        transition: all 0.3s ease;
      }
      .ai-caption-hidden {
        opacity: 0;
        transform: translateY(20px);
      }
      .ai-caption-visible {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }

  function showCaption(text) {
    if (!captionContainer) {
      injectOverlay();
    }

    if (captionText) {
      if (text && text.trim()) {
        captionText.textContent = text;
        captionText.className = 'ai-caption-visible';
      } else {
        captionText.className = 'ai-caption-hidden';
      }
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHOW_CAPTION') {
      showCaption(message.text);
    }
    return true;
  });

  if (document.readyState === 'complete') {
    injectOverlay();
  } else {
    window.addEventListener('load', injectOverlay);
  }

  setInterval(injectOverlay, 5000);
})();