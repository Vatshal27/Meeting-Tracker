class MeetingTracker {
  constructor() {
    this.platform = this.detectPlatform();
    this.participants = new Map();
    this.sessionId = this.generateSessionId();
    this.isTracking = false;
    this.observers = [];
    this.startTime = new Date().toISOString();
    this.checkInterval = null;
    this.scanTimeout = null;
    this.sessionTimeInterval = null;
    this.currentUrl = window.location.href;
    
    // Consent system properties
    this.consentModalShown = false;
    this.trackingConsent = false;
    this.consentModal = null;
    
    this.init();
  }

  detectPlatform() {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('meet.google.com')) return 'google-meet';
    if (hostname.includes('zoom.us')) return 'zoom';
    if (hostname.includes('teams.microsoft.com')) return 'teams';
    if (hostname.includes('webex.com')) return 'webex';
    return 'unknown';
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  init() {
    console.log(`🎯 Meeting Tracker initialized for ${this.platform}`);
    
    // Wait for page to load completely
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.checkConsentAndStart());
    } else {
      this.checkConsentAndStart();
    }
  }

  async checkConsentAndStart() {
    // Check if user has a saved preference
    try {
      const result = await this.getStoredPreference();
      if (result && result.tracking_preference) {
        const preference = result.tracking_preference;
        const timestamp = result.preference_timestamp;
        
        // Check if preference is still valid (within 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        if (timestamp && timestamp > thirtyDaysAgo) {
          if (preference === 'always') {
            this.trackingConsent = true;
            this.startTracking();
            return;
          } else if (preference === 'never') {
            this.trackingConsent = false;
            console.log('🚫 Tracking disabled by user preference');
            return;
          }
        }
      }
    } catch (error) {
      console.warn('Error checking stored preference:', error);
    }
    
    // Show consent modal if no valid preference found
    setTimeout(() => {
      this.showConsentModal();
    }, 3000); // Wait for meeting to load
  }

  getStoredPreference() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['tracking_preference', 'preference_timestamp'], resolve);
      } else {
        // Fallback to localStorage
        try {
          const preference = localStorage.getItem('meeting_tracker_preference');
          const timestamp = localStorage.getItem('meeting_tracker_preference_timestamp');
          resolve({
            tracking_preference: preference,
            preference_timestamp: timestamp ? parseInt(timestamp) : null
          });
        } catch (error) {
          resolve({});
        }
      }
    });
  }

  showConsentModal() {
    if (this.consentModalShown || this.consentModal) return;
    
    const modal = document.createElement('div');
    modal.id = 'meeting-tracker-consent-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 999999;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      backdrop-filter: blur(5px);
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 35px;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      max-width: 480px;
      width: 90%;
      text-align: center;
      animation: slideInModal 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      position: relative;
    `;
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInModal {
        from { 
          transform: translateY(-100px) scale(0.8); 
          opacity: 0; 
        }
        to { 
          transform: translateY(0) scale(1); 
          opacity: 1; 
        }
      }
      @keyframes slideOutModal {
        from { 
          transform: translateY(0) scale(1); 
          opacity: 1; 
        }
        to { 
          transform: translateY(-100px) scale(0.8); 
          opacity: 0; 
        }
      }
      .consent-button {
        transition: all 0.2s ease;
      }
      .consent-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
    `;
    document.head.appendChild(style);
    
    const platformName = this.formatPlatformName(this.platform);
    
    modalContent.innerHTML = `
      <div style="margin-bottom: 25px;">
        <div style="font-size: 48px; margin-bottom: 15px;">📊</div>
        <h3 style="margin: 0 0 15px 0; color: #1a73e8; font-size: 24px; font-weight: 600;">
          Meeting Participant Tracker
        </h3>
        <p style="margin: 0 0 15px 0; color: #5f6368; font-size: 16px; line-height: 1.5;">
          We've detected a <strong>${platformName}</strong> meeting. Would you like to track participants for this session?
        </p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 0; color: #5f6368; font-size: 14px; line-height: 1.4;">
            <strong>What we track:</strong> Participant names, join/leave times, and session duration. All data stays on your device.
          </p>
        </div>
      </div>
      
      <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 25px;">
        <button id="consent-yes" class="consent-button" style="
          background: linear-gradient(135deg, #1a73e8, #4285f4);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          min-width: 140px;
        ">
          ✓ Yes, Track Meeting
        </button>
        <button id="consent-no" class="consent-button" style="
          background: white;
          color: #5f6368;
          border: 2px solid #dadce0;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          min-width: 140px;
        ">
          ✗ No Thanks
        </button>
      </div>
      
      <div style="border-top: 1px solid #e8eaed; padding-top: 20px;">
        <label style="display: flex; align-items: center; justify-content: center; color: #5f6368; font-size: 14px; cursor: pointer;">
          <input type="checkbox" id="remember-choice" style="
            margin-right: 10px; 
            transform: scale(1.2);
            accent-color: #1a73e8;
          ">
          Remember my choice for future meetings
        </label>
        <p style="margin: 10px 0 0 0; color: #9aa0a6; font-size: 12px;">
          You can change this anytime in the extension settings
        </p>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    this.consentModal = modal;
    
    // Add button event listeners
    const yesButton = modal.querySelector('#consent-yes');
    const noButton = modal.querySelector('#consent-no');
    const rememberCheckbox = modal.querySelector('#remember-choice');
    
    yesButton.addEventListener('click', () => this.handleConsentResponse(true, rememberCheckbox.checked));
    noButton.addEventListener('click', () => this.handleConsentResponse(false, rememberCheckbox.checked));
    
    // Close modal when clicking outside (optional)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.handleConsentResponse(false, false);
      }
    });
    
    this.consentModalShown = true;
  }

  handleConsentResponse(consent, remember) {
    this.trackingConsent = consent;
    
    if (remember) {
      // Store user preference
      const preferenceData = {
        'tracking_preference': consent ? 'always' : 'never',
        'preference_timestamp': Date.now()
      };
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set(preferenceData);
      } else {
        // Fallback to localStorage
        try {
          localStorage.setItem('meeting_tracker_preference', consent ? 'always' : 'never');
          localStorage.setItem('meeting_tracker_preference_timestamp', Date.now().toString());
        } catch (error) {
          console.warn('Could not save preference:', error);
        }
      }
    }
    
    // Remove modal with animation
    if (this.consentModal) {
      this.consentModal.querySelector('div').style.animation = 'slideOutModal 0.3s ease-in';
      setTimeout(() => {
        if (this.consentModal && this.consentModal.parentNode) {
          this.consentModal.parentNode.removeChild(this.consentModal);
        }
        this.consentModal = null;
      }, 300);
    }
    
    if (consent) {
      console.log('✅ User consented to tracking');
      this.startTracking();
    } else {
      console.log('🚫 User declined tracking');
      this.showDeclinedMessage();
    }
  }

  showDeclinedMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #f44336, #d32f2f);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideInFromRight 0.3s ease-out;
    `;
    
    message.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span style="margin-right: 8px;">🚫</span>
        Meeting tracking disabled
      </div>
    `;
    
    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInFromRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(message);
    
    // Remove message after 3 seconds
    setTimeout(() => {
      if (message && message.parentNode) {
        message.style.animation = 'slideInFromRight 0.3s ease-in reverse';
        setTimeout(() => {
          if (message.parentNode) {
            message.parentNode.removeChild(message);
          }
        }, 300);
      }
    }, 3000);
  }

  startTracking() {
    // Only start tracking if user has consented
    if (!this.trackingConsent) {
      console.log('🚫 Tracking not started - no user consent');
      return;
    }
    
    // Add delay to ensure meeting interface is loaded
    setTimeout(() => {
      try {
        this.setupObservers();
        this.createTrackingUI();
        this.startPeriodicCheck();
        this.isTracking = true;
        console.log('📊 Tracking started successfully with user consent');
      } catch (error) {
        console.error('Error starting tracking:', error);
      }
    }, 1000); // Reduced delay since consent modal already provided time
  }

  setupObservers() {
    const config = { childList: true, subtree: true, attributes: true };
    
    // Platform-specific selectors
    const selectors = this.getPlatformSelectors();
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach(element => {
            const observer = new MutationObserver((mutations) => {
              this.handleMutations(mutations);
            });
            observer.observe(element, config);
            this.observers.push(observer);
          });
        }
      } catch (error) {
        console.warn(`Could not observe selector: ${selector}`, error);
      }
    });

    // Fallback: observe document body if available
    if (document.body) {
      const documentObserver = new MutationObserver((mutations) => {
        this.handleMutations(mutations);
      });
      documentObserver.observe(document.body, config);
      this.observers.push(documentObserver);
    }
  }

  getPlatformSelectors() {
    const selectors = {
      'google-meet': [
        'body', // Watch entire body for Google Meet
        '[data-participant-id]',
        '.uGOf1d', // Participants area
        '.ZjFb7c' // Another participant container
      ],
      'zoom': [
        'body', // Watch entire body
        '.participants-list-container',
        '.gallery-video-container',
        '#wc-container-right'
      ],
      'teams': [
        'body', // Watch entire body
        '[data-tid="roster-content"]',
        '.ts-calling-screen'
      ],
      'webex': [
        'body', // Watch entire body
        '.roster-list',
        '.participant-list'
      ]
    };
    
    return selectors[this.platform] || ['body'];
  }

  startPeriodicCheck() {
    // Clear existing interval to prevent duplicates
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Check for participants every 5 seconds
    this.checkInterval = setInterval(() => {
      try {
        if (this.trackingConsent) { // Only scan if user consented
          this.scanForParticipants();
        }
      } catch (error) {
        console.error('Error in periodic check:', error);
      }
    }, 5000);
  }

  scanForParticipants() {
    // Only proceed if tracking is consented
    if (!this.trackingConsent) return;
    
    // Detect if user has left the meeting (Google Meet)
    if (this.platform === 'google-meet') {
      // Look for the "You've left the meeting" message or similar indicators
      const leftMeetingText = document.body && document.body.innerText && document.body.innerText.includes("You've left the meeting");
      const leftMeetingButton = document.querySelector('button[aria-label*="Return to home screen"], button[aria-label*="Rejoin"]');
      if (leftMeetingText || leftMeetingButton) {
        // User is not in a meeting, cleanup UI and stop tracking
        this.cleanup();
        return;
      }
    }

    const participants = new Set();
    try {
      // Platform-specific participant extraction
      switch (this.platform) {
        case 'google-meet':
          this.scanGoogleMeet(participants);
          break;
        case 'zoom':
          this.scanZoom(participants);
          break;
        case 'teams':
          this.scanTeams(participants);
          break;
        case 'webex':
          this.scanWebex(participants);
          break;
        default:
          console.warn('Unknown platform, using generic scan');
          this.scanGeneric(participants);
      }
      // Update participant tracking
      this.updateParticipants(participants);
    } catch (error) {
      console.error('Error scanning for participants:', error);
    }
  }

// Fixed Google Meet participant scanning with better accuracy
scanGoogleMeet(participants) {
  // Clear previous results to avoid duplicates
  const tempParticipants = new Set();
  
  // Strategy 1: Look for Google Meet's own participant counter first
  try {
    const participantCountElements = [
      // Google Meet's built-in participant counter
      '[aria-label*="participant" i]',
      '[data-tooltip*="participant" i]',
      '.uGOf1d .VfPpkd-rymPhb-ibnC6b', // Participant button counter
      '[jsname="A5il2e"]', // Participant panel counter
    ];
    
    participantCountElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent || el.getAttribute('aria-label') || '';
        const match = text.match(/(\d+)\s*participant/i);
        if (match) {
          const count = parseInt(match[1]);
          console.log(`📊 Found Google Meet participant counter: ${count}`);
          // Store this as a reference but still scan for individual names
        }
      });
    });
  } catch (error) {
    console.warn('Could not find participant counter:', error);
  }

  // Strategy 2: Scan for actual participant names with improved selectors
  const participantSelectors = [
    // More specific participant name selectors
    '[data-self-name]', // Self participant
    '[data-participant-id] > div > div > span:first-child', // More specific participant spans
    '.ZjFb7c > span:first-child', // First span in participant container
    '.uGOf1d [role="button"] > span:first-child', // Participant buttons
    
    // Participant panel specific
    '[jsname="A5il2e"] [role="listitem"] span', // Participant list items
    '.K4efcd > span:first-child', // Participant name containers
    
    // Video tiles with names
    '[data-requested-participant-id] span',
    '.DPvwYc span:first-child',
  ];

  // Scan each selector with validation
  participantSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const name = this.extractAndCleanName(el);
        if (name && this.isHighQualityParticipantName(name)) {
          tempParticipants.add(name);
        }
      });
    } catch (error) {
      // Silently continue with other selectors
    }
  });

  // Strategy 3: Fallback - scan aria-labels more carefully
  if (tempParticipants.size === 0) {
    this.scanAriaElementsImproved(tempParticipants);
  }

  // Strategy 4: Count visible video tiles as fallback
  if (tempParticipants.size === 0) {
    this.countVideoTiles(tempParticipants);
  }

  // Add validated participants to main set
  tempParticipants.forEach(name => participants.add(name));
  
  console.log(`🔍 Google Meet scan found ${participants.size} participants:`, Array.from(participants));
}

// Improved name extraction and cleaning
extractAndCleanName(element) {
  if (!element) return null;
  
  let name = element.textContent?.trim();
  
  if (!name) return null;
  
  // Remove common suffixes and indicators
  name = name.replace(/\s*\(host\)$/i, '');
  name = name.replace(/\s*\(moderator\)$/i, '');
  name = name.replace(/\s*\(organizer\)$/i, '');
  name = name.replace(/\s*\(you\)$/i, '');
  name = name.replace(/\s*\(me\)$/i, '');
  name = name.replace(/\s*\(presenter\)$/i, '');
  name = name.replace(/\s*•.*$/, ''); // Remove everything after bullet point
  
  // Remove microphone/camera status indicators
  name = name.replace(/🎤|🔇|📹|🚫|🔴/g, '');
  name = name.replace(/\s*(muted|unmuted|camera on|camera off)$/i, '');
  
  return name.trim();
}

// Much stricter name validation
isHighQualityParticipantName(name) {
  if (!name || typeof name !== 'string') return false;
  
  // Length checks
  if (name.length < 2 || name.length > 50) return false;
  
  // Exclude self-references
  const selfIndicators = ['You', 'you', 'Me', 'me', '(You)', '(you)', '(Me)', '(me)', 'yourself'];
  if (selfIndicators.includes(name)) return false;
  
  // Exclude UI elements and common non-names
  const uiElements = [
    'Join', 'Leave', 'Mute', 'Unmute', 'Camera', 'Share', 'Chat', 'More',
    'Settings', 'Help', 'Close', 'Open', 'Start', 'Stop', 'End', 'Cancel',
    'Participants', 'participant', 'Meeting', 'Call', 'Video', 'Audio',
    'joined', 'left', 'reconnecting', 'connecting', 'loading', 'waiting',
    'Google Meet', 'Zoom', 'Teams', 'Webex', 'Unknown', 'Guest'
  ];
  if (uiElements.some(ui => name.toLowerCase().includes(ui.toLowerCase()))) return false;
  
  // Exclude pure numbers, symbols, or very short words
  if (name.match(/^[\d\s\-_\.!@#$%^&*()+=<>?/\\|`~]+$/)) return false;
  
  // Exclude single character names (except valid ones like Chinese characters)
  if (name.length === 1 && name.match(/[a-zA-Z0-9]/)) return false;
  
  // Exclude status messages
  if (name.match(/(joined|left|disconnected|reconnected|connecting)/i)) return false;
  
  // Require at least one letter
  if (!name.match(/[a-zA-Z\u00C0-\u017F\u0100-\u024F\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/)) return false;
  
  return true;
}

