/**
 * COGNO SOLUTION - Text-to-Speech Module
 * Provides accessible reading support with word highlighting
 */

// =========================================================
// TTS ENGINE CLASS
// =========================================================

class TTSEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentWord = null;
        this.currentCharIndex = 0;
        this.options = {
            rate: 0.9,      // 0.1 to 10
            pitch: 1,       // 0 to 2
            volume: 1,      // 0 to 1
            voice: null     // SpeechSynthesisVoice
        };
        this.highlightCallback = null;
        this.endCallback = null;
        
        // Get available voices
        this.voices = [];
        this.loadVoices();
        
        // Chrome requires this event listener
        this.synth.onvoiceschanged = () => this.loadVoices();
    }

    /**
     * Load available voices
     */
    loadVoices() {
        this.voices = this.synth.getVoices();
        
        // Try to set a good default voice
        const preferredVoices = [
            'Google US English',
            'Microsoft David - English (United States)',
            'Samantha',
            'Alex'
        ];
        
        for (const preferred of preferredVoices) {
            const voice = this.voices.find(v => v.name === preferred);
            if (voice) {
                this.options.voice = voice;
                break;
            }
        }
        
        // Fallback to first English voice
        if (!this.options.voice) {
            this.options.voice = this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
        }
    }

    /**
     * Get available voices
     * @returns {Array} Available voices
     */
    getVoices() {
        return this.voices.filter(v => v.lang.startsWith('en'));
    }

    /**
     * Set voice by name
     * @param {string} voiceName - Voice name
     */
    setVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.options.voice = voice;
        }
    }

    /**
     * Set speech rate
     * @param {number} rate - Rate (0.5 to 2)
     */
    setRate(rate) {
        this.options.rate = Math.max(0.5, Math.min(2, rate));
    }

    /**
     * Set pitch
     * @param {number} pitch - Pitch (0 to 2)
     */
    setPitch(pitch) {
        this.options.pitch = Math.max(0, Math.min(2, pitch));
    }

    /**
     * Set volume
     * @param {number} volume - Volume (0 to 1)
     */
    setVolume(volume) {
        this.options.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Set highlight callback for word tracking
     * @param {Function} callback - Callback(word, charIndex)
     */
    onHighlight(callback) {
        this.highlightCallback = callback;
    }

    /**
     * Set end callback
     * @param {Function} callback - Callback when speech ends
     */
    onEnd(callback) {
        this.endCallback = callback;
    }

    /**
     * Speak text
     * @param {string} text - Text to speak
     * @returns {Promise} Resolves when speech ends
     */
    speak(text) {
        return new Promise((resolve, reject) => {
            if (!text || text.trim() === '') {
                resolve();
                return;
            }

            // Cancel any ongoing speech
            this.stop();

            // Create utterance
            this.utterance = new SpeechSynthesisUtterance(text);
            this.utterance.voice = this.options.voice;
            this.utterance.rate = this.options.rate;
            this.utterance.pitch = this.options.pitch;
            this.utterance.volume = this.options.volume;

            // Word boundary event
            this.utterance.onboundary = (event) => {
                if (event.name === 'word') {
                    this.currentCharIndex = event.charIndex;
                    this.currentWord = text.substring(event.charIndex).split(/\s/)[0];
                    
                    if (this.highlightCallback) {
                        this.highlightCallback(this.currentWord, event.charIndex);
                    }
                }
            };

            // Event handlers
            this.utterance.onstart = () => {
                this.isPlaying = true;
                this.isPaused = false;
            };

            this.utterance.onend = () => {
                this.isPlaying = false;
                this.isPaused = false;
                this.currentWord = null;
                this.currentCharIndex = 0;
                
                if (this.endCallback) {
                    this.endCallback();
                }
                
                resolve();
            };

            this.utterance.onerror = (event) => {
                this.isPlaying = false;
                this.isPaused = false;
                
                if (event.error !== 'interrupted' && event.error !== 'canceled') {
                    reject(new Error(event.error));
                } else {
                    resolve();
                }
            };

            // Speak
            this.synth.speak(this.utterance);
        });
    }

    /**
     * Pause speech
     */
    pause() {
        if (this.isPlaying && !this.isPaused) {
            this.synth.pause();
            this.isPaused = true;
        }
    }

    /**
     * Resume speech
     */
    resume() {
        if (this.isPaused) {
            this.synth.resume();
            this.isPaused = false;
        }
    }

    /**
     * Stop speech
     */
    stop() {
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        this.currentWord = null;
        this.currentCharIndex = 0;
    }

    /**
     * Toggle play/pause
     */
    toggle() {
        if (this.isPaused) {
            this.resume();
        } else if (this.isPlaying) {
            this.pause();
        }
    }

    /**
     * Check if TTS is supported
     */
    static isSupported() {
        return 'speechSynthesis' in window;
    }
}

