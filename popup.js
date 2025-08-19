document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Popup loaded');
  
  const loadingDiv = document.getElementById('loading');
  const noMeetingDiv = document.getElementById('no-meeting');
  const contentDiv = document.getElementById('content');
  const consentDiv = document.getElementById('consent-section');
  
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !isMeetingPlatform(tab.url)) {
      showNoMeeting();
      return;
    }

    // Check tracking status first
    const trackingStatus = await sendMessageWithTimeout(tab.id, { action: 'getTrackingStatus' }, 3000);
    
    if (trackingStatus) {
      if (!trackingStatus.hasConsent) {
        showConsentSection();
      } else if (trackingStatus.isTracking) {
        // Get data from content script
        const response = await sendMessageWithTimeout(tab.id, { action: 'getData' }, 3000);
        if (response) {
          displayMeetingData(response);
        } else {
          await loadFromStorage();
        }
      } else {
        showTrackingDisabled();
      }
    } else {
      // Fallback to storage if no response
      await loadFromStorage();
    }

  } catch (error) {
    console.error('Error loading meeting data:', error);
    showNoMeeting();
  }

  setupEventListeners();
});

/**
 * Send message with timeout to content script
 */
function sendMessageWithTimeout(tabId, message, timeout = 3000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(null);
    }, timeout);

    chrome.tabs.sendMessage(tabId, message, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        console.log('Content script error:', chrome.runtime.lastError.message);
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Check if URL is a supported meeting platform
 */
function isMeetingPlatform(url) {
  if (!url) return false;
  const meetingPlatforms = [
    'meet.google.com',
    'zoom.us',
    'teams.microsoft.com',
    'webex.com'
  ];
  return meetingPlatforms.some(platform => url.includes(platform));
}

function showNoMeeting() {
  hideAllSections();
  document.getElementById('no-meeting')?.classList.remove('hidden');
}

function showContent() {
  hideAllSections();
  document.getElementById('content')?.classList.remove('hidden');
}

function showLoading() {
  hideAllSections();
  document.getElementById('loading')?.classList.remove('hidden');
}

function showConsentSection() {
  hideAllSections();
  const consentDiv = document.getElementById('consent-section');
  if (consentDiv) {
    consentDiv.classList.remove('hidden');
  } else {
    createConsentSection();
  }
}

function showTrackingDisabled() {
  hideAllSections();
  const disabledDiv = document.getElementById('tracking-disabled');
  if (disabledDiv) {
    disabledDiv.classList.remove('hidden');
  } else {
    createTrackingDisabledSection();
  }
}

function hideAllSections() {
  ['loading', 'no-meeting', 'content', 'consent-section', 'tracking-disabled'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });
}

function createConsentSection() {
  const existingConsent = document.getElementById('consent-section');
  if (existingConsent) return;

  const consentHTML = `
    <div id="consent-section" class="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div class="text-center mb-6">
        <div class="text-4xl mb-3">📊</div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">Meeting Tracker Consent</h3>
        <p class="text-sm text-gray-600 leading-relaxed">
          We've detected a meeting in progress. Would you like to enable participant tracking for this session?
        </p>
      </div>
      
      <div class="bg-white p-4 rounded-lg border border-blue-100 mb-6">
        <h4 class="font-medium text-gray-800 mb-2">What we track:</h4>
        <ul class="text-sm text-gray-600 space-y-1">
          <li>• Participant names and join/leave times</li>
          <li>• Session duration and attendance stats</li>
          <li>• All data stays on your device</li>
        </ul>
      </div>
      
      <div class="flex gap-3 mb-4">
        <button id="consent-yes-popup" class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
          ✓ Yes, Enable Tracking
        </button>
        <button id="consent-no-popup" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-all duration-200 border border-gray-300">
          ✗ No Thanks
        </button>
      </div>
      
      <div class="flex items-center justify-center space-x-2 text-sm text-gray-500">
        <input type="checkbox" id="remember-choice-popup" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
        <label for="remember-choice-popup" class="cursor-pointer">Remember my choice</label>
      </div>
      
      <p class="text-xs text-gray-400 text-center mt-3">
        You can change this anytime in extension settings
      </p>
    </div>
  `;

  // Insert after the main content or at the end of body
  const container = document.querySelector('.container') || document.body;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = consentHTML;
  container.appendChild(tempDiv.firstElementChild);

  // Add event listeners for consent buttons
  setupConsentListeners();
}