// Improved aria-label scanning
scanAriaElementsImproved(participants) {
  const ariaSelectors = [
    '[aria-label*="participant" i]:not(button)',
    '[aria-describedby*="participant" i]',
    '[title*="participant" i]:not(button)'
  ];
  
  ariaSelectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        const label = el.getAttribute('aria-label') || el.getAttribute('title');
        if (label) {
          const name = this.extractNameFromAriaLabel(label);
          if (name && this.isHighQualityParticipantName(name)) {
            participants.add(name);
          }
        }
      });
    } catch (error) {
      // Continue with other selectors
    }
  });
}

// Better aria-label name extraction
extractNameFromAriaLabel(label) {
  if (!label) return null;
  
  // More specific patterns for extracting names from aria-labels
  const patterns = [
    /^([^,]+),\s*participant/i,
    /participant[:\s]+([^,\.]+)/i,
    /^([^()]+)\s*\(participant\)/i,
    /^([^()]+)\s+joined/i,
    /^([^()]+)\s+is in the meeting/i,
    /^([^()]+)\s+\d+\s*$/
  ];

  for (const pattern of patterns) {
    const match = label.match(pattern);
    if (match && match[1]) {
      const name = this.extractAndCleanName({ textContent: match[1] });
      if (name && this.isHighQualityParticipantName(name)) {
        return name;
      }
    }
  }
  
  return null;
}

