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
5. Select the project folder

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

## Rate Limits

Free tier limits:
- **Google Gemini:** 15 requests per minute
- **OpenWeatherMap:** 1000 requests per day, 60 per minute
- **Google News RSS:** No official limit (reasonable use)

For most usage, these limits are sufficient. If you hit a limit, wait a minute and try again.

## Tech Stack

- Chrome Extension Manifest V3
- Google Gemini API (free tier)
- OpenWeatherMap API (free tier)
- Google News RSS (free)
- Vanilla HTML/CSS/JavaScript (no frameworks)

## Troubleshooting

### API Key Errors

**"Invalid Gemini API key"**
- Verify you copied the complete key from Google AI Studio
- Check that you didn't include extra spaces
- Ensure the API is enabled in your Google Cloud project

**"Weather API error: 401"**
- Verify OpenWeatherMap API key is correct
- Check that your API key is activated (can take a few minutes after signup)

### Extension Not Loading

1. Make sure all files are in the same directory
2. Check Chrome console (F12) for JavaScript errors
3. Verify manifest.json is valid JSON
4. Try reloading the extension (chrome://extensions, click reload icon)

### No Response from Agent

- Check browser console for errors
- Verify internet connection
- Check that you're not hitting rate limits (wait a minute and retry)
- Try a simpler query

### Tool Errors

**"City not found"**
- Check spelling of city name
- Try adding country code: "London, UK"

**"No news found"**
- Try a more popular topic
- Check internet connection

**"Invalid timezone"**
- Use IANA timezone format: "America/New_York" not "EST"
- Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

## Example Queries

### Simple Queries
- "What's the weather in Paris?"
- "Show me news about AI"
- "Calculate first 6 Fibonacci numbers"
- "What time is it in Sydney?"

### Multi-Step Queries
- "Get weather in NYC and news about New York"
- "Compare weather in London and Tokyo"
- "Find tech news and tell me the weather in San Francisco"
- "Calculate Fibonacci(10) and explain the pattern"

### Complex Reasoning
- "Get weather in Seattle and based on that, suggest if it's good for outdoor tech events"
- "Find news about climate change and get weather data for a related city mentioned in the news"

## FAQ

**Q: Do I need to pay for any APIs?**
A: No! All APIs used have free tiers that are sufficient for this extension.

**Q: Where are my API keys stored?**
A: In your browser's localStorage, local to the extension. They never leave your machine.

**Q: Why does the conversation reset when I close the popup?**
A: This is intentional for simplicity. The extension uses in-memory storage. If you want persistence, you could extend it to use chrome.storage.local.

**Q: Can I add my own tools?**
A: Yes! Edit tools.js to add new functions, update TOOL_DEFINITIONS array, and add a case in executeTool().

**Q: How do I see what the agent is thinking?**
A: Each step is displayed as a card in the reasoning chain. You can see every LLM call, tool execution, and result.

**Q: Can I use a different LLM?**
A: Yes, but you'll need to modify agent.js to call a different API. The tool system is LLM-agnostic.

## License

MIT
