"""Tests for meeting transcription API."""

import pytest
import tempfile
import os
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime

from backend.server import app
from backend.data.meeting import MeetingTranscription, SpeakerSegment, MeetingMetadata


client = TestClient(app)


@pytest.fixture
def mock_audio_file():
    """Create a mock audio file for testing."""
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        # Write some dummy audio data
        tmp.write(b'RIFF\x24\x08\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x40\x1f\x00\x00\x80\x3e\x00\x00\x02\x00\x10\x00data\x00\x08\x00\x00')
        tmp.flush()
        yield tmp.name
    os.unlink(tmp.name)


@pytest.fixture
def sample_transcription():
    """Sample transcription data for testing."""
    return MeetingTranscription(
        id="test-id",
        metadata=MeetingMetadata(
            title="Test Meeting",
            date=datetime.utcnow(),
            duration=300.0,
            participant_count=2,
            location="Conference Room A",
            meeting_type="planning"
        ),
        segments=[
            SpeakerSegment(
                speaker_id="speaker_0",
                speaker_name="John Doe",
                start_time=0.0,
                end_time=10.0,
                text="Hello everyone, let's start the meeting.",
                confidence=0.95
            ),
            SpeakerSegment(
                speaker_id="speaker_1",
                speaker_name="Jane Smith",
                start_time=10.0,
                end_time=20.0,
                text="Great! I'll go first with the updates.",
                confidence=0.92
            )
        ],
        summary="A productive planning meeting with two participants discussing project updates.",
        action_items=["John to prepare the presentation", "Jane to review the documentation"],
        key_decisions=["Meeting scheduled for next week", "Budget approved for Q1"]
    )


