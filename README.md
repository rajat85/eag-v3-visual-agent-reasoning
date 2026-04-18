# Chrome Agent AI Plugin

A simple Chrome extension demonstrating agentic AI with multi-step reasoning, tool calling, and visual chain-of-thought display.

## Features

- Multi-step reasoning with Google Gemini API
- 4 custom tools: Weather, News, Fibonacci, Current Time
- Visual reasoning chain showing each LLM call and tool execution
- 100% free to use with free API tiers

## Setup

### 1. Get API Keys

**Google Gemini API:**
1. Visit https://ai.google.dev/
2. Click "Get API key in Google AI Studio"
3. Create a new API key
4. Copy the key

**OpenWeatherMap API:**
1. Visit https://openweathermap.org/api
2. Sign up for a free account
3. Navigate to API keys section
4. Copy the default API key

### 2. Install Extension

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the `chrome-agent-plugin` folder

### 3. Configure API Keys

1. Click the extension icon (🤖) in your Chrome toolbar
2. Enter your Google Gemini API key
3. Enter your OpenWeatherMap API key
4. Click "Save Keys"

### 4. Start Using

Try these example queries:
- "What's the weather in Tokyo?"
- "Get weather in NYC and current time there"
- "Calculate the first 10 Fibonacci numbers"
- "Find tech news and summarize the top 3"
- "Compare weather in London vs Paris"

## How It Works

The agent uses a loop to orchestrate LLM calls and tool executions:

1. User submits query
2. Agent calls Gemini with conversation history + tool definitions
3. Gemini decides to use a tool or provide final answer
4. If tool call → execute tool, add result to history, loop back to step 2
5. If final answer → display and stop

Each step is visually displayed as a card in the reasoning chain.

## Tech Stack

- Chrome Extension Manifest V3
- Google Gemini API (free tier)
- OpenWeatherMap API (free tier)
- Google News RSS (free)
- Vanilla HTML/CSS/JavaScript (no frameworks)

## License

MIT
