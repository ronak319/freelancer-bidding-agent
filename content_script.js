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
                    // 1. Auto-click for "VIEW NEW PROJECTS" tooltip
                    checkForViewNewProjects(node);

                    // 2. Check for project cards
                    checkForProjectAlert(node);
                }
            });
        }
    }
});

function checkForViewNewProjects(node) {
    // Select the "VIEW NEW PROJECTS" button (pink tooltip)
    const viewNewBtn = document.querySelector('button[primary], .view-new-projects-btn, .ViewNewProjectsBtn');
    if (viewNewBtn && viewNewBtn.innerText && /VIEW NEW PROJECTS/i.test(viewNewBtn.innerText)) {
        console.log("Agent: New projects alert detected. Clicking...");
        viewNewBtn.click();
    }
}

function checkForProjectAlert(node) {
    const selectors = [
        '[data-testid="project-card"]',
        '.JobSearchCard-primary',
        '.project-details',
        'fl-project-card',
        '.ProjectCard',
        '.Card-primary',
        '.JobSearchCard'
    ];

    let foundCard = null;
    for (const selector of selectors) {
        if (foundCard) break;
        if (node.matches && node.matches(selector)) {
            foundCard = node;
        } else if (node.querySelector) {
            foundCard = node.querySelector(selector);
        }
    }

    if (foundCard) {
        processProjectCard(foundCard);
    }
}

function processProjectCard(card) {
    if (card.hasAttribute('data-agent-processed')) return;
    card.setAttribute('data-agent-processed', 'true');

    try {
        const titleEl = card.querySelector('h3, .project-title, .JobSearchCard-primary-title-link, .Card-title, .JobSearchCard-primary-heading a');
        const title = titleEl?.innerText || "Unknown Project";
        const budgetText = card.querySelector('.project-budget, .JobSearchCard-primary-price, .Card-price, .JobSearchCard-primary-price')?.innerText || '';
        const bidCountText = card.querySelector('.bid-count, .JobSearchCard-secondary-entry, .Card-bids, .JobSearchCard-secondary-entry')?.innerText || '';

        const budget = parsePrice(budgetText);
        const bids = parseInt(bidCountText.replace(/[^0-9]/g, '')) || 0;

        console.log(`Agent: Analyzing -> ${title} | ${budgetText}`);

        const isMatch = (budget >= config.minBudget && bids <= config.maxBids);

        if (isMatch) {
            console.log(`%c[MATCH] ${title}`, "color: #00ff00; font-weight: bold; background: #000; padding: 2px 5px;");
            highlightMatch(card);

            if (config.autoOpen) {
                let linkEl = card.querySelector('a[href*="/projects/"], a[href*="/jobs/"], .JobSearchCard-primary-title-link, .JobSearchCard-primary-heading a');

                if (linkEl && linkEl.href && !linkEl.href.includes('javascript:')) {
                    const projectUrl = linkEl.href;
                    console.log(`Agent: Requesting background to open -> ${projectUrl}`);

                    chrome.runtime.sendMessage({
                        action: 'openProject',
                        url: projectUrl
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("Agent: Background message failed:", chrome.runtime.lastError);
                        } else {
                            console.log("Agent: Background confirmed tab creation.");
                        }
                    });
                } else {
                    console.warn("Agent: Match found but no link detected for", title);
                }
            } else {
                console.log("Agent: Auto-open is DISABLED. Highlighting only.");
            }
        } else {
            console.log(`Agent: No match for ${title} (Budget/Bid constraints)`);
        }
    } catch (e) {
        console.error("Agent: Error processing project card:", e);
    }
}

function parsePrice(text) {
    const matches = text.match(/\d+(?:,\d+)?/g);
    if (matches && matches.length) {
        // Clean commas and get the max value if it's a range
        return Math.max(...matches.map(m => parseInt(m.replace(/,/g, ''))));
    }
    return 0;
}

function highlightMatch(card) {
    card.style.border = "3px solid #0d6efd";
    card.style.backgroundColor = "#fafcff";
    card.style.transition = "all 0.5s ease";
}

