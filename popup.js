document.getElementById('save').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  const profile = document.getElementById('profile').value;
  const minBudget = document.getElementById('minBudget').value;
  const maxBids = document.getElementById('maxBids').value;

  chrome.storage.local.set({
    geminiApiKey: apiKey,
    biotechProfile: profile,
    minBudget: parseInt(minBudget),
    maxBids: parseInt(maxBids)
  }, () => {
    const status = document.getElementById('statusMessage');
    status.textContent = 'Configuration saved!';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
});

// Load existing settings
chrome.storage.local.get(['geminiApiKey', 'biotechProfile', 'minBudget', 'maxBids'], (data) => {
  if (data.geminiApiKey) document.getElementById('apiKey').value = data.geminiApiKey;
  if (data.biotechProfile) document.getElementById('profile').value = data.biotechProfile;
  if (data.minBudget) document.getElementById('minBudget').value = data.minBudget;
  if (data.maxBids) document.getElementById('maxBids').value = data.maxBids;
});
