# Meeting Notes Transcription System

A comprehensive meeting transcription and notes management system that automatically transcribes audio recordings, identifies speakers, and generates AI-powered summaries and action items.

## Features

### Core Functionality
- **Audio Recording**: Record meetings directly in the browser with real-time controls
- **File Upload**: Support for multiple audio formats (WAV, MP3, M4A, FLAC, OGG)
- **Automatic Transcription**: High-quality speech-to-text using OpenAI Whisper
- **Speaker Diarization**: Automatic identification and labeling of different speakers
- **AI-Powered Insights**: Automatic generation of summaries, action items, and key decisions
- **Speaker Management**: Track and manage speaker profiles across meetings

### User Interface
- **Modern Web Interface**: Clean, responsive design built with React and Tailwind CSS
- **Real-time Recording Controls**: Start, pause, resume, and stop recording with timer
- **Meeting Metadata**: Add titles, types, locations, and participant information
- **Search & Filter**: Find transcriptions quickly with search functionality
- **Export Options**: Download transcriptions in multiple formats (TXT, PDF, DOCX)

### Backend Services
- **FastAPI Backend**: High-performance async API server
- **MongoDB Storage**: Scalable document database for transcriptions and speaker profiles
- **Google Gemini AI**: Advanced AI for meeting insights and analysis
- **Audio Processing**: Professional-grade audio processing with librosa and pydub

## Architecture

### Backend Components

#### API Routes (`/api/meetings/`)
- `POST /transcribe` - Create new transcription from audio
- `GET /{id}` - Retrieve specific transcription
- `GET /` - List transcriptions with search and pagination
- `PUT /speakers/{speaker_id}` - Update speaker name
- `GET /speakers/` - Get all speaker profiles
- `DELETE /{id}` - Delete transcription
- `GET /{id}/export` - Export transcription in various formats

#### Services
- **AudioProcessor**: Handles audio conversion, feature extraction, and speaker diarization
- **MeetingTranscriptionService**: Manages transcription workflow and AI insights
- **SpeakerProfileService**: Tracks speaker identification across meetings

#### Data Models
- **MeetingTranscription**: Complete transcription with metadata and AI insights
- **SpeakerSegment**: Individual speech segments with speaker identification
- **SpeakerProfile**: Persistent speaker information and statistics

### Frontend Components

#### Pages
- **Meetings**: Main listing and recording interface
- **MeetingDetail**: Detailed view with full transcript and editing capabilities

#### Components
- **AudioRecorder**: Browser-based audio recording with real-time controls
- **Sidebar**: Navigation with meeting-specific menu items
- **TranscriptionCards**: Rich cards showing meeting summaries and insights

## Setup and Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB instance
- Google AI Studio API key

### Backend Setup

1. **Install Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=discovery_track_ai
GOOGLE_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.0-flash
WHISPER_MODEL=base
```

3. **Start Backend Server**
```bash
python server.py
```

The backend will be available at `http://localhost:8001`

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your backend URL
```

Required environment variables:
```
VITE_BACKEND_URL=http://localhost:8001
```

3. **Start Frontend Development Server**
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Usage

### Recording a Meeting

1. Navigate to the **Meetings** page
2. Click **"New Recording"**
3. Choose between:
   - **Live Recording**: Click "Start Recording" to record directly in browser
   - **File Upload**: Select an existing audio file
4. Fill in meeting details:
   - Meeting title (required)
   - Meeting type (optional)
   - Location (optional)
   - Speaker names (optional, comma-separated)
5. Click **"Create Transcription"**

### Managing Transcriptions

#### Viewing Transcriptions
- Click on any transcription card to view details
- See full transcript with speaker identification
- Review AI-generated summaries and action items
- Edit speaker names inline

#### Exporting Transcriptions
- Click the **Export** button on any transcription
- Choose format: TXT, PDF, or DOCX
- File downloads automatically

#### Searching and Filtering
- Use the search bar to find specific meetings
- Search works in titles, summaries, and transcript content
- Results update in real-time

### Speaker Management

#### Automatic Speaker Identification
- System automatically detects different speakers
- Assigns temporary names (Speaker 1, Speaker 2, etc.)
- Groups same voice across different meetings

#### Manual Speaker Labeling
- Click the edit icon next to any speaker name
- Enter the correct name
- Updates across all meetings automatically

#### Speaker Profiles
- Track meeting participation statistics
- View speaking time and word counts
- Monitor meeting frequency per speaker

## API Reference

### Authentication
Currently no authentication is required (development mode).

### Response Format
All API responses use JSON format with appropriate HTTP status codes.

### Error Handling
- `400` - Bad Request (validation errors, invalid file types)
- `404` - Not Found (transcription or speaker doesn't exist)
- `422` - Unprocessable Entity (missing required fields)
- `500` - Internal Server Error (processing failures)

## Testing

### Backend Tests
```bash
cd backend
pytest tests/test_meeting_transcription.py -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Performance Considerations

### Audio Processing
- Whisper model loading is lazy (on first use)
- Audio files are automatically converted to optimal format
- Speaker diarization uses efficient clustering algorithms

### Database Optimization
- MongoDB indexes on transcription metadata for fast search
- Speaker profiles cached for improved performance
- Pagination for large transcription lists

### Frontend Optimization
- Lazy loading of transcription details
- Debounced search queries
- Efficient audio recording with WebRTC

## Troubleshooting

### Common Issues

#### Audio Recording Not Working
- Ensure browser permissions allow microphone access
- Check that HTTPS is used in production (required for microphone)
- Verify WebRTC support in browser

#### Transcription Quality Poor
- Ensure clear audio quality with minimal background noise
- Try different Whisper model sizes (base, small, medium)
- Check that speakers are clearly distinguishable

#### Speaker Identification Issues
- Provide known speaker names when creating transcription
- Manually correct speaker names to improve future accuracy
- Ensure consistent audio quality across recordings

#### Export Not Working
- Check file permissions for download directory
- Verify sufficient disk space for large exports
- Try different export formats

### Debug Mode
Enable debug logging by setting:
```bash
export LOG_LEVEL=debug
```

## Contributing

### Code Style
- Python: Follow PEP-8 guidelines
- JavaScript: Use existing project style (2-space indent, single quotes)
- All code must pass linting and type checking

### Adding Features
1. Create feature branch from main
2. Implement with comprehensive tests
3. Update documentation
4. Submit pull request

## License

This project follows the open-source only policy. All dependencies are open-source libraries.

## Support

For technical issues:
1. Check the troubleshooting section
2. Review test cases for usage examples
3. Check API documentation for endpoint details
