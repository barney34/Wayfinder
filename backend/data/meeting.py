"""Meeting transcription data models."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SpeakerSegment(BaseModel):
    """Individual speaker segment in transcription."""
    
    speaker_id: str = Field(..., description="Speaker identifier")
    speaker_name: Optional[str] = Field(None, description="Speaker display name")
    start_time: float = Field(..., description="Start time in seconds")
    end_time: float = Field(..., description="End time in seconds")
    text: str = Field(..., description="Transcribed text")
    confidence: float = Field(..., description="Confidence score 0-1")


class MeetingMetadata(BaseModel):
    """Meeting metadata information."""
    
    title: str = Field(..., description="Meeting title")
    date: datetime = Field(..., description="Meeting date/time")
    duration: float = Field(..., description="Meeting duration in seconds")
    participant_count: int = Field(..., description="Number of participants")
    location: Optional[str] = Field(None, description="Meeting location")
    meeting_type: Optional[str] = Field(None, description="Meeting type")


class MeetingTranscription(BaseModel):
    """Complete meeting transcription data."""
    
    id: Optional[str] = Field(None, description="Database ID")
    metadata: MeetingMetadata = Field(..., description="Meeting metadata")
    segments: List[SpeakerSegment] = Field(..., description="Speaker segments")
    summary: Optional[str] = Field(None, description="AI-generated summary")
    action_items: List[str] = Field(default_factory=list, description="Action items")
    key_decisions: List[str] = Field(default_factory=list, description="Key decisions")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SpeakerProfile(BaseModel):
    """Speaker profile for identification."""
    
    speaker_id: str = Field(..., description="Speaker identifier")
    name: str = Field(..., description="Speaker name")
    email: Optional[str] = Field(None, description="Speaker email")
    voice_characteristics: Optional[Dict[str, Any]] = Field(None, description="Voice characteristics")
    meeting_count: int = Field(default=0, description="Number of meetings participated")


class TranscriptionRequest(BaseModel):
    """Request model for transcription."""
    
    meeting_title: str = Field(..., description="Meeting title")
    meeting_type: Optional[str] = Field(None, description="Meeting type")
    location: Optional[str] = Field(None, description="Meeting location")
    speaker_names: Optional[List[str]] = Field(None, description="Known speaker names")


class TranscriptionResponse(BaseModel):
    """Response model for transcription status."""
    
    transcription_id: str = Field(..., description="Transcription ID")
    status: str = Field(..., description="Processing status")
    message: str = Field(..., description="Status message")
    progress: Optional[float] = Field(None, description="Progress percentage")
