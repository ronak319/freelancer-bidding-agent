// This script runs on Freelancer.com pages
console.log("Personal Bidding Agent Active");

let config = {
    minBudget: 100,
    maxBids: 5,
    geminiApiKey: '',
    professionalProfile: ''
};

// Load config from storage
chrome.storage.local.get(['geminiApiKey', 'professionalProfile', 'minBudget', 'maxBids'], (data) => {
    config = { ...config, ...data };
    console.log("Agent Configuration Loaded:", config);
});

// MutationObserver to watch for new project alerts
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    // Check if it's a project alert (toast or new list item)
                    // Note: Selectors here are based on common patterns; real-time verification is needed
                    checkForProjectAlert(node);
                }
            });
        }
    }
});

function checkForProjectAlert(node) {
    // Example selectors for Freelancer.com dashboard alerts
    // These often have classes like 'ProjectCard' or 'Toast'
    const card = node.closest('[data-testid="project-card"]') || (node.matches && node.matches('[data-testid="project-card"]') ? node : null);

    if (card) {
        processProjectCard(card);
    }
}

function processProjectCard(card) {
    try {
        const title = card.querySelector('h3')?.innerText || card.querySelector('.project-title')?.innerText;
        const budgetText = card.querySelector('.project-budget')?.innerText || '';
        const bidCountText = card.querySelector('.bid-count')?.innerText || '';

        const budget = parsePrice(budgetText);
        const bids = parseInt(bidCountText.replace(/[^0-9]/g, '')) || 0;

        console.log(`Analyzing Project: ${title} | Budget: $${budget} | Bids: ${bids}`);

        if (budget >= config.minBudget && bids <= config.maxBids) {
            console.log("MATCH FOUND! Opening project...");
            highlightMatch(card);
            // alert("New Project Match: " + title);

            // Auto-open in new tab (safely)
            const link = card.querySelector('a')?.href;
            if (link) {
                window.open(link, '_blank');
            }
        }
    } catch (e) {
        console.error("Error processing project card:", e);
    }
}

function parsePrice(text) {
    // Handles '$100 - $250' or '$500 USD'
    const matches = text.match(/\d+/g);
    if (matches && matches.length) {
        return Math.max(...matches.map(Number));
    }
    return 0;
}

function highlightMatch(card) {
    card.style.border = "3px solid #0d6efd";
    card.style.backgroundColor = "#e7f1ff";
}

// Start watching the page
observer.observe(document.body, { childList: true, subtree: true });

// UI Injection logic for Project Page
if (window.location.href.includes('/projects/')) {
    injectProposalButton();
}

function injectProposalButton() {
    // Wait for the bid form to load
    const interval = setInterval(() => {
        const bidTextArea = document.querySelector('textarea[name="description"]') || document.querySelector('#description');
        if (bidTextArea && !document.querySelector('#gemini-generate-btn')) {
            const btn = document.createElement('button');
            btn.id = 'gemini-generate-btn';
            btn.innerText = '✨ Generate AI Proposal';
            btn.style = "margin-bottom: 10px; padding: 8px 15px; background: #0d6efd; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;";

            btn.onclick = (e) => {
                e.preventDefault();
                generateProposal(bidTextArea);
            };

            bidTextArea.parentNode.insertBefore(btn, bidTextArea);
            clearInterval(interval);
        }
    }, 1000);
}

async function generateProposal(textArea) {
    if (!config.geminiApiKey) {
        alert("Please set your Gemini API Key in the extension popup.");
        return;
    }

    textArea.value = "Generating proposal...";

    const projectTitle = document.querySelector('h1')?.innerText || "this project";
    const projectDesc = document.querySelector('.project-description')?.innerText || "the project details given";

    const prompt = `
        You are a professional freelancer with the following profile:
        ${config.professionalProfile}

        Write a concise, winning, and tailored project proposal for the following project:
        Title: ${projectTitle}
        Description: ${projectDesc}

        Requirements:
        1. Keep it professional but friendly.
        2. Focus on why your skills match the requirements.
        3. Do not use placeholders like [Your Name].
        4. Make it direct and persuasive.
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        textArea.value = generatedText;
    } catch (e) {
        console.error("Gemini API Error:", e);
        textArea.value = "Error generating proposal. Check console.";
    }
}
