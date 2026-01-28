document.getElementById('save').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  const profile = document.getElementById('profile').value;
  const minBudget = document.getElementById('minBudget').value;
  const maxBids = document.getElementById('maxBids').value;
  const autoOpen = document.getElementById('autoOpen').checked;
  const enabled = document.getElementById('enabled').checked;

  chrome.storage.local.set({
    geminiApiKey: apiKey,
    professionalProfile: profile,
    minBudget: parseInt(minBudget),
    maxBids: parseInt(maxBids),
    autoOpen,
    enabled
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Settings saved!';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
});

// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['geminiApiKey', 'professionalProfile', 'minBudget', 'maxBids', 'autoOpen', 'enabled'], (data) => {
    if (data.geminiApiKey) document.getElementById('apiKey').value = data.geminiApiKey;
    if (data.professionalProfile) document.getElementById('profile').value = data.professionalProfile;
    if (data.minBudget) document.getElementById('minBudget').value = data.minBudget;
    if (data.maxBids) document.getElementById('maxBids').value = data.maxBids;
    document.getElementById('autoOpen').checked = !!data.autoOpen;
    document.getElementById('enabled').checked = data.enabled !== false;
  });
});