/**
 * Create tracking disabled section
 */
function createTrackingDisabledSection() {
  const existingDisabled = document.getElementById('tracking-disabled');
  if (existingDisabled) return;

  const disabledHTML = `
    <div id="tracking-disabled" class="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200">
      <div class="text-center mb-6">
        <div class="text-4xl mb-3">🚫</div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">Tracking Disabled</h3>
        <p class="text-sm text-gray-600 leading-relaxed">
          Meeting participant tracking is currently disabled for this session.
        </p>
      </div>
      
      <div class="flex gap-3 mb-4">
        <button id="enable-tracking-btn" class="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
          Enable Tracking
        </button>
      </div>
      
      <p class="text-xs text-gray-500 text-center">
        Click "Enable Tracking" to start monitoring participants
      </p>
    </div>
  `;

  const container = document.querySelector('.container') || document.body;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = disabledHTML;
  container.appendChild(tempDiv.firstElementChild);

  document.getElementById('enable-tracking-btn')?.addEventListener('click', async () => {
    await enableTracking();
  });
}


function setupConsentListeners() {
  const yesButton = document.getElementById('consent-yes-popup');
  const noButton = document.getElementById('consent-no-popup');
  const rememberCheckbox = document.getElementById('remember-choice-popup');

  yesButton?.addEventListener('click', async () => {
    await handleConsentResponse(true, rememberCheckbox?.checked || false);
  });

  noButton?.addEventListener('click', async () => {
    await handleConsentResponse(false, rememberCheckbox?.checked || false);
  });
}


async function handleConsentResponse(consent, remember) {
  try {
    showLoading();

    // Save preference if remember is checked
    if (remember) {
      const preferenceData = {
        'tracking_preference': consent ? 'always' : 'never',
        'preference_timestamp': Date.now()
      };
      await chrome.storage.local.set(preferenceData);
    }

    // Get current tab and send message to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      if (consent) {
        // Trigger consent acceptance in content script
        await sendMessageWithTimeout(tab.id, { 
          action: 'setConsent', 
          consent: true,
          remember: remember 
        }, 3000);
        
        // Wait a moment then get data
        setTimeout(async () => {
          const response = await sendMessageWithTimeout(tab.id, { action: 'getData' }, 3000);
          if (response) {
            displayMeetingData(response);
          } else {
            showToast('Tracking enabled! Data will appear as participants join.', 'success');
            showContent();
          }
        }, 1000);
      } else {
        // Send decline message
        await sendMessageWithTimeout(tab.id, { 
          action: 'setConsent', 
          consent: false,
          remember: remember 
        }, 3000);
        
        showTrackingDisabled();
        showToast('Tracking disabled for this session.', 'info');
      }
    }

  } catch (error) {
    console.error('Error handling consent:', error);
    showToast('Error processing consent. Please try again.', 'error');
  }
}


