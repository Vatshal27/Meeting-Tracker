// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('📊 Meeting Tracker Extension v2.0 installed successfully');
  
  // Initialize storage
  chrome.storage.local.set({
    'extensionInstalled': true,
    'installDate': new Date().toISOString(),
    'version': '2.0'
  });
  
  // Run cleanup on install
  cleanupOldSessions();
});

// Listen for tab updates to ensure content script injection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (isMeetingPlatform(tab.url)) {
      // Inject content script with error handling
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }).catch((error) => {
          console.log('Content script injection skipped (likely already injected):', error.message);
        });
      }, 2000);
    }
  }
});

// Handle navigation within single-page applications
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details && details.url && isMeetingPlatform(details.url)) {
    setTimeout(() => {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: initializeTracker
      }).catch(err => console.log('Script injection failed:', err));
    }, 2000);
  }
});

// Handle page completion
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details && details.url && details.frameId === 0 && isMeetingPlatform(details.url)) {
    setTimeout(() => {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: initializeTracker
      }).catch(err => console.log('Script injection failed:', err));
    }, 3000);
  }
});

// Function to inject into the page
function initializeTracker() {
  // Only initialize if not already present
  if (window.meetingTrackerInitialized) {
    return;
  }
  
  window.meetingTrackerInitialized = true;
  console.log('Meeting tracker initialized via background script');
}

// Handle storage cleanup on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Meeting tracker extension started');
  cleanupOldSessions();
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'saveParticipantData':
      handleSaveParticipantData(request, sendResponse);
      return true; // Keep message channel open
      
    case 'getStorageData':
      handleGetStorageData(sendResponse);
      return true; // Keep message channel open
      
    case 'clearStorage':
      handleClearStorage(sendResponse);
      return true; // Keep message channel open
      
    case 'openPopup':
      handleOpenPopup(sender);
      sendResponse({ success: true });
      break;
      
    default:
      console.log('Unknown action:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Handle saving participant data
async function handleSaveParticipantData(request, sendResponse) {
  try {
    // Save session data
    await chrome.storage.local.set({
      [request.sessionId]: request.data
    });
    
    // Update current session pointer
    await chrome.storage.local.set({
      'currentSession': request.sessionId,
      'lastUpdated': new Date().toISOString()
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving participant data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle getting storage data
async function handleGetStorageData(sendResponse) {
  try {
    const data = await chrome.storage.local.get(null);
    sendResponse({ success: true, data });
  } catch (error) {
    console.error('Error getting storage data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle clearing storage
async function handleClearStorage(sendResponse) {
  try {
    await chrome.storage.local.clear();
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error clearing storage:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Clean up old sessions (older than 7 days)
async function cleanupOldSessions() {
  try {
    const data = await chrome.storage.local.get(null);
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    for (const key in data) {
      if (key.startsWith('session_')) {
        const timestamp = parseInt(key.split('_')[1]);
        if (timestamp && timestamp < cutoffTime) {
          await chrome.storage.local.remove(key);
          console.log(`Cleaned up old session: ${key}`);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old sessions:', error);
  }
}

// Check if URL is a meeting platform
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

// Handle opening popup (placeholder for future functionality)
function handleOpenPopup(sender) {
  console.log('Popup opened from tab:', sender.tab?.id);
}