// Count video tiles as a fallback method
countVideoTiles(participants) {
  try {
    // Look for video containers in Google Meet
    const videoSelectors = [
      '[data-self-name]', // Self video
      '[data-participant-id]', // Other participants
      '.oIy2qc', // Video tile containers
      '.N7zPpf' // Alternative video containers
    ];
    
    let videoCount = 0;
    const seenIds = new Set();
    
    videoSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        const id = el.getAttribute('data-participant-id') || 
                  el.getAttribute('data-self-name') || 
                  el.outerHTML.substring(0, 100); // Use element signature as ID
        
        if (!seenIds.has(id)) {
          seenIds.add(id);
          videoCount++;
          
          // Try to extract name from this video tile
          const nameEl = el.querySelector('span');
          if (nameEl) {
            const name = this.extractAndCleanName(nameEl);
            if (name && this.isHighQualityParticipantName(name)) {
              participants.add(name);
            } else {
              // Add generic participant if no name found
              participants.add(`Participant ${videoCount}`);
            }
          }
        }
      });
    });
    
    console.log(`📹 Video tile fallback found ${videoCount} participants`);
  } catch (error) {
    console.warn('Video tile counting failed:', error);
  }
}

// Enhanced participant update logic with deduplication
updateParticipants(currentParticipants) {
  if (!this.trackingConsent) return;
  
  // Convert to array and deduplicate by normalizing names
  const normalizedCurrent = new Map();
  currentParticipants.forEach(name => {
    const normalized = this.normalizeName(name);
    normalizedCurrent.set(normalized, name);
  });
  
  const currentParticipantArray = Array.from(normalizedCurrent.values());
  let hasChanges = false;
  
  // Add new participants
  currentParticipantArray.forEach(name => {
    const normalized = this.normalizeName(name);
    let found = false;
    
    // Check if this participant already exists (normalized comparison)
    for (const [existingName] of this.participants) {
      if (this.normalizeName(existingName) === normalized) {
        found = true;
        const participant = this.participants.get(existingName);
        if (!participant.currentlyPresent) {
          participant.currentlyPresent = true;
          participant.totalSessions = (participant.totalSessions || 1) + 1;
          participant.joinTime = new Date().toISOString();
          participant.leaveTime = null;
          console.log(`👋 ${existingName} rejoined at ${new Date().toLocaleTimeString()}`);
          hasChanges = true;
        }
        break;
      }
    }
    
    if (!found) {
      this.addParticipant(name);
      hasChanges = true;
    }
  });

  // Mark absent participants as left
  const currentNormalized = new Set(currentParticipantArray.map(name => this.normalizeName(name)));
  this.participants.forEach((data, name) => {
    if (data.currentlyPresent && !currentNormalized.has(this.normalizeName(name))) {
      this.removeParticipant(name);
      hasChanges = true;
    }
  });

  if (hasChanges) {
    this.updateUI();
    this.saveData();
  }
}