async function enableTracking() {
  try {
    showLoading();
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      // Send enable message to content script
      await sendMessageWithTimeout(tab.id, { 
        action: 'setConsent', 
        consent: true,
        remember: false 
      }, 3000);
      
      // Wait then get data
      setTimeout(async () => {
        const response = await sendMessageWithTimeout(tab.id, { action: 'getData' }, 3000);
        if (response) {
          displayMeetingData(response);
        } else {
          showContent();
          showToast('Tracking enabled! Data will appear as participants join.', 'success');
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Error enabling tracking:', error);
    showToast('Error enabling tracking. Please try again.', 'error');
  }
}

async function loadFromStorage() {
  try {
    const result = await chrome.storage.local.get(['currentSession']);
    if (result.currentSession) {
      const sessionData = await chrome.storage.local.get([result.currentSession]);
      if (sessionData[result.currentSession]) {
        const convertedData = convertStorageData(sessionData[result.currentSession]);
        if (convertedData) {
          displayMeetingData(convertedData);
          return;
        }
      }
    }
    
    // Try to load recent sessions
    const allData = await chrome.storage.local.get(null);
    const sessions = Object.keys(allData).filter(key => key.startsWith('session_'));
    
    if (sessions.length > 0) {
      const latestSession = sessions
        .sort((a, b) => {
          const timeA = parseInt(a.split('_')[1]) || 0;
          const timeB = parseInt(b.split('_')[1]) || 0;
          return timeB - timeA;
        })[0];
      
      if (allData[latestSession]) {
        const convertedData = convertStorageData(allData[latestSession]);
        if (convertedData) {
          displayMeetingData(convertedData);
          return;
        }
      }
    }
    
    showNoMeeting();
  } catch (error) {
    console.error('Error loading from storage:', error);
    showNoMeeting();
  }
}


function convertStorageData(storageData) {
  if (!storageData?.participants) return null;

  const participants = storageData.participants || {};
  
  return {
    sessionId: storageData.sessionId,
    platform: storageData.platform,
    url: storageData.url,
    startTime: storageData.startTime,
    trackingConsented: storageData.trackingConsented,
    participants: Object.entries(participants).map(([name, data]) => {
      if (!data || typeof data !== 'object') {
        console.warn(`Invalid participant data for ${name}:`, data);
        return null;
      }
      
      const joinTime = data.joinTime ? new Date(data.joinTime) : new Date();
      const leaveTime = data.leaveTime ? new Date(data.leaveTime) : null;
      const duration = leaveTime ? 
        leaveTime.getTime() - joinTime.getTime() : 
        Date.now() - joinTime.getTime();
      
      return {
        name,
        joinTime: joinTime.toISOString(),
        leaveTime: leaveTime ? leaveTime.toISOString() : null,
        totalSessions: data.totalSessions || 1,
        currentlyPresent: Boolean(data.currentlyPresent),
        duration: Math.max(0, duration)
      };
    }).filter(Boolean)
  };
}


function displayMeetingData(data) {
  if (!data?.participants) {
    showNoMeeting();
    return;
  }

  showContent();

  // Update statistics
  updateElement('platform', formatPlatformName(data.platform));
  updateElement('total-participants', data.participants.length);
  updateElement('current-participants', data.participants.filter(p => p.currentlyPresent).length);

  // Update platform styling
  const platformElement = document.getElementById('platform');
  if (platformElement) {
    platformElement.className = `font-semibold platform-${data.platform?.replace('-', '') || 'unknown'}`;
  }

  // Format times
  if (data.startTime) {
    updateElement('start-time', formatTime(new Date(data.startTime)));
    updateSessionDuration(data.startTime);
  }

  // Display participants
  displayParticipants(data.participants);

  // Store current data for export
  window.currentMeetingData = data;
}
function updateElement(id, content) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = content;
  }
}

// Update live timer with proper intervals 
let durationUpdateInterval = null;

function updateSessionDuration(startTime) {
  if (durationUpdateInterval) {
    clearInterval(durationUpdateInterval);
  }

  const sessionDurationElement = document.getElementById('session-duration');
  if (!sessionDurationElement) return;

  const updateDuration = () => {
    try {
      const duration = Date.now() - new Date(startTime).getTime();
      sessionDurationElement.textContent = formatDuration(Math.max(0, duration));
    } catch (error) {
      console.error('Error updating duration:', error);
    }
  };

  updateDuration();
  durationUpdateInterval = setInterval(updateDuration, 1000);
}

/**
 * Format platform name for display
 */
function formatPlatformName(platform) {
  const platformNames = {
    'google-meet': 'Google Meet',
    'zoom': 'Zoom',
    'teams': 'Microsoft Teams',
    'webex': 'Webex',
    'unknown': 'Unknown Platform'
  };
  return platformNames[platform] || platform || 'Unknown Platform';
}

/**
 * Format time for display
 */
function formatTime(date) {
  if (!date || isNaN(date.getTime())) {
    return 'Invalid time';
  }
  
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format duration in milliseconds to readable string
 */
function formatDuration(milliseconds) {
  if (isNaN(milliseconds) || milliseconds < 0) {
    return '0s';
  }
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get duration class for styling
 */
function getDurationClass(duration) {
  if (isNaN(duration)) return 'duration-short';
  
  const minutes = duration / 60000;
  if (minutes < 5) return 'duration-short';
  if (minutes < 30) return 'duration-medium';
  return 'duration-long';
}

/**
 * Display participants list
 */
function displayParticipants(participants) {
  const container = document.getElementById('participants-container');
  if (!container) return;
  
  container.innerHTML = '';

  if (!participants || participants.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 space-y-3 opacity-70">
        <div class="text-4xl">👥</div>
        <p class="text-sm">No participants detected yet</p>
        <p class="text-xs opacity-60">Participants will appear as they join the meeting</p>
      </div>
    `;
    return;
  }

  // Sort participants: current first, then by join time
  const sortedParticipants = participants.sort((a, b) => {
    if (a.currentlyPresent !== b.currentlyPresent) {
      return a.currentlyPresent ? -1 : 1;
    }
    return new Date(a.joinTime).getTime() - new Date(b.joinTime).getTime();
  });

  sortedParticipants.forEach((participant, index) => {
    if (!participant?.name) return;
    
    const participantDiv = document.createElement('div');
    participantDiv.className = 'participant-card';
    
    const statusClass = participant.currentlyPresent ? 'status-online' : 'status-offline';
    const joinTime = formatTime(new Date(participant.joinTime));
    const leaveTime = participant.leaveTime ? formatTime(new Date(participant.leaveTime)) : 'Present';
    const duration = formatDuration(participant.duration || 0);
    const durationClass = getDurationClass(participant.duration || 0);
    
    const statusText = participant.currentlyPresent ? 
      '<span class="text-green-400">🟢 Present</span>' : 
      `<span class="text-red-400">🔴 Left at ${leaveTime}</span>`;
    
    participantDiv.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="status-dot ${statusClass}"></div>
          <span class="participant-name">${escapeHtml(participant.name)}</span>
        </div>
        <div class="session-badge">${participant.totalSessions || 1}x</div>
      </div>
      <div class="participant-details">
        <div class="detail-item">
          <div class="detail-label">Joined</div>
          <div class="detail-value">${joinTime}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Duration</div>
          <div class="detail-value ${durationClass}">${duration}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Status</div>
          <div class="detail-value">${statusText}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Sessions</div>
          <div class="detail-value">${participant.totalSessions || 1} time${(participant.totalSessions || 1) > 1 ? 's' : ''}</div>
        </div>
      </div>
    `;
    
    // Add animation delay for staggered appearance
    participantDiv.style.animationDelay = `${index * 100}ms`;
    participantDiv.classList.add('animate-fade-in');
    
    container.appendChild(participantDiv);
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Setup event listeners for buttons
 */
function setupEventListeners() {
  // Export button
  document.getElementById('export-btn')?.addEventListener('click', () => {
    if (window.currentMeetingData) {
      exportData(window.currentMeetingData);
    } else {
      showToast('No data available to export', 'error');
    }
  });

  // Refresh button
  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    showLoading();
    setTimeout(() => {
      window.location.reload();
    }, 500);
  });

  // Clear button
  document.getElementById('clear-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all tracking data? This cannot be undone.')) {
      clearAllData();
    }
  });

  // Reset consent button
  document.getElementById('reset-consent-btn')?.addEventListener('click', async () => {
    await resetConsent();
  });

  // Stop tracking button
  document.getElementById('stop-tracking-btn')?.addEventListener('click', async () => {
    await stopTracking();
  });
}

