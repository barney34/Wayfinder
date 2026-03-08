"""Meeting transcription API routes."""

import os
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
import tempfile
import shutil

from data.meeting import TranscriptionRequest, TranscriptionResponse
from services.meeting_transcription import MeetingTranscriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/meetings", tags=["meetings"])
transcription_service = MeetingTranscriptionService()


@router.post("/transcribe", response_model=TranscriptionResponse)
async def create_transcription(
    audio_file: UploadFile = File(...),
    meeting_title: str = Form(...),
    meeting_type: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    speaker_names: Optional[str] = Form(None)  # JSON string of speaker names
):
    """Create a new meeting transcription from audio file."""
    try:
        # Validate audio file
        if not audio_file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Parse speaker names if provided
        speaker_names_list = None
        if speaker_names:
            import json
            try:
                speaker_names_list = json.loads(speaker_names)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid speaker names format")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            shutil.copyfileobj(audio_file.file, tmp_file)
            tmp_file_path = tmp_file.name
        
        try:
            # Create transcription request
            request_data = {
                "meeting_title": meeting_title,
                "meeting_type": meeting_type,
                "location": location,
                "speaker_names": speaker_names_list
            }
            
            # Process transcription
            transcription_id = await transcription_service.create_transcription(
                tmp_file_path, request_data
            )
            
            return TranscriptionResponse(
                transcription_id=transcription_id,
                status="completed",
                message="Transcription completed successfully",
                progress=100.0
            )
            
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)
            
    except Exception as e:
        logger.error(f"Transcription creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{transcription_id}")
async def get_transcription(transcription_id: str):
    """Get a specific transcription by ID."""
    try:
        transcription = await transcription_service.get_transcription(transcription_id)
        
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        
        # Convert ObjectId to string for JSON serialization
        if "_id" in transcription:
            transcription["_id"] = str(transcription["_id"])
        
        return transcription
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def list_transcriptions(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None)
):
    """List transcriptions with pagination and search."""
    try:
        transcriptions = await transcription_service.list_transcriptions(
            limit=limit, offset=offset, search_query=search
        )
        
        # Convert ObjectIds to strings
        for transcription in transcriptions:
            if "_id" in transcription:
                transcription["_id"] = str(transcription["_id"])
        
        return {
            "transcriptions": transcriptions,
            "total": len(transcriptions),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Failed to list transcriptions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/speakers/{speaker_id}")
async def update_speaker_name(speaker_id: str, name: str):
    """Update speaker name."""
    try:
        success = await transcription_service.update_speaker_name(speaker_id, name)
        
        if not success:
            raise HTTPException(status_code=404, detail="Speaker not found")
        
        return {"message": "Speaker name updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update speaker name: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/speakers/")
async def get_speaker_profiles():
    """Get all speaker profiles."""
    try:
        profiles = await transcription_service.get_speaker_profiles()
        
        # Convert ObjectIds to strings
        for profile in profiles:
            if "_id" in profile:
                profile["_id"] = str(profile["_id"])
        
        return {"speakers": profiles}
        
    except Exception as e:
        logger.error(f"Failed to get speaker profiles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{transcription_id}")
async def delete_transcription(transcription_id: str):
    """Delete a transcription."""
    try:
        success = await transcription_service.delete_transcription(transcription_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Transcription not found")
        
        return {"message": "Transcription deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{transcription_id}/export")
async def export_transcription(transcription_id: str, format: str = Query("txt", regex="^(txt|pdf|docx)$")):
    """Export transcription in various formats."""
    try:
        transcription = await transcription_service.get_transcription(transcription_id)
        
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        
        # Create export content
        content = _format_transcription_for_export(transcription, format)
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{format}') as tmp_file:
            tmp_file.write(content.encode('utf-8'))
            tmp_file_path = tmp_file.name
        
        # Determine media type
        media_types = {
            "txt": "text/plain",
            "pdf": "application/pdf",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        }
        
        media_type = media_types.get(format, "text/plain")
        
        return FileResponse(
            tmp_file_path,
            media_type=media_type,
            filename=f"meeting_transcription_{transcription_id}.{format}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _format_transcription_for_export(transcription: dict, format: str) -> str:
    """Format transcription for export."""
    metadata = transcription.get("metadata", {})
    segments = transcription.get("segments", [])
    
    if format == "txt":
        lines = []
        lines.append(f"Meeting: {metadata.get('title', 'Untitled')}")
        lines.append(f"Date: {metadata.get('date', 'Unknown')}")
        lines.append(f"Duration: {metadata.get('duration', 0):.1f} seconds")
        lines.append(f"Participants: {metadata.get('participant_count', 0)}")
        lines.append("")
        
        if transcription.get("summary"):
            lines.append("SUMMARY:")
            lines.append(transcription["summary"])
            lines.append("")
        
        lines.append("TRANSCRIPT:")
        lines.append("")
        
        for segment in segments:
            speaker_name = segment.get("speaker_name") or segment.get("speaker_id", "Unknown")
            lines.append(f"[{speaker_name}]: {segment.get('text', '')}")
        
        return "\n".join(lines)
    
    elif format == "pdf":
        # For PDF export, we'll return formatted text that can be converted
        # In a real implementation, you'd use a PDF library like reportlab
        return _format_transcription_for_export(transcription, "txt")
    
    elif format == "docx":
        # For DOCX export, we'll return formatted text that can be converted
        # In a real implementation, you'd use python-docx
        return _format_transcription_for_export(transcription, "txt")
    
    return ""
