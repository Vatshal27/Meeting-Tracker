# Meeting Participant Tracker Browser Extension

A comprehensive browser extension that tracks participants joining and leaving online meetings across multiple platforms including Google Meet, Zoom, Microsoft Teams, and Webex.

## Features

### 🎯 Multi-Platform Support
- **Google Meet** - Full participant tracking
- **Zoom** - Participant detection and monitoring  
- **Microsoft Teams** - Meeting participant tracking
- **Webex** - Participant join/leave detection

### 📊 Comprehensive Tracking
- **Real-time monitoring** of participants joining and leaving
- **Join/leave timestamps** with precise timing
- **Session counting** - tracks how many times each person joined
- **Duration calculation** - time spent in meeting
- **Current presence status** - who's currently in the meeting

### 💾 Data Management
- **Persistent storage** - data saved across browser sessions
- **Export functionality** - JSON and CSV formats
- **Session history** - maintains records of past meetings
- **Automatic cleanup** - removes old data after 7 days

### 🎨 User Interface
- **Floating tracker** - small overlay showing live participant count
- **Detailed popup** - comprehensive view via extension icon
- **Draggable interface** - move the floating tracker anywhere
- **Export controls** - easy data export options

## Installation

### Method 1: Manual Installation (Recommended for Development)

1. **Download the files** - Save all the extension files:
   - `manifest.json`
   - `content.js`
   - `popup.html`
   - `popup.js`
   - `background.js`

2. **Create extension folder**:
   ```
   meeting-tracker-extension/
   ├── manifest.json
   ├── content.js
   ├── popup.html
   ├── popup.js
   ├── background.js
   └── icons/ (optional)
       ├── icon16.png
       ├── icon48.png
       └── icon128.png
   ```

3. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select your extension folder

4. **Load in Firefox**:
   - Go to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file

### Method 2: Create Icons (Optional)

Create simple icon files or use any 16x16, 48x48, and 128x128 PNG images for the extension icons.

## Usage

### Starting Tracking

1. **Join a meeting** on any supported platform:
   - Google Meet: `meet.google.com/xxx-xxx-xxx`
   - Zoom: `zoom.us/j/xxxxxxxxxx`
   - Microsoft Teams: Teams meeting link
   - Webex: Webex meeting room

2. **Automatic detection** - The extension automatically detects when you're in a meeting and starts tracking

3. **Visual indicator** - A small floating tracker appears showing:
   - Current platform
   - Number of participants
   - Tracking status

### Viewing Data

1. **Click the extension icon** in your browser toolbar
2. **View comprehensive data**:
   - Meeting statistics
   - Complete participant list
   - Join/leave times
   - Session counts
   - Duration information

### Exporting Data

1. **From the popup**, click "Export Data"
2. **Two files are created**:
   - JSON file with complete data structure
   - CSV file for spreadsheet analysis

### Data Format

#### JSON Export Structure:
```json
{
  "sessionInfo": {
    "sessionId": "session_1234567890_abc123",
    "platform": "Google Meet",
    "url": "https://meet.google.com/abc-def-ghi",
    "exportTime": "2024-01-15T10:30:00.000Z"
  },
  "summary": {
    "totalParticipants": 5,
    "currentlyPresent": 3,
    "averageDuration": 1800000
  },
  "participants": [
    {
      "name": "John Doe",
      "joinTime": "2024-01-15T10:00:00.000Z",
      "leaveTime": "2024-01-15T10:30:00.000Z",
      "duration": "30m 0s",
      "totalSessions": 1,
      "currentlyPresent": false
    }
  ]
}
```

#### CSV Export Fields:
- Name
- Join Time
- Leave Time
- Duration (minutes)
- Total Sessions
- Currently Present

## Technical Details

### Architecture

- **Content Script** (`content.js`): Injected into meeting pages, monitors DOM changes
- **Background Script** (`background.js`): Handles data persistence and cleanup
- **Popup Interface** (`popup.html/js`): User interface for viewing and exporting data

### Detection Methods

1. **DOM Monitoring**: Uses MutationObserver to watch for participant list changes
2. **Platform-specific Selectors**: Tailored CSS selectors for each meeting platform
3. **Real-time Updates**: Continuous monitoring for join/leave events
4. **Fallback Detection**: Multiple detection methods ensure reliability

### Data Storage

- **Chrome Storage API**: Persistent local storage
- **Session-based**: Each meeting creates a unique session
- **Automatic Cleanup**: Old sessions removed after 7 days
- **Privacy-focused**: All data stored locally on user's device

### Browser Compatibility

- **Chrome**: Full support (Manifest V3)
- **Firefox**: Compatible with minor modifications
- **Edge**: Chromium-based Edge supported
- **Safari**: Requires additional modifications

## Privacy & Security

### Data Handling
- ✅ **Local storage only** - no data sent to external servers
- ✅ **No personal information** beyond names visible in meetings
- ✅ **User control** - complete control over data export and deletion
- ✅ **Automatic cleanup** - old data automatically removed

### Permissions Used
- `activeTab`: Access current meeting tab
- `storage`: Save tracking data locally  
- `scripting`: Inject content scripts
- Host permissions for meeting platforms only


## Limitations

### Platform Limitations
- **Name detection**: Limited to names visible in the meeting interface
- **Private meetings**: May have limited participant visibility
- **Mobile apps**: Only works in browser versions of meeting platforms
- **Audio-only**: May not detect participants in audio-only mode

## Development

### File Structure
```
meeting-tracker-extension/
├── manifest.json          # Extension manifest
├── content.js            # Main tracking logic
├── popup.html           # User interface
├── popup.js             # Popup functionality  
├── background.js        # Background tasks
└── README.md           # This file
```

### Customization

**Adding new platforms:**
1. Add URL pattern to `manifest.json`
2. Add platform detection in `detectPlatform()`
3. Add selectors in `getPlatformSelectors()`
4. Add extraction logic in `extractParticipants()`

**Modifying UI:**
- Edit `popup.html` for layout changes
- Modify `popup.js` for functionality updates
- Update CSS in `popup.html` for styling

**Changing tracking behavior:**
- Modify `content.js` for different tracking logic
- Adjust timing in `startTracking()` method
- Update storage format in `saveData()` method



### Version 1.0
- Initial release
- Multi-platform support (Meet, Zoom, Teams, Webex)
- Real-time participant tracking
- Export functionality (JSON/CSV)
- Persistent data storage
- Automatic cleanup

**Happy Meeting Tracking! 📊🎥**