/**
 * Reset consent and show modal again
 */
async function resetConsent() {
  try {
    // Clear stored preference
    await chrome.storage.local.remove(['tracking_preference', 'preference_timestamp']);
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await sendMessageWithTimeout(tab.id, { action: 'resetConsent' }, 3000);
    }
    
    showToast('Consent reset! The page will show the consent modal again.', 'success');
    
    // Refresh popup after delay
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('Error resetting consent:', error);
    showToast('Error resetting consent. Please try again.', 'error');
  }
}

/**
 * Stop tracking for current session
 */
async function stopTracking() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await sendMessageWithTimeout(tab.id, { action: 'stopTracking' }, 3000);
    }
    
    showTrackingDisabled();
    showToast('Tracking stopped for this session.', 'info');
    
  } catch (error) {
    console.error('Error stopping tracking:', error);
    showToast('Error stopping tracking. Please try again.', 'error');
  }
}

/**
 * Export data to JSON and CSV
 */
function exportData(data) {
  try {
    if (!data?.participants) {
      showToast('No valid data to export', 'error');
      return;
    }
    
    const exportData = {
      sessionInfo: {
        sessionId: data.sessionId,
        platform: formatPlatformName(data.platform),
        url: data.url,
        startTime: data.startTime,
        exportTime: new Date().toISOString(),
        sessionDuration: data.startTime ? Date.now() - new Date(data.startTime).getTime() : 0
      },
      summary: {
        totalParticipants: data.participants.length,
        currentlyPresent: data.participants.filter(p => p?.currentlyPresent).length,
        totalSessions: data.participants.reduce((sum, p) => sum + (p?.totalSessions || 1), 0),
        averageDuration: data.participants.length > 0 ? 
          data.participants.reduce((sum, p) => sum + (p?.duration || 0), 0) / data.participants.length : 0
      },
      participants: data.participants.filter(p => p?.name).map(p => ({
        name: p.name,
        joinTime: p.joinTime,
        leaveTime: p.leaveTime || 'Still present',
        duration: formatDuration(p.duration || 0),
        durationMs: p.duration || 0,
        totalSessions: p.totalSessions || 1,
        currentlyPresent: Boolean(p.currentlyPresent)
      }))
    };

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const platform = (data.platform || 'unknown').replace('-', '_');
    
    // Export JSON
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    downloadFile(jsonBlob, `meeting_tracker_${platform}_${timestamp}.json`);

    // Export CSV after delay
    setTimeout(() => exportCSV(exportData.participants, platform, timestamp), 500);
    
    showToast('Data exported successfully! Check your Downloads folder.', 'success');
    
  } catch (error) {
    console.error('Export error:', error);
    showToast('Error exporting data. Please try again.', 'error');
  }
}

