chrome.runtime.onInstalled.addListener(async () => {
  console.log('Universal Web Debugger Overlay Extension Installed');
  
  // Initialize default state
  const state = await chrome.storage.local.get(['enabled', 'blockedDomains']);
  if (state.enabled === undefined) {
    await chrome.storage.local.set({ enabled: true, blockedDomains: [] });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'capture') {
    chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
      sendResponse({ dataUrl });
    });
    return true; 
  }
});