class TestMeetingTranscriptionAPI:
    """Test cases for meeting transcription API endpoints."""

    @patch('backend.services.meeting_transcription.MeetingTranscriptionService.create_transcription')
    def test_create_transcription_success(self, mock_create, mock_audio_file):
        """Test successful transcription creation."""
        # Mock the service response
        mock_create.return_value = "test-transcription-id"
        
        with open(mock_audio_file, 'rb') as audio:
            response = client.post(
                "/api/meetings/transcribe",
                files={"audio_file": ("test.wav", audio, "audio/wav")},
                data={
                    "meeting_title": "Test Meeting",
                    "meeting_type": "planning",
                    "location": "Conference Room A",
                    "speaker_names": '["John Doe", "Jane Smith"]'
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["transcription_id"] == "test-transcription-id"
        assert data["status"] == "completed"
        assert data["progress"] == 100.0

    def test_create_transcription_invalid_file(self):
        """Test transcription creation with invalid file type."""
        response = client.post(
            "/api/meetings/transcribe",
            files={"audio_file": ("test.txt", b"not audio", "text/plain")},
            data={"meeting_title": "Test Meeting"}
        )
        
        assert response.status_code == 400
        assert "File must be an audio file" in response.json()["detail"]

    def test_create_transcription_missing_title(self, mock_audio_file):
        """Test transcription creation without meeting title."""
        with open(mock_audio_file, 'rb') as audio:
            response = client.post(
                "/api/meetings/transcribe",
                files={"audio_file": ("test.wav", audio, "audio/wav")}
            )
        
        assert response.status_code == 422  # Validation error

    @patch('backend.services.meeting_transcription.MeetingTranscriptionService.get_transcription')
    def test_get_transcription_success(self, mock_get, sample_transcription):
        """Test successful transcription retrieval."""
        mock_get.return_value = sample_transcription.model_dump()
        
        response = client.get("/api/meetings/test-id")
        
        assert response.status_code == 200
        data = response.json()
        assert data["metadata"]["title"] == "Test Meeting"
        assert len(data["segments"]) == 2

    @patch('backend.services.meeting_transcription.MeetingTranscriptionService.get_transcription')
    def test_get_transcription_not_found(self, mock_get):
        """Test transcription retrieval when not found."""
        mock_get.return_value = None
        
        response = client.get("/api/meetings/nonexistent-id")
        
        assert response.status_code == 404
        assert "Transcription not found" in response.json()["detail"]

    @patch('backend.services.meeting_transcription.MeetingTranscriptionService.list_transcriptions')
    def test_list_transcriptions_success(self, mock_list):
        """Test successful transcriptions listing."""
        mock_list.return_value = {
            "transcriptions": [],
            "total": 0,
            "limit": 50,
            "offset": 0
        }
        
        response = client.get("/api/meetings/")
        
        assert response.status_code == 200
        data = response.json()
        assert "transcriptions" in data
        assert data["total"] == 0

    @patch('backend.services.meeting_transcription.MeetingTranscriptionService.list_transcriptions')
    def test_list_transcriptions_with_search(self, mock_list):
        """Test transcriptions listing with search query."""
        mock_list.return_value = {
            "transcriptions": [],
            "total": 0,
            "limit": 50,
            "offset": 0
        }
        
        response = client.get("/api/meetings/?search=test&limit=10&offset=5")
        
        assert response.status_code == 200
        mock_list.assert_called_once_with(limit=10, offset=5, search_query="test")

    @patch('backend.services.meeting_transcription.MeetingTranscriptionService.update_speaker_name')
    def test_update_speaker_name_success(self, mock_update):
        """Test successful speaker name update."""
        mock_update.return_value = True
        
        response = client.put("/api/meetings/speakers/speaker_0", json={"name": "John Doe"})
        
        assert response.status_code == 200
        assert "Speaker name updated successfully" in response.json()["message"]

    @patch('backend.services.meeting_transcription.MeetingTranscriptionService.update_speaker_name')
    def test_update_speaker_name_not_found(self, mock_update):
        """Test speaker name update when speaker not found."""
        mock_update.return_value = False
        
        response = client.put("/api/meetings/speakers/nonexistent", json={"name": "John Doe"})
        
        assert response.status_code == 404
        assert "Speaker not found" in response.json()["detail"]

    @patch('backend.services.meeting_transcription.MeetingTranscriptionService.get_speaker_profiles')
    def test_get_speaker_profiles_success(self, mock_get):
        """Test successful speaker profiles retrieval."""
        mock_get.return_value = []
        
        response = client.get("/api/meetings/speakers/")
        
        assert response.status_code == 200
        data = response.json()
        assert "speakers" in data

    @patch('backend.services.meeting_transcription.MeetingTranscriptionService.delete_transcription')
    def test_delete_transcription_success(self, mock_delete):
        """Test successful transcription deletion."""
        mock_delete.return_value = True
        
        response = client.delete("/api/meetings/test-id")
        
        assert response.status_code == 200
        assert "Transcription deleted successfully" in response.json()["message"]

    @patch('backend.services.meeting_transcription.MeetingTranscriptionService.delete_transcription')
    def test_delete_transcription_not_found(self, mock_delete):
        """Test transcription deletion when not found."""
        mock_delete.return_value = False
        
        response = client.delete("/api/meetings/nonexistent-id")
        
        assert response.status_code == 404
        assert "Transcription not found" in response.json()["detail"]


class TestAudioProcessor:
    """Test cases for audio processing service."""

    @patch('backend.services.audio_processor.whisper.load_model')
    def test_load_whisper_model(self, mock_load):
        """Test Whisper model loading."""
        from backend.services.audio_processor import AudioProcessor
        
        processor = AudioProcessor()
        mock_model = Mock()
        mock_load.return_value = mock_model
        
        model = processor._load_whisper_model()
        
        assert model == mock_model
        mock_load.assert_called_once_with("base")

    def test_convert_audio_format(self):
        """Test audio format conversion."""
        from backend.services.audio_processor import AudioProcessor
        from pydub import AudioSegment
        
        processor = AudioProcessor()
        
        # Mock AudioSegment
        with patch('backend.services.audio_processor.AudioSegment') as mock_segment:
            mock_audio = Mock()
            mock_segment.from_file.return_value = mock_audio
            
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                result_path = processor.convert_audio_format('input.mp3', tmp.name)
                assert result_path == tmp.name
                mock_audio.export.assert_called_once()
                os.unlink(tmp.name)

    @patch('backend.services.audio_processor.AudioProcessor._load_whisper_model')
    def test_transcribe_audio(self, mock_load_model):
        """Test audio transcription."""
        from backend.services.audio_processor import AudioProcessor
        
        processor = AudioProcessor()
        mock_model = Mock()
        mock_load_model.return_value = mock_model
        mock_model.transcribe.return_value = {
            "text": "Hello world",
            "segments": [{"start": 0, "end": 2, "text": "Hello world"}],
            "language": "en"
        }
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            result = processor.transcribe_audio(tmp.name)
            assert result["text"] == "Hello world"
            assert result["language"] == "en"
            os.unlink(tmp.name)


if __name__ == "__main__":
    pytest.main([__file__])
