// Smart Tab Manager - Background Service Worker

// Tab grouping rules
const GROUP_RULES = {
  'Social': ['twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'mastodon.social'],
  'Dev': ['github.com', 'gitlab.com', 'stackoverflow.com', 'dev.to', 'npmjs.com', 'vercel.com', 'netlify.com'],
  'AI': ['openai.com', 'anthropic.com', 'claude.ai', 'chat.openai.com', 'huggingface.co', 'midjourney'],
  'Docs': ['docs.google.com', 'notion.so', 'confluence', 'wiki'],
  'Video': ['youtube.com', 'netflix.com', 'twitch.tv', 'bilibili.com'],
  'Shopping': ['amazon.com', 'taobao.com', 'jd.com', 'ebay.com'],
  'News': ['news.ycombinator.com', 'medium.com', 'bbc.com', 'cnn.com'],
  'Email': ['mail.google.com', 'outlook.com', 'protonmail.com'],
};

const GROUP_COLORS = {
  'Social': 'blue',
  'Dev': 'green',
  'AI': 'purple',
  'Docs': 'yellow',
  'Video': 'red',
  'Shopping': 'orange',
  'News': 'cyan',
  'Email': 'pink',
};

// Auto-group tabs based on URL
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  
  const settings = await chrome.storage.sync.get(['autoGroupEnabled']);
  if (!settings.autoGroupEnabled) return;

  const url = new URL(tab.url);
  const domain = url.hostname;

  for (const [groupName, domains] of Object.entries(GROUP_RULES)) {
    if (domains.some(d => domain.includes(d))) {
      try {
        const groups = await chrome.tabGroups.query({ title: groupName });
        const color = GROUP_COLORS[groupName] || 'grey';
        
        if (groups.length > 0) {
          await chrome.tabs.group({ tabId, groupId: groups[0].id });
        } else {
          const groupId = await chrome.tabs.group({ tabIds: [tabId] });
          await chrome.tabGroups.update(groupId, {
            title: groupName,
            color: color,
            collapsed: false,
          });
        }
      } catch (e) {
        console.log('Grouping error:', e);
      }
      break;
    }
  }
});

// Suspend inactive tabs to save memory
chrome.alarms.create('suspendInactiveTabs', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'suspendInactiveTabs') {
    const settings = await chrome.storage.sync.get(['autoSuspendEnabled', 'suspendMinutes']);
    if (!settings.autoSuspendEnabled) return;

    const tabs = await chrome.tabs.query({ active: false, currentWindow: true });
    const threshold = (settings.suspendMinutes || 30) * 60 * 1000;

    for (const tab of tabs) {
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) continue;
      // Note: chrome.tabs.discard() is the API for suspending tabs
      // We can't track last active time without additional storage
    }
  }
});

// Save workspace
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveWorkspace') {
    saveWorkspace(message.name).then(sendResponse);
    return true;
  }
  if (message.action === 'loadWorkspace') {
    loadWorkspace(message.name).then(sendResponse);
    return true;
  }
  if (message.action === 'getWorkspaces') {
    getWorkspaces().then(sendResponse);
    return true;
  }
  if (message.action === 'deleteWorkspace') {
    deleteWorkspace(message.name).then(sendResponse);
    return true;
  }
  if (message.action === 'getAllTabs') {
    getAllTabs().then(sendResponse);
    return true;
  }
  if (message.action === 'closeDuplicates') {
    closeDuplicates().then(sendResponse);
    return true;
  }
  if (message.action === 'closeTab') {
    chrome.tabs.remove(message.tabId).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.action === 'focusTab') {
    chrome.tabs.update(message.tabId, { active: true }).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.action === 'groupAll') {
    groupAllTabs().then(sendResponse);
    return true;
  }
  if (message.action === 'ungroupAll') {
    ungroupAllTabs().then(sendResponse);
    return true;
  }
});

async function getAllTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs.map(t => ({
    id: t.id,
    title: t.title,
    url: t.url,
    favIconUrl: t.favIconUrl,
    active: t.active,
    groupId: t.groupId,
    pinned: t.pinned,
    index: t.index,
  }));
}

async function saveWorkspace(name) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const workspace = {
    name,
    tabs: tabs.map(t => ({ url: t.url, title: t.title, pinned: t.pinned })),
    savedAt: new Date().toISOString(),
  };
  
  const { workspaces = {} } = await chrome.storage.sync.get('workspaces');
  workspaces[name] = workspace;
  await chrome.storage.sync.set({ workspaces });
  return { success: true };
}

async function loadWorkspace(name) {
  const { workspaces = {} } = await chrome.storage.sync.get('workspaces');
  const workspace = workspaces[name];
  if (!workspace) return { error: 'Workspace not found' };

  for (const tab of workspace.tabs) {
    await chrome.tabs.create({ url: tab.url, pinned: tab.pinned, active: false });
  }
  return { success: true, loaded: workspace.tabs.length };
}

async function getWorkspaces() {
  const { workspaces = {} } = await chrome.storage.sync.get('workspaces');
  return Object.values(workspaces).map(w => ({
    name: w.name,
    tabCount: w.tabs.length,
    savedAt: w.savedAt,
  }));
}

async function deleteWorkspace(name) {
  const { workspaces = {} } = await chrome.storage.sync.get('workspaces');
  delete workspaces[name];
  await chrome.storage.sync.set({ workspaces });
  return { success: true };
}

async function closeDuplicates() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const seen = new Set();
  const duplicateIds = [];
  
  for (const tab of tabs) {
    if (!tab.url) continue;
    const key = tab.url.split('?')[0]; // Ignore query params
    if (seen.has(key)) {
      duplicateIds.push(tab.id);
    } else {
      seen.add(key);
    }
  }
  
  if (duplicateIds.length > 0) {
    await chrome.tabs.remove(duplicateIds);
  }
  return { closed: duplicateIds.length };
}

async function groupAllTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  for (const [groupName, domains] of Object.entries(GROUP_RULES)) {
    const groupTabs = tabs.filter(t => {
      if (!t.url) return false;
      try {
        const domain = new URL(t.url).hostname;
        return domains.some(d => domain.includes(d));
      } catch { return false; }
    });
    
    if (groupTabs.length > 0) {
      const groupId = await chrome.tabs.group({ tabIds: groupTabs.map(t => t.id) });
      await chrome.tabGroups.update(groupId, {
        title: groupName,
        color: GROUP_COLORS[groupName] || 'grey',
      });
    }
  }
  return { success: true };
}

async function ungroupAllTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const groupedTabs = tabs.filter(t => t.groupId !== -1);
  for (const tab of groupedTabs) {
    await chrome.tabs.ungroup(tab.id);
  }
  return { ungrouped: groupedTabs.length };
}
