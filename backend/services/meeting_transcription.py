"""Meeting transcription service."""

import os
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import uuid4

from google.generativeai import GenerativeModel
import motor.motor_asyncio

from data.meeting import (
    MeetingTranscription, 
    SpeakerSegment, 
    MeetingMetadata,
    SpeakerProfile
)
from services.audio_processor import AudioProcessor
from database import _db

logger = logging.getLogger(__name__)


class MeetingTranscriptionService:
    """Service for managing meeting transcriptions."""
    
    def __init__(self):
        """Initialize transcription service."""
        self.audio_processor = AudioProcessor()
        self.genai_model = GenerativeModel(
            model_name=os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
        )
        self.meetings_collection = _db["meetings"]
        self.speakers_collection = _db["speakers"]
    
    async def create_transcription(self, audio_file_path: str, 
                                 request_data: Dict[str, Any]) -> str:
        """Create a new meeting transcription."""
        try:
            transcription_id = str(uuid4())
            
            # Process audio file
            logger.info(f"Processing audio file: {audio_file_path}")
            audio_result = self.audio_processor.process_audio_file(
                audio_file_path,
                language="en",
                known_speakers=request_data.get("speaker_names")
            )
            
            # Create speaker segments
            segments = []
            for seg_data in audio_result["segments"]:
                segment = SpeakerSegment(**seg_data)
                segments.append(segment)
            
            # Create meeting metadata
            metadata = MeetingMetadata(
                title=request_data["meeting_title"],
                date=datetime.utcnow(),
                duration=audio_result["duration"],
                participant_count=audio_result["num_speakers"],
                location=request_data.get("location"),
                meeting_type=request_data.get("meeting_type")
            )
            
            # Create transcription document
            transcription = MeetingTranscription(
                metadata=metadata,
                segments=segments
            )
            
            # Generate AI insights
            await self._generate_ai_insights(transcription)
            
            # Update speaker profiles
            await self._update_speaker_profiles(segments)
            
            # Save to database
            transcription_dict = transcription.model_dump()
            transcription_dict["_id"] = transcription_id
            
            await self.meetings_collection.insert_one(transcription_dict)
            
            logger.info(f"Created transcription: {transcription_id}")
            return transcription_id
            
        except Exception as e:
            logger.error(f"Transcription creation failed: {e}")
            raise
    
    async def _generate_ai_insights(self, transcription: MeetingTranscription):
        """Generate AI-powered insights from transcription."""
        try:
            # Combine all text for analysis
            full_text = "\n".join([seg.text for seg in transcription.segments])
            
            # Generate summary
            summary_prompt = f"""
            Summarize this meeting transcript in 2-3 paragraphs, focusing on:
            - Main topics discussed
            - Key decisions made
            - Important outcomes
            
            Transcript:
            {full_text}
            """
            
            summary_response = await self.genai_model.generate_content_async(summary_prompt)
            transcription.summary = summary_response.text.strip()
            
            # Extract action items
            action_prompt = f"""
            Extract action items from this meeting transcript. 
            Return as a numbered list of specific, actionable tasks.
            If no action items are found, return "No action items identified."
            
            Transcript:
            {full_text}
            """
            
            action_response = await self.genai_model.generate_content_async(action_prompt)
            action_text = action_response.text.strip()
            
            if action_text != "No action items identified.":
                # Parse numbered list
                lines = action_text.split('\n')
                transcription.action_items = [
                    line.strip().replace(f"{i+1}.", "").replace(f"{i+1}.", "").strip()
                    for i, line in enumerate(lines) if line.strip() and not line.startswith("No action items")
                ]
            
            # Extract key decisions
            decision_prompt = f"""
            Extract key decisions made in this meeting.
            Return as a numbered list of important decisions.
            If no clear decisions are identified, return "No clear decisions identified."
            
            Transcript:
            {full_text}
            """
            
            decision_response = await self.genai_model.generate_content_async(decision_prompt)
            decision_text = decision_response.text.strip()
            
            if decision_text != "No clear decisions identified.":
                # Parse numbered list
                lines = decision_text.split('\n')
                transcription.key_decisions = [
                    line.strip().replace(f"{i+1}.", "").replace(f"{i+1}.", "").strip()
                    for i, line in enumerate(lines) if line.strip() and not line.startswith("No clear decisions")
                ]
            
        except Exception as e:
            logger.error(f"AI insights generation failed: {e}")
            # Continue without AI insights
    
    async def _update_speaker_profiles(self, segments: List[SpeakerSegment]):
        """Update speaker profiles based on transcription."""
        try:
            speaker_stats = {}
            
            # Aggregate speaker statistics
            for segment in segments:
                speaker_id = segment.speaker_id
                if speaker_id not in speaker_stats:
                    speaker_stats[speaker_id] = {
                        "total_words": 0,
                        "total_duration": 0,
                        "segments": []
                    }
                
                speaker_stats[speaker_id]["total_words"] += len(segment.text.split())
                speaker_stats[speaker_id]["total_duration"] += (segment.end_time - segment.start_time)
                speaker_stats[speaker_id]["segments"].append(segment.text)
            
            # Update or create speaker profiles
            for speaker_id, stats in speaker_stats.items():
                existing = await self.speakers_collection.find_one({"speaker_id": speaker_id})
                
                if existing:
                    # Update existing profile
                    await self.speakers_collection.update_one(
                        {"speaker_id": speaker_id},
                        {
                            "$inc": {"meeting_count": 1},
                            "$set": {
                                "updated_at": datetime.utcnow(),
                                "last_meeting": datetime.utcnow(),
                                "total_words": existing.get("total_words", 0) + stats["total_words"],
                                "total_speaking_time": existing.get("total_speaking_time", 0) + stats["total_duration"]
                            }
                        }
                    )
                else:
                    # Create new profile
                    profile = SpeakerProfile(
                        speaker_id=speaker_id,
                        name=f"Speaker {speaker_id.split('_')[1]}" if '_' in speaker_id else speaker_id,
                        meeting_count=1
                    )
                    
                    profile_dict = profile.model_dump()
                    profile_dict.update({
                        "total_words": stats["total_words"],
                        "total_speaking_time": stats["total_duration"],
                        "created_at": datetime.utcnow(),
                        "last_meeting": datetime.utcnow()
                    })
                    
                    await self.speakers_collection.insert_one(profile_dict)
        
        except Exception as e:
            logger.error(f"Speaker profile update failed: {e}")
    
    async def get_transcription(self, transcription_id: str) -> Optional[Dict[str, Any]]:
        """Get transcription by ID."""
        try:
            result = await self.meetings_collection.find_one({"_id": transcription_id})
            return result
        except Exception as e:
            logger.error(f"Failed to get transcription: {e}")
            return None
    
    async def list_transcriptions(self, limit: int = 50, offset: int = 0,
                                search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        """List transcriptions with optional search."""
        try:
            query = {}
            
            if search_query:
                query["$text"] = {"$search": search_query}
            
            cursor = self.meetings_collection.find(query).sort("created_at", -1).skip(offset).limit(limit)
            results = await cursor.to_list(length=limit)
            
            return results
        except Exception as e:
            logger.error(f"Failed to list transcriptions: {e}")
            return []
    
    async def update_speaker_name(self, speaker_id: str, name: str) -> bool:
        """Update speaker name in profile and all transcriptions."""
        try:
            # Update speaker profile
            await self.speakers_collection.update_one(
                {"speaker_id": speaker_id},
                {"$set": {"name": name, "updated_at": datetime.utcnow()}}
            )
            
            # Update all transcriptions with this speaker
            await self.meetings_collection.update_many(
                {"segments.speaker_id": speaker_id},
                {"$set": {"segments.$[elem].speaker_name": name}},
                array_filters=[{"elem.speaker_id": speaker_id}]
            )
            
            return True
        except Exception as e:
            logger.error(f"Failed to update speaker name: {e}")
            return False
    
    async def delete_transcription(self, transcription_id: str) -> bool:
        """Delete a transcription."""
        try:
            result = await self.meetings_collection.delete_one({"_id": transcription_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Failed to delete transcription: {e}")
            return False
    
    async def get_speaker_profiles(self) -> List[Dict[str, Any]]:
        """Get all speaker profiles."""
        try:
            cursor = self.speakers_collection.find().sort("meeting_count", -1)
            results = await cursor.to_list(length=None)
            return results
        except Exception as e:
            logger.error(f"Failed to get speaker profiles: {e}")
            return []
