export interface AudioRecorderOptions {
  onAudioAvailable: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: 'idle' | 'recording' | 'paused' | 'stopped') => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private timerInterval: NodeJS.Timeout | null = null;
  private options: AudioRecorderOptions;
  private status: 'idle' | 'recording' | 'paused' | 'stopped' = 'idle';

  constructor(options: AudioRecorderOptions) {
    this.options = options;
  }

  async startRecording(): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      // Setup event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };

      this.mediaRecorder.onerror = (event) => {
        const error = new Error('MediaRecorder error');
        this.options.onError?.(error);
      };

      // Start recording
      this.audioChunks = [];
      this.mediaRecorder.start(1000); // Collect data every second
      this.startTime = Date.now();
      this.status = 'recording';
      this.options.onStatusChange?.(this.status);

      // Start timer
      this.startTimer();

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to start recording');
      this.options.onError?.(err);
    }
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.status === 'recording') {
      this.mediaRecorder.pause();
      this.status = 'paused';
      this.options.onStatusChange?.(this.status);
      this.stopTimer();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.status === 'paused') {
      this.mediaRecorder.resume();
      this.status = 'recording';
      this.options.onStatusChange?.(this.status);
      this.startTimer();
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && (this.status === 'recording' || this.status === 'paused')) {
      this.mediaRecorder.stop();
      this.status = 'stopped';
      this.options.onStatusChange?.(this.status);
      this.stopTimer();
      
      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
    }
  }

  private processRecording(): void {
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
    this.options.onAudioAvailable(audioBlob);
    this.status = 'idle';
    this.options.onStatusChange?.(this.status);
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      const currentTime = (Date.now() - this.startTime) / 1000;
      this.options.onTimeUpdate?.(currentTime);
    }, 100);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getStatus(): string {
    return this.status;
  }

  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && MediaRecorder.isTypeSupported('audio/webm;codecs=opus'));
  }
}

// Utility function to convert audio blob to WAV format
export async function convertToWAV(audioBlob: Blob): Promise<Blob> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const sampleRate = 16000; // Target sample rate for speech recognition
  const channels = 1; // Mono
  const length = Math.floor(audioBuffer.duration * sampleRate);
  
  const offlineContext = new OfflineAudioContext(channels, length, sampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  
  // Convert to mono if needed
  if (audioBuffer.numberOfChannels > 1) {
    const merger = offlineContext.createChannelMerger(channels);
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      const channelSource = offlineContext.createBufferSource();
      channelSource.buffer = audioBuffer;
      channelSource.connect(merger, 0, i);
    }
    merger.connect(offlineContext.destination);
  } else {
    source.connect(offlineContext.destination);
  }
  
  source.start(0);
  const renderedBuffer = await offlineContext.startRendering();

  // Convert to WAV
  const wav = audioBufferToWav(renderedBuffer);
  return new Blob([wav], { type: 'audio/wav' });
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length * numberOfChannels * 2 + 44;
  const outputBuffer = new ArrayBuffer(length);
  const view = new DataView(outputBuffer);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // RIFF identifier
  setUint32(0x46464952);
  // file length
  setUint32(length - 8);
  // WAVE identifier
  setUint32(0x45564157);
  // fmt chunk identifier
  setUint32(0x20746d66);
  // chunk length
  setUint32(16);
  // sample format (PCM)
  setUint16(1);
  // channel count
  setUint16(numberOfChannels);
  // sample rate
  setUint32(buffer.sampleRate);
  // byte rate
  setUint32(buffer.sampleRate * numberOfChannels * 2);
  // block align
  setUint16(numberOfChannels * 2);
  // bits per sample
  setUint16(16);
  // data chunk identifier
  setUint32(0x61746164);
  // data chunk length
  setUint32(length - pos - 4);

  // Write interleaved data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numberOfChannels; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return outputBuffer;
}