// 3. Process existing projects on load (for Search results page)
function processExistingProjects() {
    console.log("Agent: Checking existing projects on page...");
    const selectors = [
        '[data-testid="project-card"]',
        '.JobSearchCard-primary',
        '.project-details',
        'fl-project-card',
        '.ProjectCard',
        '.Card-primary'
    ];

    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(card => {
            processProjectCard(card);
        });
    });
}

// Run initial check and then start observer
setTimeout(() => {
    processExistingProjects();
    observer.observe(document.body, { childList: true, subtree: true });
}, 3000); // Wait for page to settle

// UI Injection logic for Project Page
if (window.location.href.includes('/projects/') || window.location.href.includes('/jobs/') || window.location.href.match(/\/projects\/.*\/$/)) {
    injectProposalButton();
}

function injectProposalButton() {
    console.log("Agent: Attempting to find bid area...");
    const interval = setInterval(() => {
        if (!config.enabled) {
            clearInterval(interval);
            return;
        }

        const bidTextAreaSelectors = [
            'textarea[name="description"]',
            '#description',
            '.BidFormat-description textarea',
            '[data-testid="bid-description-input"]',
            '.fl-textarea textarea',
            'textarea.FormControl',
            'textarea.fl-textarea'
        ];

        let bidTextArea = null;
        for (const selector of bidTextAreaSelectors) {
            bidTextArea = document.querySelector(selector);
            if (bidTextArea) break;
        }

        if (bidTextArea && !document.querySelector('#gemini-generate-btn')) {
            console.log("Agent: Bid area found. Injecting button...");
            const btn = document.createElement('button');
            btn.id = 'gemini-generate-btn';
            btn.innerText = '✨ Generate AI Proposal';
            btn.type = 'button'; // Prevent form submission
            btn.style = "margin-bottom: 12px; padding: 12px 24px; background: #000; color: #FFD700; border: 2px solid #FFD700; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: all 0.3s ease; display: block; width: fit-content;";

            btn.onmouseover = () => {
                btn.style.backgroundColor = '#FFD700';
                btn.style.color = '#000';
            };
            btn.onmouseout = () => {
                btn.style.backgroundColor = '#000';
                btn.style.color = '#FFD700';
            };

            // Find best container to insert before
            const container = bidTextArea.closest('.fl-textarea, .BidFormat-description, .form-group') || bidTextArea.parentNode;
            container.insertBefore(btn, container.firstChild);

            btn.onclick = (e) => {
                e.preventDefault();
                generateProposal(bidTextArea);
            };

            clearInterval(interval);
        }
    }, 2000); // Check every 2 seconds
}

async function generateProposal(textArea) {
    if (!config.geminiApiKey) {
        alert("Please set your Gemini API Key in the extension popup.");
        return;
    }

    const originalValue = textArea.value;
    textArea.value = "🤖 Analyzing project and crafting proposal...";

    const projectTitle = document.querySelector('h1, .PageProjectDetails-title')?.innerText || "this project";
    const projectDesc = document.querySelector('.project-description, .PageProjectDetails-description, [data-testid="project-description"]')?.innerText || "the project details given";

    const prompt = `
        You are a professional freelancer with the following profile:
        ${config.professionalProfile}

        Write a concise, winning, and tailored project proposal for the following project:
        Title: ${projectTitle}
        Description: ${projectDesc}

        Requirements:
        1. Keep it professional, friendly, and HUMAN-like (avoid overly formal AI corporate speak).
        2. Focus on exactly how your experience solves their specific problem.
        3. Do not use placeholders like [Your Name].
        4. Be direct and persuasive. Start with a strong hook about their problem.
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
        if (data.candidates && data.candidates[0].content) {
            const generatedText = data.candidates[0].content.parts[0].text;
            textArea.value = generatedText;
            // Trigger input event so React/Vue sites detect the change
            textArea.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            throw new Error("Invalid API response structure");
        }
    } catch (e) {
        console.error("Gemini API Error:", e);
        textArea.value = originalValue;
        alert("Error generating proposal: " + e.message);
    }
}