// Name normalization for better deduplication
normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Enhanced UI update with better counting
updateUI() {
  const countElement = document.getElementById('participant-count');
  if (countElement && this.participants) {
    try {
      const currentCount = Array.from(this.participants.values())
        .filter(p => p && p.currentlyPresent).length;
      const totalCount = this.participants.size;
      
      // Show current/total format
      countElement.textContent = `Participants: ${currentCount}/${totalCount}`;
      
      // Add debug info to console
      console.log(`👥 Participant Count - Current: ${currentCount}, Total: ${totalCount}`);
      const currentNames = Array.from(this.participants.entries())
        .filter(([name, data]) => data.currentlyPresent)
        .map(([name]) => name);
      console.log(`📋 Current participants:`, currentNames);
      
    } catch (error) {
      console.error('Error updating UI:', error);
      countElement.textContent = `Participants: Error`;
    }
  }
}
  scanZoom(participants) {
    const selectors = [
      // Updated Zoom selectors (2024/2025)
      '.participants-item__display-name',
      '.video-avatar__username',
      '.gallery-video-container .video-avatar__username',
      '.participants-list__display-name',
      '[data-testid="participant-name"]', // New Zoom selector
      '.participant-name-text', // Alternative name container
      '.ReactVirtualized__Grid__innerScrollContainer .participant-name',
      '.participant-list-item .display-name'
    ];

    selectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          const name = this.extractAndValidateName(el);
          if (name) {
            participants.add(name);
          }
        });
      } catch (error) {
        // Ignore selector errors
      }
    });
  }

  scanTeams(participants) {
    const selectors = [
      // Updated Teams selectors (2024/2025)
      '[data-tid="roster-content"] .ui-chat__message__author',
      '.calling-roster-item span',
      '.ts-calling-screen [role="button"] span',
      '[data-testid="participant-name"]', // New Teams selector
      '.fui-Persona__primaryText', // Fluent UI persona names
      '.call-roster-item .display-name',
      '[data-tid="participant-display-name"]'
    ];

    selectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          const name = this.extractAndValidateName(el);
          if (name) {
            participants.add(name);
          }
        });
      } catch (error) {
        // Ignore selector errors
      }
    });
  }

  scanWebex(participants) {
    const selectors = [
      '.roster-list .participant-name',
      '.meeting-roster .participant-item',
      '.participant-list-item .name'
    ];

    selectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          const name = this.extractAndValidateName(el);
          if (name) {
            participants.add(name);
          }
        });
      } catch (error) {
        // Ignore selector errors
      }
    });
  }

  // Generic scan for unknown platforms
  scanGeneric(participants) {
    const genericSelectors = [
      '[class*="participant"]',
      '[class*="user"]',
      '[data-testid*="participant"]',
      '[data-testid*="user"]'
    ];

    genericSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          const name = this.extractAndValidateName(el);
          if (name) {
            participants.add(name);
          }
        });
      } catch (error) {
        // Ignore selector errors
      }
    });
  }

  isValidParticipantName(name) {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 2 || name.length > 100) return false; // Reasonable length limits
    if (['You', 'you', 'Me', 'me', '(You)', '(you)', '(Me)', '(me)'].includes(name)) return false;
    if (name.match(/^[\s\-_\.]+$/)) return false; // Only special characters
    if (name.match(/^\d+$/)) return false; // Only numbers
    if (name.toLowerCase().includes('joined') || name.toLowerCase().includes('left')) return false;
    return true;
  }

  extractNameFromLabel(label) {
    if (!label) return null;
    
    // Extract name from aria-label patterns
    const patterns = [
      /participant:\s*(.+)/i,
      /user:\s*(.+)/i,
      /(.+)\s+\(participant\)/i,
      /(.+)\s+joined/i,
      /(.+)\s+is in the meeting/i
    ];

    for (const pattern of patterns) {
      const match = label.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (this.isValidParticipantName(name)) {
          return name;
        }
      }
    }
    
    return null;
  }

  updateParticipants(currentParticipants) {
    // Only proceed if tracking is consented
    if (!this.trackingConsent) return;
    
    const currentParticipantArray = Array.from(currentParticipants);
    let hasChanges = false;
    
    // Add new participants
    currentParticipantArray.forEach(name => {
      if (!this.participants.has(name)) {
        this.addParticipant(name);
        hasChanges = true;
      } else {
        // Ensure they're marked as present
        const participant = this.participants.get(name);
        if (!participant.currentlyPresent) {
          participant.currentlyPresent = true;
          participant.totalSessions = (participant.totalSessions || 1) + 1;
          participant.joinTime = new Date().toISOString();
          participant.leaveTime = null;
          console.log(`👋 ${name} rejoined at ${new Date().toLocaleTimeString()}`);
          hasChanges = true;
        }
      }
    });

    // Mark absent participants as left
    this.participants.forEach((data, name) => {
      if (data.currentlyPresent && !currentParticipants.has(name)) {
        this.removeParticipant(name);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.updateUI();
      this.saveData();
    }
  }

  handleMutations(mutations) {
    // Only handle mutations if tracking is consented
    if (!this.trackingConsent) return;
    
    // Debounce mutation handling to avoid excessive calls
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }
    
    this.scanTimeout = setTimeout(() => {
      this.scanForParticipants();
    }, 1000);
  }

  addParticipant(name) {
    const now = new Date();
    const participant = {
      name: name,
      joinTime: now.toISOString(),
      leaveTime: null,
      totalSessions: 1,
      currentlyPresent: true
    };

    this.participants.set(name, participant);
    console.log(`✅ ${name} joined at ${now.toLocaleTimeString()}`);
  }

  removeParticipant(name) {
    if (this.participants.has(name)) {
      const participant = this.participants.get(name);
      participant.leaveTime = new Date().toISOString();
      participant.currentlyPresent = false;
      
      console.log(`❌ ${name} left at ${new Date().toLocaleTimeString()}`);
    }
  }

// Enhanced UI creation with modern design
createTrackingUI() {
  // Remove existing UI if present
  const existingUI = document.getElementById('meeting-tracker-ui');
  if (existingUI) {
    existingUI.remove();
  }

  const ui = document.createElement('div');
  ui.id = 'meeting-tracker-ui';
  ui.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    color: #1a1a1a;
    padding: 0;
    border-radius: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    z-index: 99999;
    min-width: 280px;
    max-width: 320px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.5);
    border: 1px solid rgba(255,255,255,0.2);
    cursor: move;
    user-select: none;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateZ(0);
  `;
  
  ui.innerHTML = `
    <!-- Header -->
    <div style="
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
    ">
      <div style="
        background: rgba(255,255,255,0.2);
        border-radius: 8px;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
        </svg>
      </div>
      <div style="flex: 1;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">
          Meeting Tracker
        </div>
        <div style="font-size: 11px; opacity: 0.9;">
          ${this.formatPlatformName(this.platform)}
        </div>
      </div>
      <div id="status-indicator" style="
        width: 8px;
        height: 8px;
        background: #10b981;
        border-radius: 50%;
        animation: pulse 2s infinite;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
      "></div>
    </div>

    <!-- Content -->
    <div style="padding: 20px;">
      <!-- Participant Count -->
      <div style="
        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        border: 1px solid rgba(0,0,0,0.05);
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        ">
          <div style="
            background: #6366f1;
            color: white;
            border-radius: 6px;
            padding: 4px;
            display: flex;
            align-items: center;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A2.996 2.996 0 0 0 17.06 6H16c-.8 0-1.53.5-1.83 1.25L12.5 11.5 10 8H7.5c-.28 0-.5.22-.5.5s.22.5.5.5H9l3 4-1.5 6H7v2h10v-6z"/>
            </svg>
          </div>
          <span style="font-weight: 600; color: #374151;">Participants</span>
        </div>
        <div id="participant-count" style="
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          line-height: 1;
        ">0/0</div>
        <div style="
          font-size: 11px;
          color: #6b7280;
          margin-top: 4px;
        ">Current / Total</div>
      </div>

      <!-- Session Info -->
      <div style="
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      ">
        <div style="
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        ">
          <div style="font-size: 11px; color: #065f46; margin-bottom: 4px;">Duration</div>
          <div id="session-time" style="font-size: 13px; font-weight: 600; color: #047857;">0m 0s</div>
        </div>
        <div style="
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        ">
          <div style="font-size: 11px; color: #1e40af; margin-bottom: 4px;">Status</div>
          <div style="font-size: 13px; font-weight: 600; color: #1d4ed8;">
            <span id="tracking-status">Active</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <button id="stop-tracking" style="
          flex: 1;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(239, 68, 68, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z"/>
          </svg>
          Stop Tracking
        </button>
        <button id="minimize-ui" style="
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
          border: 1px solid rgba(107, 114, 128, 0.2);
          padding: 10px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        " onmouseover="this.style.background='rgba(107, 114, 128, 0.2)'" onmouseout="this.style.background='rgba(107, 114, 128, 0.1)'">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13H5v-2h14v2z"/>
          </svg>
        </button>
      </div>

      <!-- Footer -->
      <div style="
        text-align: center;
        padding-top: 12px;
        border-top: 1px solid rgba(0,0,0,0.1);
      ">
        <button id="tracker-ui-clickable" style="
          background: none;
          border: none;
          color: #6b7280;
          font-size: 11px;
          cursor: pointer;
          text-decoration: underline;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='rgba(107, 114, 128, 0.1)'; this.style.color='#374151'" onmouseout="this.style.background='none'; this.style.color='#6b7280'">
          📊 View Details
        </button>
      </div>
    </div>

    <!-- Animations -->
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      #meeting-tracker-ui:hover {
        box-shadow: 0 25px 50px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.6) !important;
        transform: translateY(-2px) !important;
      }
      
      @media (max-width: 768px) {
        #meeting-tracker-ui {
          right: 10px !important;
          top: 10px !important;
          min-width: 260px !important;
          max-width: 280px !important;
        }
      }
    </style>
  `;
  
  if (document.body) {
    document.body.appendChild(ui);
    this.makeDraggable(ui);
    this.updateSessionTime();
    
    // Add event listeners with enhanced functionality
    this.setupUIEventListeners();
  }
}

// Enhanced event listeners
setupUIEventListeners() {
  const stopButton = document.getElementById('stop-tracking');
  if (stopButton) {
    stopButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.stopTracking();
    });
  }
  
  const minimizeButton = document.getElementById('minimize-ui');
  if (minimizeButton) {
    minimizeButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.minimizeUI();
    });
  }
  
  const detailsButton = document.getElementById('tracker-ui-clickable');
  if (detailsButton) {
    detailsButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.openDetails();
    });
  }
}

// Minimize/maximize functionality
minimizeUI() {
  const ui = document.getElementById('meeting-tracker-ui');
  if (!ui) return;
  
  const isMinimized = ui.dataset.minimized === 'true';
  
  if (isMinimized) {
    // Restore
    ui.style.height = 'auto';
    ui.style.width = '280px';
    ui.dataset.minimized = 'false';
    ui.querySelector('#minimize-ui svg').innerHTML = '<path d="M19 13H5v-2h14v2z"/>';
  } else {
    // Minimize
    ui.style.height = '60px';
    ui.style.width = '200px';
    ui.dataset.minimized = 'true';
    ui.querySelector('#minimize-ui svg').innerHTML = '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>';
    
    // Hide content except header
    const content = ui.children[1];
    if (content) {
      content.style.display = isMinimized ? 'block' : 'none';
    }
  }
}

// Enhanced UI updates with animations
updateUI() {
  const countElement = document.getElementById('participant-count');
  const statusElement = document.getElementById('tracking-status');
  
  if (countElement && this.participants) {
    try {
      const currentCount = Array.from(this.participants.values())
        .filter(p => p && p.currentlyPresent).length;
      const totalCount = this.participants.size;
      
      // Animate count change
      const newText = `${currentCount}/${totalCount}`;
      if (countElement.textContent !== newText) {
        countElement.style.transform = 'scale(1.1)';
        countElement.style.color = '#6366f1';
        
        setTimeout(() => {
          countElement.textContent = newText;
          countElement.style.transform = 'scale(1)';
          countElement.style.color = '#1f2937';
        }, 150);
      }
      
      // Update status
      if (statusElement) {
        statusElement.textContent = currentCount > 0 ? 'Active' : 'Waiting';
      }
      
    } catch (error) {
      console.error('Error updating UI:', error);
      if (countElement) {
        countElement.textContent = 'Error';
        countElement.style.color = '#ef4444';
      }
    }
  }
}

// Enhanced session time display
updateSessionTime() {
  if (this.sessionTimeInterval) {
    clearInterval(this.sessionTimeInterval);
  }
  
  const updateTime = () => {
    const timeElement = document.getElementById('session-time');
    if (timeElement && this.startTime) {
      try {
        const duration = Date.now() - new Date(this.startTime).getTime();
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        let timeString;
        if (hours > 0) {
          timeString = `${hours}h ${minutes}m`;
        } else {
          timeString = `${minutes}m ${seconds}s`;
        }
        
        timeElement.textContent = timeString;
      } catch (error) {
        console.error('Error updating session time:', error);
        timeElement.textContent = 'Error';
      }
    }
  };

  updateTime();
  this.sessionTimeInterval = setInterval(updateTime, 1000);
}

// Better details functionality
openDetails() {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: 'openPopupOrShowDetails' });
  } else {
    // Fallback: show details in a modal
    this.showDetailsModal();
  }
}

// Details modal as fallback
showDetailsModal() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 999999;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(5px);
  `;
  
  const participants = Array.from(this.participants.entries()).map(([name, data]) => ({
    name,
    status: data.currentlyPresent ? 'Present' : 'Left',
    joinTime: data.joinTime,
  }));

  // Create and show the modal
  const modalContent = this.createDetailsModalContent(participants);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
      element.style.cursor = 'grabbing';
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      const newTop = Math.max(0, element.offsetTop - pos2);
      const newLeft = Math.max(0, element.offsetLeft - pos1);
      
      element.style.top = newTop + "px";
      element.style.left = newLeft + "px";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
      element.style.cursor = 'move';
    }
  }

  updateUI() {
    const countElement = document.getElementById('participant-count');
    if (countElement && this.participants) {
      try {
        const currentCount = Array.from(this.participants.values())
          .filter(p => p && p.currentlyPresent).length;
        const totalCount = this.participants.size;
        countElement.textContent = `Participants: ${currentCount}/${totalCount}`;
      } catch (error) {
        console.error('Error updating UI:', error);
      }
    }
  }

  saveData() {
    // Only save data if tracking is consented
    if (!this.trackingConsent) return;
    
    try {
      const data = {
        sessionId: this.sessionId,
        platform: this.platform,
        url: window.location.href,
        startTime: this.startTime,
        lastUpdated: new Date().toISOString(),
        participants: Object.fromEntries(this.participants),
        trackingConsented: this.trackingConsent
      };

      // Use background script for storage (more reliable)
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'saveParticipantData',
          sessionId: this.sessionId,
          data: data
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('Storage via background failed:', chrome.runtime.lastError.message);
            this.fallbackStorage(data);
          }
        });
      } else {
        this.fallbackStorage(data);
      }
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  fallbackStorage(data) {
    try {
      // Fallback to localStorage if Chrome storage fails
      const storageData = JSON.stringify(data);
      localStorage.setItem(`meeting_tracker_${this.sessionId}`, storageData);
      localStorage.setItem('meeting_tracker_current', this.sessionId);
    } catch (error) {
      console.error('Fallback storage also failed:', error);
    }
  }

  exportData() {
    try {
      return {
        sessionId: this.sessionId,
        platform: this.platform,
        url: window.location.href,
        startTime: this.startTime,
        trackingConsented: this.trackingConsent,
        participants: Array.from(this.participants.entries()).map(([name, data]) => ({
          name,
          joinTime: data.joinTime,
          leaveTime: data.leaveTime,
          totalSessions: data.totalSessions || 1,
          currentlyPresent: Boolean(data.currentlyPresent),
          duration: data.leaveTime ? 
            new Date(data.leaveTime).getTime() - new Date(data.joinTime).getTime() : 
            Date.now() - new Date(data.joinTime).getTime()
        }))
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  // Method to reset consent and show modal again
  resetConsent() {
    this.trackingConsent = false;
    this.consentModalShown = false;
    if (this.consentModal) {
      this.consentModal.remove();
      this.consentModal = null;
    }
    this.showConsentModal();
  }

  cleanup() {
    console.log('🧹 Cleaning up Meeting Tracker');
    
    try {
      // Clean up observers
      this.observers.forEach(observer => {
        try {
          observer.disconnect();
        } catch (error) {
          console.warn('Error disconnecting observer:', error);
        }
      });
      this.observers = [];
      
      // Clear intervals
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      
      if (this.sessionTimeInterval) {
        clearInterval(this.sessionTimeInterval);
        this.sessionTimeInterval = null;
      }
      
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
        this.scanTimeout = null;
      }
      
      // Remove UI
      const ui = document.getElementById('meeting-tracker-ui');
      if (ui) {
        ui.remove();
      }
      
      // Remove consent modal if still open
      if (this.consentModal) {
        this.consentModal.remove();
        this.consentModal = null;
      }
      
      // Save final data if tracking was consented
      if (this.trackingConsent) {
        this.saveData();
      }
      
      this.isTracking = false;
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Global tracker instancee
let tracker = null;

// Initialize tracker
function initializeTracker() {
  try {
    if (tracker) {
      tracker.cleanup();
    }
    tracker = new MeetingTracker();
  } catch (error) {
    console.error('Error initializing tracker:', error);
  }
}

// Wait for page to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTracker);
} else {
  // Small delay to ensure page is fully loaded
  setTimeout(initializeTracker, 1000);
}

// Listen for messages from popup
// Add these message handlers to your existing content script
// Insert this code at the end of your content script, before the cleanup section

// Enhanced message listener for popup communication
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      switch (request.action) {
        case 'getData':
          const data = tracker ? tracker.exportData() : null;
          sendResponse(data);
          break;
          
        case 'getTrackingStatus':
          sendResponse({ 
            isTracking: tracker ? tracker.isTracking : false,
            hasConsent: tracker ? tracker.trackingConsent : false,
            platform: tracker ? tracker.platform : 'unknown'
          });
          break;
          
        case 'setConsent':
          if (tracker) {
            tracker.handleConsentResponse(request.consent, request.remember || false);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Tracker not initialized' });
          }
          break;
          
        case 'resetConsent':
          if (tracker) {
            tracker.resetConsent();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Tracker not initialized' });
          }
          break;
          
        case 'stopTracking':
          if (tracker) {
            tracker.stopTracking();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Tracker not initialized' });
          }
          break;
          
        case 'ping':
          // Health check for popup
          sendResponse({ 
            pong: true, 
            platform: tracker ? tracker.platform : 'unknown',
            isReady: Boolean(tracker)
          });
          break;
          
        case 'enableTracking':
          if (tracker) {
            tracker.trackingConsent = true;
            tracker.startTracking();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Tracker not initialized' });
          }
          break;
          
        default:
          console.log('Unknown message action:', request.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async responses
  });
}

// Add method to notify popup of data changes
if (tracker) {
  // Override the existing saveData method to also notify popup
  const originalSaveData = tracker.saveData.bind(tracker);
  tracker.saveData = function() {
    originalSaveData();
    
    // Notify popup of data update
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage({
          action: 'updatePopupData',
          data: this.exportData()
        }).catch(() => {
          // Popup might not be open, ignore error
        });
      } catch (error) {
        // Ignore popup communication errors
      }
    }
  };
  
  // Override consent response to notify popup
  const originalHandleConsent = tracker.handleConsentResponse.bind(tracker);
  tracker.handleConsentResponse = function(consent, remember) {
    originalHandleConsent(consent, remember);
    
    // Notify popup of consent change
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage({
          action: 'trackingStatusChanged',
          status: consent ? 'enabled' : 'disabled',
          hasConsent: consent
        }).catch(() => {
          // Popup might not be open, ignore error
        });
      } catch (error) {
        // Ignore popup communication errors
      }
    }
  };
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (tracker) {
    tracker.cleanup();
  }
});

// Handle page navigation (SPA support)
let currentUrl = window.location.href;
const navigationCheckInterval = setInterval(() => {
  try {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      console.log('🔄 Page navigation detected, reinitializing tracker');
      initializeTracker();
    }
  } catch (error) {
    console.error('Error in navigation check:', error);
  }
}, 2000);

// Clean up navigation interval on page unload
window.addEventListener('beforeunload', () => {
  if (navigationCheckInterval) {
    clearInterval(navigationCheckInterval);
  }
});