<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Ghosty Translator</title>
  <style>
    :root {
      --bg-color: #f4f4f9;
      --card-bg: #ffffff;
      --primary: #ff4757;
      --text-main: #2f3542;
      --text-muted: #747d8c;
      --success: #2ed573;
      --error: #ff4757;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, sans-serif; }
    body { background-color: var(--bg-color); color: var(--text-main); display: flex; flex-direction: column; height: 100vh; padding: 20px; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .settings-icon, .user-profile { font-size: 1.2rem; color: var(--text-muted); }
    .status-indicator { display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 30px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background-color: var(--text-muted); }
    .dot.active { background-color: var(--success); }
    .dot.error { background-color: var(--error); }
    .pet-selector { background: var(--card-bg); border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 40px; }
    .pet-avatar { font-size: 3rem; margin-bottom: 10px; }
    .pet-name { font-size: 1.5rem; font-weight: 600; }
    .recording-zone { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; }
    .record-btn { width: 120px; height: 120px; border-radius: 50%; background-color: var(--card-bg); border: 4px solid #ffeaa7; font-size: 3rem; display: flex; justify-content: center; align-items: center; box-shadow: 0 10px 25px rgba(0,0,0,0.1); transition: all 0.2s; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .record-btn.recording { border-color: var(--primary); background-color: #ffcccb; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(255, 71, 87, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); } }
    .action-text { margin-top: 20px; font-weight: 500; font-size: 1.1rem; }
    .context-dock { margin-top: auto; padding-bottom: 20px; }
    .context-title { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px; }
    .tags-container { display: flex; flex-wrap: wrap; gap: 10px; }
    .tag { background: var(--card-bg); border: 1px solid #e1e1e1; padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; color: var(--text-main); cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .tag.selected { background: var(--text-main); color: #fff; border-color: var(--text-main); }
  </style>
</head>
<body>

  <header>
    <div class="settings-icon">⚙️</div>
    <div class="user-profile">Profile: Household</div>
  </header>

  <div class="status-indicator">
    <div class="dot" id="mic-dot"></div>
    <span id="mic-status-text">Checking microphone...</span>
  </div>

  <div class="pet-selector">
    <div class="pet-avatar">🐱</div>
    <div class="pet-name">Ghosty</div>
  </div>

  <div class="recording-zone">
    <button class="record-btn" id="record-btn">🎙️</button>
    <div class="action-text" id="action-text">Tap to Listen</div>
  </div>

  <div class="context-dock">
    <div class="context-title">Context Tags (Optional):</div>
    <div class="tags-container">
      <button class="tag">🥣 Food</button>
      <button class="tag">🚪 Door</button>
      <button class="tag">🧸 Play</button>
      <button class="tag">💤 Rest</button>
      <button class="tag">❓ Unknown</button>
    </div>
  </div>

  <script>
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let audioContext;
    let analyser;

    const recordBtn = document.getElementById('record-btn');
    const actionText = document.getElementById('action-text');
    const micDot = document.getElementById('mic-dot');
    const micStatusText = document.getElementById('mic-status-text');
    const tags = document.querySelectorAll('.tag');
    let selectedContext = 'Unknown';

    // Tag logic
    tags.forEach(tag => {
      tag.addEventListener('click', () => {
        tags.forEach(t => t.classList.remove('selected'));
        tag.classList.add('selected');
        selectedContext = tag.innerText.replace(/[^a-zA-Z]/g, '').trim(); 
      });
    });

    // Native browser mic request (No iframe trap)
    async function initMicCheck() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micDot.className = 'dot active';
        micStatusText.innerText = 'Microphone ready';
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        setupRecorder(stream);
      } catch (err) {
        micDot.className = 'dot error';
        micStatusText.innerText = 'Mic permission denied';
        actionText.innerText = 'Please allow mic access in Safari settings.';
      }
    }

    function setupRecorder(stream) {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];
        processAudio(audioBlob);
      };
    }

    recordBtn.addEventListener('click', () => {
      if (!mediaRecorder) { initMicCheck(); return; }
      if (!isRecording) {
        mediaRecorder.start();
        isRecording = true;
        recordBtn.classList.add('recording');
        actionText.innerText = 'Recording Ghosty...';
      } else {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.classList.remove('recording');
        actionText.innerText = 'Processing...';
      }
    });

    function processAudio(blob) {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        
        // ---------------------------------------------------------
        // PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
        // ---------------------------------------------------------
        const GOOGLE_WEB_APP_URL = "YOUR_GOOGLE_WEB_APP_URL_HERE"; 

        const formData = new URLSearchParams();
        formData.append('audioData', base64data);
        formData.append('context', selectedContext);

        fetch(GOOGLE_WEB_APP_URL, {
          method: 'POST',
          body: formData
        })
        .then(response => response.text())
        .then(result => {
          actionText.innerText = 'Saved to Vault! Ready for next meow.';
          setTimeout(() => { actionText.innerText = 'Tap to Listen'; }, 3000);
        })
        .catch(error => {
          actionText.innerText = 'Upload failed. Check connection.';
        });
      };
    }

    window.onload = initMicCheck;
  </script>
</body>
</html>