// =========================================================
// TTS READER COMPONENT
// Manages reading of HTML content with highlighting
// =========================================================

class TTSReader {
    constructor(containerElement, options = {}) {
        this.container = containerElement;
        this.engine = new TTSEngine();
        this.textNodes = [];
        this.currentIndex = 0;
        this.highlightedElement = null;
        
        this.options = {
            highlightClass: 'tts-word-highlight',
            sentenceHighlightClass: 'tts-highlight',
            autoScroll: true,
            ...options
        };

        // Setup callbacks
        this.engine.onHighlight((word, charIndex) => {
            this.highlightWord(charIndex);
        });

        this.engine.onEnd(() => {
            this.clearHighlight();
            this.currentIndex++;
            this.readNext();
        });
    }

    /**
     * Prepare text for reading
     */
    prepare() {
        // Get all text content
        const walker = document.createTreeWalker(
            this.container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        this.textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (text) {
                this.textNodes.push({
                    node,
                    text,
                    parent: node.parentElement
                });
            }
        }

        this.currentIndex = 0;
    }

    /**
     * Start reading
     */
    async start() {
        this.prepare();
        this.currentIndex = 0;
        await this.readNext();
    }

    /**
     * Read next text node
     */
    async readNext() {
        if (this.currentIndex >= this.textNodes.length) {
            this.stop();
            return;
        }

        const { text, parent } = this.textNodes[this.currentIndex];
        
        // Add sentence highlight
        parent.classList.add(this.options.sentenceHighlightClass);
        
        // Scroll into view if needed
        if (this.options.autoScroll) {
            parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        await this.engine.speak(text);
        
        // Remove sentence highlight
        parent.classList.remove(this.options.sentenceHighlightClass);
    }

    /**
     * Highlight current word
     */
    highlightWord(charIndex) {
        this.clearHighlight();

        const { node, text, parent } = this.textNodes[this.currentIndex];
        
        // Find word boundaries
        const beforeText = text.substring(0, charIndex);
        const wordMatch = text.substring(charIndex).match(/^\S+/);
        const word = wordMatch ? wordMatch[0] : '';
        const afterText = text.substring(charIndex + word.length);

        // Create highlighted element
        const wrapper = document.createElement('span');
        wrapper.innerHTML = `${this.escapeHtml(beforeText)}<span class="${this.options.highlightClass}">${this.escapeHtml(word)}</span>${this.escapeHtml(afterText)}`;

        // Replace text node with wrapper
        node.parentNode.replaceChild(wrapper, node);
        this.highlightedElement = wrapper;

        // Store original node for restoration
        this.textNodes[this.currentIndex].replaced = { wrapper, originalNode: node };
    }

    /**
     * Clear current highlight
     */
    clearHighlight() {
        const current = this.textNodes[this.currentIndex];
        if (current && current.replaced) {
            const { wrapper, originalNode } = current.replaced;
            if (wrapper.parentNode) {
                wrapper.parentNode.replaceChild(originalNode, wrapper);
            }
            delete current.replaced;
        }
        this.highlightedElement = null;
    }

    /**
     * Escape HTML entities
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Pause reading
     */
    pause() {
        this.engine.pause();
    }

    /**
     * Resume reading
     */
    resume() {
        this.engine.resume();
    }

    /**
     * Stop reading
     */
    stop() {
        this.engine.stop();
        this.clearHighlight();
        
        // Remove all sentence highlights
        this.textNodes.forEach(({ parent }) => {
            parent.classList.remove(this.options.sentenceHighlightClass);
        });
    }

    /**
     * Toggle play/pause
     */
    toggle() {
        if (!this.engine.isPlaying && !this.engine.isPaused) {
            this.start();
        } else {
            this.engine.toggle();
        }
    }

    /**
     * Get playback status
     */
    getStatus() {
        return {
            isPlaying: this.engine.isPlaying,
            isPaused: this.engine.isPaused,
            progress: this.textNodes.length > 0 
                ? (this.currentIndex / this.textNodes.length) * 100 
                : 0
        };
    }

    /**
     * Set reading speed
     */
    setSpeed(rate) {
        this.engine.setRate(rate);
    }

    /**
     * Set voice
     */
    setVoice(voiceName) {
        this.engine.setVoice(voiceName);
    }

    /**
     * Get available voices
     */
    getVoices() {
        return this.engine.getVoices();
    }
}

// =========================================================
// TTS CONTROLS COMPONENT
// UI controls for TTS
// =========================================================

class TTSControls {
    constructor(reader, containerSelector) {
        this.reader = reader;
        this.container = document.querySelector(containerSelector);
        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="tts-controls">
                <button class="tts-btn tts-play-btn" aria-label="Play">
                    <i class="fa-solid fa-play"></i>
                </button>
                <button class="tts-btn tts-pause-btn hidden" aria-label="Pause">
                    <i class="fa-solid fa-pause"></i>
                </button>
                <button class="tts-btn tts-stop-btn" aria-label="Stop">
                    <i class="fa-solid fa-stop"></i>
                </button>
                <div class="tts-speed-control">
                    <label class="tts-speed-label">Speed</label>
                    <input type="range" class="tts-speed-slider" min="0.5" max="2" step="0.1" value="0.9">
                    <span class="tts-speed-value">0.9x</span>
                </div>
                <select class="tts-voice-select form-select" style="width: auto; min-height: auto;">
                    <option value="">Default Voice</option>
                </select>
            </div>
        `;

        // Populate voice selector
        const voiceSelect = this.container.querySelector('.tts-voice-select');
        const voices = this.reader.getVoices();
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = voice.name;
            voiceSelect.appendChild(option);
        });
    }

    bindEvents() {
        const playBtn = this.container.querySelector('.tts-play-btn');
        const pauseBtn = this.container.querySelector('.tts-pause-btn');
        const stopBtn = this.container.querySelector('.tts-stop-btn');
        const speedSlider = this.container.querySelector('.tts-speed-slider');
        const speedValue = this.container.querySelector('.tts-speed-value');
        const voiceSelect = this.container.querySelector('.tts-voice-select');

        playBtn.addEventListener('click', () => {
            this.reader.toggle();
            this.updateButtons();
        });

        pauseBtn.addEventListener('click', () => {
            this.reader.pause();
            this.updateButtons();
        });

        stopBtn.addEventListener('click', () => {
            this.reader.stop();
            this.updateButtons();
        });

        speedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.reader.setSpeed(speed);
            speedValue.textContent = `${speed}x`;
        });

        voiceSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.reader.setVoice(e.target.value);
            }
        });

        // Poll for status updates
        setInterval(() => this.updateButtons(), 200);
    }

    updateButtons() {
        const { isPlaying, isPaused } = this.reader.getStatus();
        const playBtn = this.container.querySelector('.tts-play-btn');
        const pauseBtn = this.container.querySelector('.tts-pause-btn');

        if (isPlaying && !isPaused) {
            playBtn.classList.add('hidden');
            pauseBtn.classList.remove('hidden');
        } else {
            playBtn.classList.remove('hidden');
            pauseBtn.classList.add('hidden');
        }
    }
}

// =========================================================
// SIMPLE TTS FUNCTION
// For quick text-to-speech without reader component
// =========================================================

let simpleEngine = null;

function speak(text, options = {}) {
    if (!simpleEngine) {
        simpleEngine = new TTSEngine();
    }

    if (options.rate) simpleEngine.setRate(options.rate);
    if (options.pitch) simpleEngine.setPitch(options.pitch);
    if (options.voice) simpleEngine.setVoice(options.voice);

    return simpleEngine.speak(text);
}

function stopSpeaking() {
    if (simpleEngine) {
        simpleEngine.stop();
    }
}

function pauseSpeaking() {
    if (simpleEngine) {
        simpleEngine.pause();
    }
}

function resumeSpeaking() {
    if (simpleEngine) {
        simpleEngine.resume();
    }
}

function cancelSpeaking() {
    if (simpleEngine) {
        simpleEngine.stop();
    }
}

function isSpeaking() {
    return simpleEngine ? simpleEngine.isPlaying : false;
}

function isPaused() {
    return simpleEngine ? simpleEngine.isPaused : false;
}

// =========================================================
// EXPORT
// =========================================================

window.CognoTTS = {
    Engine: TTSEngine,
    Reader: TTSReader,
    Controls: TTSControls,
    speak,
    stopSpeaking,
    pause: pauseSpeaking,
    resume: resumeSpeaking,
    cancel: cancelSpeaking,
    isSpeaking,
    isPaused,
    isSupported: TTSEngine.isSupported
};

// Log initialization
console.log('🔊 Cogno TTS initialized');
