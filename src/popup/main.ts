const powerBtn = document.getElementById('global-power') as HTMLButtonElement;
const siteToggleBtn = document.getElementById('site-toggle') as HTMLButtonElement;
const domainLabel = document.getElementById('current-domain') as HTMLSpanElement;
const systemStatus = document.getElementById('system-status') as HTMLDivElement;
const btnText = siteToggleBtn?.querySelector('.btn-text') as HTMLSpanElement;
const body = document.body;

let currentDomain: string = '';

async function init() {
  // Get active tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    try {
      const url = new URL(tab.url);
      currentDomain = url.hostname;
      if (domainLabel) domainLabel.textContent = currentDomain;
    } catch (e) {
      if (domainLabel) domainLabel.textContent = 'System Page';
      if (siteToggleBtn) siteToggleBtn.disabled = true;
    }
  }

  // Load state
  const state = await chrome.storage.local.get(['enabled', 'blockedDomains']) as { enabled?: boolean, blockedDomains?: string[] };
  const isEnabled = state.enabled ?? true;
  const blockedDomains = state.blockedDomains ?? [];

  updateUI(isEnabled, blockedDomains);

  // Listeners
  powerBtn?.addEventListener('click', async () => {
    const currentState = await chrome.storage.local.get(['enabled']) as { enabled?: boolean };
    const enabled = !(currentState.enabled ?? true);
    await chrome.storage.local.set({ enabled });
    
    const freshState = await chrome.storage.local.get(['blockedDomains']) as { blockedDomains?: string[] };
    updateUI(enabled, freshState.blockedDomains ?? []);
    broadcastState();
  });

  siteToggleBtn?.addEventListener('click', async () => {
    if (!currentDomain || body.classList.contains('system-off')) return;

    const state = await chrome.storage.local.get(['blockedDomains']) as { blockedDomains?: string[] };
    let blocked = state.blockedDomains ?? [];

    if (blocked.includes(currentDomain)) {
      blocked = blocked.filter(d => d !== currentDomain);
    } else {
      blocked.push(currentDomain);
    }

    await chrome.storage.local.set({ blockedDomains: blocked });
    updateUI(true, blocked);
    broadcastState();
  });

  document.getElementById('open-docs')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/AffanAhmed7/Web-Debugger' });
  });
}

function updateUI(globalEnabled: boolean, blockedDomains: string[]) {
  const isSiteBlocked = blockedDomains.includes(currentDomain);
  
  if (globalEnabled) {
    powerBtn?.classList.remove('off');
    if (systemStatus) systemStatus.textContent = 'ON';
    body.classList.remove('system-off');
  } else {
    powerBtn?.classList.add('off');
    if (systemStatus) systemStatus.textContent = 'OFF';
    body.classList.add('system-off');
  }

  if (isSiteBlocked) {
    siteToggleBtn?.classList.add('resume');
    if (btnText) btnText.textContent = 'Resume on this site';
  } else {
    siteToggleBtn?.classList.remove('resume');
    if (btnText) btnText.textContent = 'Pause on this site';
  }
}

async function broadcastState() {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'stateChanged' }).catch(() => {});
        }
    }
}

init();