/**
 * Export CSV file
 */
function exportCSV(participants, platform, timestamp) {
  try {
    if (!participants || participants.length === 0) {
      showToast('No participants data to export to CSV', 'error');
      return;
    }
    
    const csvHeader = ['Name', 'Join Time', 'Leave Time', 'Duration', 'Duration (minutes)', 'Total Sessions', 'Currently Present'];
    const csvRows = participants.map(p => [
      p.name || '',
      p.joinTime ? new Date(p.joinTime).toLocaleString() : '',
      p.leaveTime && p.leaveTime !== 'Still present' ? new Date(p.leaveTime).toLocaleString() : 'Still present',
      p.duration || '0s',
      Math.round((p.durationMs || 0) / 60000),
      p.totalSessions || 1,
      p.currentlyPresent ? 'Yes' : 'No'
    ]);

    const csvContent = [csvHeader, ...csvRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(csvBlob, `meeting_participants_${platform}_${timestamp}.csv`);
    
  } catch (error) {
    console.error('CSV export error:', error);
    showToast('Error exporting CSV file', 'error');
  }
}

/**
 * Download file helper
 */
function downloadFile(blob, filename) {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Download error:', error);
    showToast('Error downloading file', 'error');
  }
}

/**
 * Clear all stored data
 */
async function clearAllData() {
  try {
    await chrome.storage.local.clear();
    
    updateElement('total-participants', '0');
    updateElement('current-participants', '0');
    
    const participantsContainer = document.getElementById('participants-container');
    if (participantsContainer) {
      participantsContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 space-y-3 opacity-70">
          <div class="text-4xl">🗑️</div>
          <p class="text-sm">All data cleared</p>
          <p class="text-xs opacity-60">The page will refresh shortly</p>
        </div>
      `;
    }
    
    showToast('All data cleared successfully!', 'success');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('Error clearing data:', error);
    showToast('Error clearing data. Please try again.', 'error');
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  if (!toast || !toastMessage) {
    // Create toast if it doesn't exist
    createToastElement();
    return showToast(message, type);
  }
  
  toastMessage.textContent = message;
  
  // Set toast style based on type
  const baseClasses = 'fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 text-white';
  const typeClasses = {
    'success': 'bg-green-600',
    'error': 'bg-red-600',
    'info': 'bg-blue-600',
    'warning': 'bg-yellow-600'
  };
  
  toast.className = `${baseClasses} ${typeClasses[type] || typeClasses.success} animate-slide-down`;
  toast.classList.remove('hidden');
  
  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.add('animate-slide-up');
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.classList.remove('animate-slide-up');
    }, 300);
  }, 3000);
}

/**
 * Create toast element if it doesn't exist
 */
function createToastElement() {
  if (document.getElementById('toast')) return;
  
  const toastHTML = `
    <div id="toast" class="hidden">
      <span id="toast-message"></span>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', toastHTML);
  
  // Add CSS animations if not present
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .animate-slide-down {
        animation: slideDown 0.3s ease-out;
      }
      .animate-slide-up {
        animation: slideUp 0.3s ease-in;
      }
      .animate-fade-in {
        animation: fadeIn 0.5s ease-out;
      }
      @keyframes slideDown {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, -100%); opacity: 0; }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
      }
      .status-online {
        background-color: #10b981;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
      }
      .status-offline {
        background-color: #ef4444;
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
      }
      .participant-card {
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        transition: all 0.2s ease;
      }
      .participant-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      .participant-name {
        font-weight: 600;
        color: #1e293b;
      }
      .session-badge {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }
      .participant-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 8px;
      }
      .detail-item {
        display: flex;
        flex-direction: column;
      }
      .detail-label {
        font-size: 11px;
        color: #64748b;
        font-weight: 500;
        margin-bottom: 2px;
      }
      .detail-value {
        font-size: 12px;
        color: #334155;
        font-weight: 600;
      }
      .duration-short { color: #f59e0b; }
      .duration-medium { color: #3b82f6; }
      .duration-long { color: #10b981; }
      .platform-googlemeet { color: #34a853; }
      .platform-zoom { color: #2d8cff; }
      .platform-teams { color: #464eb8; }
      .platform-webex { color: #00bceb; }
      .platform-unknown { color: #6b7280; }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Auto-refresh functionality
 */
let autoRefreshInterval;

function startAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  
  autoRefreshInterval = setInterval(async () => {
    const contentDiv = document.getElementById('content');
    if (!contentDiv || contentDiv.classList.contains('hidden')) {
      return;
    }
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && isMeetingPlatform(tab.url)) {
        const response = await sendMessageWithTimeout(tab.id, { action: 'getData' }, 2000);
        if (response && window.currentMeetingData) {
          // Only update if we have existing data to avoid flickering
          displayMeetingData(response);
        }
      }
    } catch (error) {
      console.error('Auto-refresh error:', error);
    }
  }, 15000); // Refresh every 15 seconds
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
  
  if (durationUpdateInterval) {
    clearInterval(durationUpdateInterval);
    durationUpdateInterval = null;
  }
}

/**
 * Handle visibility changes for auto-refresh
 */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAutoRefresh();
  } else {
    startAutoRefresh();
  }
});

/**
 * Enhanced message listener for content script communication
 */
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      switch (request.action) {
        case 'updatePopupData':
          if (request.data) {
            displayMeetingData(request.data);
          }
          break;
        case 'consentRequired':
          showConsentSection();
          break;
        case 'trackingStatusChanged':
          if (request.status === 'enabled') {
            showContent();
          } else if (request.status === 'disabled') {
            showTrackingDisabled();
          }
          break;
        default:
          console.log('Unknown message action:', request.action);
      }
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  });
}

/**
 * Initialize auto-refresh and create necessary elements
 */
function initializePopup() {
  createToastElement();
  startAutoRefresh();
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
});

/**
 * Enhanced error handling for tab communication
 */
async function safeTabMessage(tabId, message, timeout = 3000) {
  try {
    return await sendMessageWithTimeout(tabId, message, timeout);
  } catch (error) {
    console.error('Tab communication error:', error);
    showToast('Unable to communicate with meeting page. Please refresh the meeting tab.', 'warning');
    return null;
  }
}

/**
 * Check if content script is loaded and responsive
 */
async function checkContentScriptStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !isMeetingPlatform(tab.url)) {
      return false;
    }
    
    const response = await sendMessageWithTimeout(tab.id, { action: 'ping' }, 2000);
    return Boolean(response);
  } catch (error) {
    console.error('Content script check failed:', error);
    return false;
  }
}

/**
 * Initialize popup with proper error handling
 */
async function initializeWithFallback() {
  const isContentScriptReady = await checkContentScriptStatus();
  
  if (!isContentScriptReady) {
    console.log('Content script not ready, falling back to storage');
    await loadFromStorage();
  }
  
  initializePopup();
}

// Start initialization after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure everything is ready
  setTimeout(initializeWithFallback, 100);
});