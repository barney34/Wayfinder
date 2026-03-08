"""Audio processing service for meeting transcription."""

import os
import tempfile
import logging
from typing import List, Tuple, Dict, Any, Optional
from pathlib import Path

import whisper
import librosa
import numpy as np
from pydub import AudioSegment
from scipy.signal import find_peaks
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


class AudioProcessor:
    """Service for processing audio files and extracting speech segments."""
    
    def __init__(self):
        """Initialize audio processor with models."""
        self.whisper_model = None
        self.sample_rate = 16000
        
    def _load_whisper_model(self) -> whisper.Whisper:
        """Load Whisper model on demand."""
        if self.whisper_model is None:
            model_size = os.environ.get("WHISPER_MODEL", "base")
            logger.info(f"Loading Whisper model: {model_size}")
            self.whisper_model = whisper.load_model(model_size)
        return self.whisper_model
    
    def convert_audio_format(self, input_path: str, output_path: str) -> str:
        """Convert audio to WAV format for processing."""
        try:
            audio = AudioSegment.from_file(input_path)
            audio = audio.set_frame_rate(self.sample_rate)
            audio = audio.set_channels(1)
            audio.export(output_path, format="wav")
            return output_path
        except Exception as e:
            logger.error(f"Audio conversion failed: {e}")
            raise
    
    def transcribe_audio(self, audio_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        """Transcribe audio using Whisper."""
        try:
            model = self._load_whisper_model()
            
            options = {
                "task": "transcribe",
                "language": language,
                "fp16": False,
                "verbose": False
            }
            
            result = model.transcribe(audio_path, **options)
            return result
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise
    
    def extract_audio_features(self, audio_path: str) -> Tuple[np.ndarray, float]:
        """Extract audio features for speaker diarization."""
        try:
            y, sr = librosa.load(audio_path, sr=self.sample_rate)
            
            # Extract MFCC features
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            
            # Extract spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
            zero_crossing_rate = librosa.feature.zero_crossing_rate(y)
            
            # Combine features
            features = np.vstack([
                mfcc,
                spectral_centroids,
                spectral_rolloff,
                spectral_bandwidth,
                zero_crossing_rate
            ])
            
            return features, sr
        except Exception as e:
            logger.error(f"Feature extraction failed: {e}")
            raise
    
    def detect_speaker_changes(self, audio_path: str, min_segment_length: float = 2.0) -> List[float]:
        """Detect speaker change points in audio."""
        try:
            features, sr = self.extract_audio_features(audio_path)
            
            # Compute energy-based speaker change detection
            energy = librosa.feature.rms(y=librosa.load(audio_path, sr=sr)[0])[0]
            
            # Find peaks in energy changes
            energy_diff = np.diff(energy)
            peaks, _ = find_peaks(np.abs(energy_diff), height=np.std(energy_diff))
            
            # Convert sample indices to time
            change_points = librosa.samples_to_time(peaks, sr=sr)
            
            # Filter by minimum segment length
            filtered_points = []
            last_time = 0
            
            for point in change_points:
                if point - last_time >= min_segment_length:
                    filtered_points.append(point)
                    last_time = point
            
            return filtered_points
        except Exception as e:
            logger.error(f"Speaker change detection failed: {e}")
            return []
    
    def cluster_speakers(self, audio_path: str, change_points: List[float], 
                       num_speakers: Optional[int] = None) -> Dict[int, int]:
        """Cluster audio segments by speaker."""
        try:
            features, sr = self.extract_audio_features(audio_path)
            
            # Extract features for each segment
            segment_features = []
            
            for i in range(len(change_points) + 1):
                start_time = change_points[i-1] if i > 0 else 0
                end_time = change_points[i] if i < len(change_points) else None
                
                start_sample = int(start_time * sr)
                end_sample = int(end_time * sr) if end_time else len(features[0])
                
                # Average features for this segment
                segment_feat = np.mean(features[:, start_sample:end_sample], axis=1)
                segment_features.append(segment_feat)
            
            segment_features = np.array(segment_features)
            
            # Determine number of speakers if not provided
            if num_speakers is None:
                num_speakers = min(10, max(2, len(segment_features) // 3))
            
            # Cluster segments
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(segment_features)
            
            kmeans = KMeans(n_clusters=num_speakers, random_state=42)
            speaker_labels = kmeans.fit_predict(features_scaled)
            
            # Map segment to speaker
            segment_to_speaker = {i: int(label) for i, label in enumerate(speaker_labels)}
            
            return segment_to_speaker
        except Exception as e:
            logger.error(f"Speaker clustering failed: {e}")
            return {}
    
    def process_audio_file(self, audio_path: str, language: Optional[str] = None,
                          known_speakers: Optional[List[str]] = None) -> Dict[str, Any]:
        """Process audio file and return transcription with speaker diarization."""
        try:
            # Convert audio if needed
            if not audio_path.endswith('.wav'):
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                    audio_path = self.convert_audio_format(audio_path, tmp.name)
            
            # Get transcription
            transcription_result = self.transcribe_audio(audio_path, language)
            
            # Detect speaker changes
            change_points = self.detect_speaker_changes(audio_path)
            
            # Cluster speakers
            num_speakers = len(known_speakers) if known_speakers else None
            segment_to_speaker = self.cluster_speakers(audio_path, change_points, num_speakers)
            
            # Create speaker segments
            segments = []
            current_time = 0
            
            for i, segment in enumerate(transcription_result["segments"]):
                speaker_id = f"speaker_{segment_to_speaker.get(i, 0)}"
                speaker_name = None
                
                if known_speakers and segment_to_speaker.get(i, 0) < len(known_speakers):
                    speaker_name = known_speakers[segment_to_speaker.get(i, 0)]
                
                segments.append({
                    "speaker_id": speaker_id,
                    "speaker_name": speaker_name,
                    "start_time": segment["start"],
                    "end_time": segment["end"],
                    "text": segment["text"].strip(),
                    "confidence": segment.get("avg_logprob", 0.0)
                })
            
            # Calculate duration
            audio_info = librosa.get_duration(filename=audio_path)
            duration = audio_info if isinstance(audio_info, float) else audio_info[0]
            
            return {
                "segments": segments,
                "duration": duration,
                "language": transcription_result.get("language"),
                "num_speakers": len(set(segment_to_speaker.values())) if segment_to_speaker else 1
            }
            
        except Exception as e:
            logger.error(f"Audio processing failed: {e}")
            raise
        finally:
            # Clean up temporary files
            if audio_path.startswith('/tmp/'):
                try:
                    os.unlink(audio_path)
                except:
                    pass
