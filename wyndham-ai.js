/**
 * Wyndham AI - Voice Assistant Widget
 * For Wyndham Financial Group
 */

// Configuration - UPDATE THIS with your backend URL
const WYNDHAM_AI_WS_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:5013'  // Local development
    : 'wss://wyndham.devshubh.me';  // Production backend URL

// State
let wyndhamWs = null;
let wyndhamAudioContext = null;
let wyndhamMicrophone = null;
let wyndhamProcessor = null;
let wyndhamIsConnected = false;
let wyndhamIsListening = false;
let wyndhamAudioQueue = [];
let wyndhamIsPlaying = false;

// Audio visualization
let wyndhamVisualizerContext = null;
let wyndhamAnalyser = null;
let wyndhamDataArray = null;
let wyndhamBufferLength = null;

// Mute state
let wyndhamIsMuted = false;

// Mobile-optimized audio playback
let wyndhamPlaybackContext = null;
let wyndhamNextPlayTime = 0;
let wyndhamScheduledSources = [];
let wyndhamAudioBufferQueue = [];
let wyndhamIsScheduling = false;

// Detect mobile device
const wyndhamIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// DOM Elements (will be set after widget is added to page)
let wyndhamWidgetPanel, wyndhamWidgetText, wyndhamMuteBtn, wyndhamEndBtn, wyndhamOrb, wyndhamVisualizer;

