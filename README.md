# Personal Bidding Agent

A Chrome Extension to assist in finding and bidding on projects on Freelancer.com using Gemini AI.

## Features
- **Project Monitoring**: Watches your dashboard for projects matching your criteria.
- **Smart Filtering**: Automatically identifies projects with budget > $100 and < 5 bids.
- **AI Proposals**: One-click professional proposal generation using Gemini 1.5 Flash.
- **Privacy First**: Your API keys and profiles are stored locally in your browser.

## Installation (Local)
1. Open Chrome and go to `chrome://extensions/`.
2. Enable "Developer mode" in the top right.
3. Click "Load unpacked".
4. Select the `freelancer-biotech-agent` folder (contains this project).

## Configuration
1. Click the extension icon in your toolbar.
2. Enter your **Gemini API Key**.
3. Fill in your **Professional Profile**.
4. Set your **Min Budget** and **Max Bids**.
5. Click **Save Settings**.

## Usage
- Open your Freelancer.com dashboard.
- The agent will monitor for matches. When a match is found, it will highlight it and you can open the project.
- On the project page, click the **✨ Generate AI Proposal** button to draft a tailored bid instantly.
