// This script runs on Freelancer.com pages
console.log("Personal Bidding Agent Active");

let config = {
    minBudget: 0,
    maxBids: 100,
    geminiApiKey: '',
    professionalProfile: '',
    autoOpen: false,
    enabled: true
};

// Load config from storage
chrome.storage.local.get(['geminiApiKey', 'professionalProfile', 'minBudget', 'maxBids', 'autoOpen', 'enabled'], (data) => {
    config = { ...config, ...data };
    console.log("Agent Configuration Loaded:", config);
});

// MutationObserver to watch for new project alerts
const observer = new MutationObserver((mutations) => {
    if (!config.enabled) return;

    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    checkForProjectAlert(node);
                }
            });
        }
    }
});

function checkForProjectAlert(node) {
    // Broaden selectors for Freelancer's various layouts
    const selectors = [
        '[data-testid="project-card"]',
        '.JobSearchCard-primary',
        '.project-details',
        'fl-project-card',
        '.ProjectCard'
    ];

    let foundCard = null;
    for (const selector of selectors) {
        if (node.matches && node.matches(selector)) {
            foundCard = node;
            break;
        }
        foundCard = node.querySelector ? node.querySelector(selector) : null;
        if (foundCard) break;
    }

    if (foundCard) {
        processProjectCard(foundCard);
    }
}

function processProjectCard(card) {
    if (card.hasAttribute('data-agent-processed')) return;
    card.setAttribute('data-agent-processed', 'true');

    try {
        const title = card.querySelector('h3, .project-title, .JobSearchCard-primary-title-link')?.innerText || "Unknown Project";
        const budgetText = card.querySelector('.project-budget, .JobSearchCard-primary-price')?.innerText || '';
        const bidCountText = card.querySelector('.bid-count, .JobSearchCard-secondary-entry')?.innerText || '';

        const budget = parsePrice(budgetText);
        const bids = parseInt(bidCountText.replace(/[^0-9]/g, '')) || 0;

        console.log(`Agent checking: ${title} | Budget: ${budgetText} | Bids: ${bids}`);

        // Baseline: Match almost everything if strictly filtering is off
        const isMatch = (budget >= config.minBudget && bids <= config.maxBids);

        if (isMatch) {
            console.log("MATCH FOUND!", title);
            highlightMatch(card);

            if (config.autoOpen) {
                const link = card.querySelector('a')?.href;
                if (link && !link.includes('javascript:void(0)')) {
                    window.open(link, '_blank');
                }
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
        if (!config.enabled) {
            clearInterval(interval);
            return;
        }

        const bidTextAreaSelectors = [
            'textarea[name="description"]',
            '#description',
            '.BidFormat-description textarea',
            '[data-testid="bid-description-input"]'
        ];

        let bidTextArea = null;
        for (const selector of bidTextAreaSelectors) {
            bidTextArea = document.querySelector(selector);
            if (bidTextArea) break;
        }

        if (bidTextArea && !document.querySelector('#gemini-generate-btn')) {
            const btn = document.createElement('button');
            btn.id = 'gemini-generate-btn';
            btn.innerText = '✨ Generate AI Proposal';
            btn.style = "margin-bottom: 10px; padding: 10px 20px; background: #000; color: #fff; border: 2px solid #FFD700; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s ease;";

            btn.onmouseover = () => btn.style.backgroundColor = '#333';
            btn.onmouseout = () => btn.style.backgroundColor = '#000';

            btn.onclick = (e) => {
                e.preventDefault();
                generateProposal(bidTextArea);
            };

            bidTextArea.parentNode.insertBefore(btn, bidTextArea);
            console.log("Agent: AI Button Injected");
            clearInterval(interval);
        }
    }, 1500);
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
