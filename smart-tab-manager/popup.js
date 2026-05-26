// Smart Tab Manager - Popup Script

// Send message to background
function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, resolve);
  });
}

// Switch panel
function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(`panel-${name}`).classList.add('active');
  event.target.classList.add('active');
  
  if (name === 'workspaces') loadWorkspaces();
}

// Load and display tabs
async function loadTabs() {
  const tabs = await sendMessage({ action: 'getAllTabs' });
  if (!tabs) return;

  const groups = {};
  let duplicates = 0;
  const urlSet = new Set();

  tabs.forEach(tab => {
    if (tab.url && urlSet.has(tab.url.split('?')[0])) duplicates++;
    else if (tab.url) urlSet.add(tab.url.split('?')[0]);
  });

  document.getElementById('tabCount').textContent = `${tabs.length} tabs`;
  document.getElementById('totalTabs').textContent = tabs.length;
  document.getElementById('duplicateCount').textContent = duplicates;

  const tabList = document.getElementById('tabList');
  tabList.innerHTML = tabs.map(tab => `
    <div class="tab-item ${tab.active ? 'active' : ''}" data-id="${tab.id}">
      ${tab.favIconUrl 
        ? `<img class="tab-favicon" src="${tab.favIconUrl}" onerror="this.className='tab-favicon-placeholder'"/>` 
        : '<div class="tab-favicon-placeholder"></div>'}
      <div class="tab-info" onclick="focusTab(${tab.id})">
        <div class="tab-title">${escapeHtml(tab.title || 'Untitled')}</div>
        <div class="tab-url">${escapeHtml(getDomain(tab.url))}</div>
      </div>
      <button class="tab-close" onclick="closeTab(${tab.id}, this)" title="Close tab">&times;</button>
    </div>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return url || ''; }
}

async function focusTab(tabId) {
  await sendMessage({ action: 'focusTab', tabId });
  window.close();
}

async function closeTab(tabId, btn) {
  await sendMessage({ action: 'closeTab', tabId });
  btn.closest('.tab-item').remove();
  loadTabs();
}

async function groupAll() {
  await sendMessage({ action: 'groupAll' });
  loadTabs();
}

async function ungroupAll() {
  await sendMessage({ action: 'ungroupAll' });
  loadTabs();
}

async function closeDuplicates() {
  const result = await sendMessage({ action: 'closeDuplicates' });
  if (result?.closed > 0) {
    loadTabs();
  }
}

// Workspaces
async function loadWorkspaces() {
  const workspaces = await sendMessage({ action: 'getWorkspaces' }) || [];
  const list = document.getElementById('workspaceList');
  
  if (workspaces.length === 0) {
    list.innerHTML = '<div class="empty">No saved workspaces yet.<br>Save your current tabs to restore later.</div>';
    return;
  }

  list.innerHTML = workspaces.map(ws => `
    <div class="workspace-item">
      <div>
        <div class="name">📂 ${escapeHtml(ws.name)}</div>
        <div class="meta">${ws.tabCount} tabs · ${new Date(ws.savedAt).toLocaleDateString()}</div>
      </div>
      <div class="btns">
        <button class="ws-btn" onclick="loadWorkspace('${escapeHtml(ws.name)}')">Open</button>
        <button class="ws-btn del" onclick="deleteWorkspace('${escapeHtml(ws.name)}')">Del</button>
      </div>
    </div>
  `).join('');
}

async function saveWorkspace() {
  const input = document.getElementById('wsName');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  
  await sendMessage({ action: 'saveWorkspace', name });
  input.value = '';
  loadWorkspaces();
}

async function loadWorkspace(name) {
  await sendMessage({ action: 'loadWorkspace', name });
  window.close();
}

async function deleteWorkspace(name) {
  await sendMessage({ action: 'deleteWorkspace', name });
  loadWorkspaces();
}

// Settings
async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    'autoGroupEnabled', 'autoSuspendEnabled', 'badgeEnabled'
  ]);
  
  setToggle('toggleAutoGroup', settings.autoGroupEnabled);
  setToggle('toggleAutoSuspend', settings.autoSuspendEnabled);
  setToggle('toggleBadge', settings.badgeEnabled !== false);
}

function setToggle(id, value) {
  document.getElementById(id).classList.toggle('on', !!value);
}

async function toggleSetting(key) {
  const settings = await chrome.storage.sync.get(key);
  const newValue = !settings[key];
  await chrome.storage.sync.set({ [key]: newValue });
  setToggle(`toggle${key.charAt(0).toUpperCase() + key.slice(1).replace('Enabled', '')}`, newValue);
  loadSettings();
}

// Initialize
loadTabs();
loadSettings();

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement.id === 'wsName') {
    saveWorkspace();
  }
});