// Create and inject the widget HTML
function createWyndhamAIWidget() {
    const widgetHTML = `
    <div class="wyndham-ai-widget" id="wyndhamAIWidget">
        <div class="wyndham-widget-panel" id="wyndhamWidgetPanel">
            <!-- Visualizer -->
            <div class="wyndham-visualizer-container">
                <canvas id="wyndhamVisualizer" width="50" height="50"></canvas>
                <div class="wyndham-orb" id="wyndhamOrb">
                    <div class="wyndham-orb-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="wyndham-widget-content">
                <div class="wyndham-widget-text" id="wyndhamWidgetText">
                    Talk to <span>Wyndham AI</span>
                </div>
                
                <!-- Mute Button -->
                <button class="wyndham-mute-btn" id="wyndhamMuteBtn" style="display: none;" title="Mute microphone">
                    <svg class="mic-on" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                    <svg class="mic-off" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                </button>
                
                <!-- End Button -->
                <button class="wyndham-end-btn" id="wyndhamEndBtn" style="display: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span>End</span>
                </button>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', widgetHTML);
    
    // Get DOM elements
    wyndhamWidgetPanel = document.getElementById('wyndhamWidgetPanel');
    wyndhamWidgetText = document.getElementById('wyndhamWidgetText');
    wyndhamMuteBtn = document.getElementById('wyndhamMuteBtn');
    wyndhamEndBtn = document.getElementById('wyndhamEndBtn');
    wyndhamOrb = document.getElementById('wyndhamOrb');
    wyndhamVisualizer = document.getElementById('wyndhamVisualizer');
}

// Initialize
function initWyndhamAI() {
    createWyndhamAIWidget();
    setupWyndhamVisualizerCanvas();
    setupWyndhamEventListeners();
}

function setupWyndhamVisualizerCanvas() {
    wyndhamVisualizer.width = 50;
    wyndhamVisualizer.height = 50;
    wyndhamVisualizerContext = wyndhamVisualizer.getContext('2d');
}

function setupWyndhamEventListeners() {
    wyndhamWidgetPanel.addEventListener('click', handleWyndhamWidgetClick);
    wyndhamMuteBtn.addEventListener('click', handleWyndhamMuteToggle);
    wyndhamEndBtn.addEventListener('click', handleWyndhamEndClick);
}

// Widget Controls
async function handleWyndhamWidgetClick(e) {
    if (e.target.closest('.wyndham-end-btn') || e.target.closest('.wyndham-mute-btn')) {
        return;
    }
    
    if (!wyndhamIsConnected) {
        await handleWyndhamStartClick();
    }
}

function handleWyndhamMuteToggle(e) {
    e.stopPropagation();
    
    wyndhamIsMuted = !wyndhamIsMuted;
    
    const micOnIcon = wyndhamMuteBtn.querySelector('.mic-on');
    const micOffIcon = wyndhamMuteBtn.querySelector('.mic-off');
    
    if (wyndhamIsMuted) {
        micOnIcon.style.display = 'none';
        micOffIcon.style.display = 'block';
        wyndhamMuteBtn.classList.add('muted');
        wyndhamMuteBtn.title = 'Unmute microphone';
    } else {
        micOnIcon.style.display = 'block';
        micOffIcon.style.display = 'none';
        wyndhamMuteBtn.classList.remove('muted');
        wyndhamMuteBtn.title = 'Mute microphone';
    }
}

// WebSocket Connection
async function connectToWyndhamBackend() {
    return new Promise((resolve, reject) => {
        try {
            wyndhamWs = new WebSocket(WYNDHAM_AI_WS_URL);

            wyndhamWs.onopen = () => {
                console.log('Connected to Wyndham AI');
                updateWyndhamStatus('Connected', 'connected');
                wyndhamIsConnected = true;
                resolve();
            };

            wyndhamWs.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                handleWyndhamBackendMessage(message);
            };

            wyndhamWs.onerror = (error) => {
                console.error('Wyndham AI WebSocket error:', error);
                updateWyndhamStatus('Connection Error', 'error');
                reject(error);
            };

            wyndhamWs.onclose = () => {
                console.log('Disconnected from Wyndham AI');
                wyndhamIsConnected = false;
                wyndhamIsListening = false;
                updateWyndhamStatus('Disconnected', 'error');
                stopWyndhamMicrophone();
            };
        } catch (error) {
            reject(error);
        }
    });
}

function handleWyndhamBackendMessage(message) {
    switch (message.type) {
        case 'status':
            if (message.status === 'connected') {
                updateWyndhamStatus('Ready', 'connected');
            }
            break;

        case 'gemini_message':
            handleWyndhamGeminiMessage(message.data);
            break;

        case 'error':
            console.error('Wyndham AI error:', message.error);
            updateWyndhamStatus('Error', 'error');
            break;
    }
}

function handleWyndhamGeminiMessage(data) {
    if (data.data) {
        addWyndhamAudioToQueue(data.data);
    }

    if (data.serverContent) {
        if (data.serverContent.interrupted) {
            stopWyndhamAudioPlayback();
            updateWyndhamStatus('Listening...');
        }

        if (data.serverContent.turnComplete) {
            wyndhamOrb.classList.remove('speaking');
            wyndhamOrb.classList.add('listening');
        }
    }
}

// Microphone Setup
async function startWyndhamMicrophone() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Browser does not support microphone access. Please use Chrome or Firefox with HTTPS.');
        }

        wyndhamAudioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000
        });

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true
            }
        });

        wyndhamMicrophone = wyndhamAudioContext.createMediaStreamSource(stream);
        
        wyndhamAnalyser = wyndhamAudioContext.createAnalyser();
        wyndhamAnalyser.fftSize = 256;
        wyndhamBufferLength = wyndhamAnalyser.frequencyBinCount;
        wyndhamDataArray = new Uint8Array(wyndhamBufferLength);
        wyndhamMicrophone.connect(wyndhamAnalyser);

        wyndhamProcessor = wyndhamAudioContext.createScriptProcessor(4096, 1, 1);
        wyndhamMicrophone.connect(wyndhamProcessor);
        wyndhamProcessor.connect(wyndhamAudioContext.destination);

        wyndhamProcessor.onaudioprocess = (e) => {
            if (!wyndhamIsListening || !wyndhamWs || wyndhamWs.readyState !== WebSocket.OPEN || wyndhamIsMuted) return;

            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = convertWyndhamToPCM16(inputData);
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData)));

            wyndhamWs.send(JSON.stringify({
                type: 'audio',
                data: base64Audio
            }));
        };

        wyndhamIsListening = true;
        startWyndhamVisualization();
        updateWyndhamStatus('Listening...', 'listening');
        wyndhamOrb.classList.add('listening');

    } catch (error) {
        console.error('Microphone error:', error);
        updateWyndhamStatus('Mic Error', 'error');
    }
}

function stopWyndhamMicrophone() {
    if (wyndhamProcessor) {
        wyndhamProcessor.disconnect();
        wyndhamProcessor = null;
    }
    if (wyndhamMicrophone) {
        wyndhamMicrophone.disconnect();
        wyndhamMicrophone.mediaStream.getTracks().forEach(track => track.stop());
        wyndhamMicrophone = null;
    }
    if (wyndhamAudioContext) {
        wyndhamAudioContext.close();
        wyndhamAudioContext = null;
    }
    wyndhamIsListening = false;
    wyndhamOrb.classList.remove('listening', 'speaking');
}

// Audio Conversion
function convertWyndhamToPCM16(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}

// Audio Playback - Mobile Optimized with Seamless Streaming
function addWyndhamAudioToQueue(base64Audio) {
    wyndhamAudioQueue.push(base64Audio);
    if (!wyndhamIsPlaying) {
        processWyndhamAudioQueue();
    }
}

// Initialize persistent playback context (called on user gesture/start)
async function initWyndhamPlaybackContext() {
    if (!wyndhamPlaybackContext || wyndhamPlaybackContext.state === 'closed') {
        wyndhamPlaybackContext = new (window.AudioContext || window.webkitAudioContext)({ 
            sampleRate: 24000,
            latencyHint: wyndhamIsMobile ? 'playback' : 'interactive'
        });
        // Reset the play time when creating new context
        wyndhamNextPlayTime = 0;
    }
    
    // Resume if suspended (required for mobile browsers after user gesture)
    if (wyndhamPlaybackContext.state === 'suspended') {
        await wyndhamPlaybackContext.resume();
    }
    
    return wyndhamPlaybackContext;
}

async function processWyndhamAudioQueue() {
    if (wyndhamAudioQueue.length === 0) {
        // Check if there's still scheduled audio playing
        if (wyndhamScheduledSources.length > 0 && wyndhamPlaybackContext) {
            const currentTime = wyndhamPlaybackContext.currentTime;
            const hasActiveAudio = wyndhamScheduledSources.some(item => item.endTime > currentTime);
            if (hasActiveAudio) {
                setTimeout(() => processWyndhamAudioQueue(), 100);
                return;
            }
        }
        wyndhamIsPlaying = false;
        wyndhamOrb.classList.remove('speaking');
        wyndhamOrb.classList.add('listening');
        updateWyndhamStatus('Listening...');
        return;
    }

    wyndhamIsPlaying = true;
    wyndhamOrb.classList.remove('listening');
    wyndhamOrb.classList.add('speaking');
    updateWyndhamStatus('Speaking...');

    // Ensure playback context is initialized and resumed
    await initWyndhamPlaybackContext();

    // Process ONE audio chunk at a time, then schedule next check
    const base64Audio = wyndhamAudioQueue.shift();
    
    try {
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Create audio buffer from PCM16 data
        const audioBuffer = wyndhamPlaybackContext.createBuffer(1, bytes.length / 2, 24000);
        const channelData = audioBuffer.getChannelData(0);

        const dataView = new DataView(bytes.buffer);
        for (let i = 0; i < channelData.length; i++) {
            const int16 = dataView.getInt16(i * 2, true);
            channelData[i] = int16 / 32768.0;
        }

        // Schedule this buffer to play after the previous one finishes
        scheduleWyndhamAudioBuffer(audioBuffer);
    } catch (error) {
        console.error('Audio decode error:', error);
    }
    
    // Continue processing queue
    setTimeout(() => processWyndhamAudioQueue(), 20);
}

function scheduleWyndhamAudioBuffer(audioBuffer) {
    if (!wyndhamPlaybackContext || wyndhamPlaybackContext.state === 'closed') return;
    
    const source = wyndhamPlaybackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(wyndhamPlaybackContext.destination);
    
    const currentTime = wyndhamPlaybackContext.currentTime;
    
    // IMPORTANT: Schedule audio sequentially, not overlapping
    // If nextPlayTime is in the past or not set, start from now with small buffer
    if (wyndhamNextPlayTime <= currentTime) {
        wyndhamNextPlayTime = currentTime + 0.05; // 50ms buffer for mobile
    }
    
    const scheduleTime = wyndhamNextPlayTime;
    
    try {
        source.start(scheduleTime);
    } catch (e) {
        console.error('Audio start error:', e);
        return;
    }
    
    // Calculate when this buffer will END
    const endTime = scheduleTime + audioBuffer.duration;
    
    // Track scheduled source for cleanup
    wyndhamScheduledSources.push({
        source: source,
        endTime: endTime
    });
    
    // IMPORTANT: Next audio should start AFTER this one ends (with tiny gap for mobile)
    wyndhamNextPlayTime = endTime + (wyndhamIsMobile ? 0.01 : 0.005);
    
    // Clean up old finished sources
    wyndhamScheduledSources = wyndhamScheduledSources.filter(item => item.endTime > currentTime);
}

function stopWyndhamAudioPlayback() {
    wyndhamAudioQueue = [];
    wyndhamIsPlaying = false;
    
    // Stop all scheduled sources
    wyndhamScheduledSources.forEach(item => {
        try {
            item.source.stop();
        } catch (e) {
            // Source may already be stopped
        }
    });
    wyndhamScheduledSources = [];
    
    // Reset next play time
    if (wyndhamPlaybackContext) {
        wyndhamNextPlayTime = wyndhamPlaybackContext.currentTime;
    }
}

// Visualization
function startWyndhamVisualization() {
    function draw() {
        if (!wyndhamIsListening) {
            wyndhamVisualizerContext.clearRect(0, 0, wyndhamVisualizer.width, wyndhamVisualizer.height);
            return;
        }

        requestAnimationFrame(draw);
        
        if (wyndhamIsMuted) {
            wyndhamVisualizerContext.clearRect(0, 0, wyndhamVisualizer.width, wyndhamVisualizer.height);
            return;
        }

        wyndhamAnalyser.getByteFrequencyData(wyndhamDataArray);
        wyndhamVisualizerContext.clearRect(0, 0, wyndhamVisualizer.width, wyndhamVisualizer.height);

        const centerX = wyndhamVisualizer.width / 2;
        const centerY = wyndhamVisualizer.height / 2;
        const radius = 22;
        const bars = 20;

        for (let i = 0; i < bars; i++) {
            const angle = (i / bars) * Math.PI * 2;
            const dataIndex = Math.floor((i / bars) * wyndhamBufferLength);
            const height = (wyndhamDataArray[dataIndex] / 255) * 8;

            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + height);
            const y2 = centerY + Math.sin(angle) * (radius + height);

            const gradient = wyndhamVisualizerContext.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, '#e8832a');
            gradient.addColorStop(0.5, '#f5a54a');
            gradient.addColorStop(1, '#d46e1a');

            wyndhamVisualizerContext.strokeStyle = gradient;
            wyndhamVisualizerContext.lineWidth = 2;
            wyndhamVisualizerContext.lineCap = 'round';

            wyndhamVisualizerContext.beginPath();
            wyndhamVisualizerContext.moveTo(x1, y1);
            wyndhamVisualizerContext.lineTo(x2, y2);
            wyndhamVisualizerContext.stroke();
        }
    }

    draw();
}

// UI Updates
function updateWyndhamStatus(text) {
    if (text === 'Listening...' || text === 'Speaking...' || text === 'Connected' || text === 'Ready') {
        wyndhamWidgetText.innerHTML = text;
    } else if (text.includes('Error') || text === 'Disconnected') {
        wyndhamWidgetText.innerHTML = `<span style="color: #ff6b6b;">${text}</span>`;
    } else {
        wyndhamWidgetText.innerHTML = text;
    }
}

// Event Handlers
async function handleWyndhamStartClick() {
    try {
        updateWyndhamStatus('Connecting...');
        wyndhamMuteBtn.style.display = 'none';
        wyndhamEndBtn.style.display = 'none';
        
        // Initialize playback context on user gesture (required for mobile)
        await initWyndhamPlaybackContext();
        
        await connectToWyndhamBackend();
        await startWyndhamMicrophone();
        updateWyndhamStatus('Listening...');
        wyndhamMuteBtn.style.display = 'flex';
        wyndhamEndBtn.style.display = 'flex';
    } catch (error) {
        console.error('Failed to start Wyndham AI:', error);
        updateWyndhamStatus('Error - Try again');
        wyndhamMuteBtn.style.display = 'none';
        wyndhamEndBtn.style.display = 'none';
    }
}

function handleWyndhamEndClick(e) {
    e.stopPropagation();
    
    stopWyndhamMicrophone();
    stopWyndhamAudioPlayback();
    
    if (wyndhamWs) {
        wyndhamWs.close();
    }
    
    // Close playback context on mobile to save resources
    if (wyndhamPlaybackContext && wyndhamPlaybackContext.state !== 'closed') {
        wyndhamPlaybackContext.close();
        wyndhamPlaybackContext = null;
    }

    wyndhamOrb.classList.remove('listening', 'speaking');
    wyndhamWidgetText.innerHTML = 'Talk to <span>Wyndham AI</span>';
    wyndhamMuteBtn.style.display = 'none';
    wyndhamEndBtn.style.display = 'none';
    wyndhamIsConnected = false;
    
    wyndhamIsMuted = false;
    const micOnIcon = wyndhamMuteBtn.querySelector('.mic-on');
    const micOffIcon = wyndhamMuteBtn.querySelector('.mic-off');
    micOnIcon.style.display = 'block';
    micOffIcon.style.display = 'none';
    wyndhamMuteBtn.classList.remove('muted');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWyndhamAI);
} else {
    initWyndhamAI();
}

// Handle page visibility changes (mobile browsers suspend audio when app is backgrounded)
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && wyndhamIsConnected) {
        // Resume audio context when page becomes visible again
        if (wyndhamPlaybackContext && wyndhamPlaybackContext.state === 'suspended') {
            try {
                await wyndhamPlaybackContext.resume();
                console.log('Playback context resumed after visibility change');
            } catch (e) {
                console.error('Failed to resume playback context:', e);
            }
        }
        if (wyndhamAudioContext && wyndhamAudioContext.state === 'suspended') {
            try {
                await wyndhamAudioContext.resume();
                console.log('Audio context resumed after visibility change');
            } catch (e) {
                console.error('Failed to resume audio context:', e);
            }
        }
    }
});
