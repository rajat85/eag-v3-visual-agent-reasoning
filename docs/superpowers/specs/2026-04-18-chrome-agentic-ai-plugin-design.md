# Chrome Agentic AI Plugin - Design Specification

**Date:** 2026-04-18  
**Status:** Design Approved  
**Project Type:** Chrome Extension with Agentic AI

## Overview

A simple Chrome extension that demonstrates agentic AI behavior through multi-step reasoning, tool calling, and visual chain-of-thought display. The agent uses Google Gemini API (free tier) to orchestrate multiple tool calls in response to user queries, displaying each reasoning step in real-time.

## Goals

- Build a working agentic AI system that runs 100% locally (no server/deployment)
- Use only free APIs and services
- Display the agent's reasoning chain visually (requirement: show each tool call and result, not just final answer)
- Implement at least 3 custom tool functions
- Keep architecture simple and thin - minimal layers, no frameworks

## Non-Goals

- Persistent conversation history across sessions
- Background task execution
- Complex state management or backend services
- Production-grade error recovery
- Automated testing infrastructure

## Architecture

### Project Structure

```
chrome-agent-plugin/
├── manifest.json          # Chrome extension configuration
├── popup.html             # UI with input box + reasoning chain display
├── popup.css              # Styling for cards and layout
├── agent.js               # Agent logic, LLM calls, tool implementations
└── README.md              # Setup instructions (API key acquisition)
```

**Key Architectural Decisions:**
- No build step - pure HTML/CSS/JavaScript
- No frameworks - vanilla JavaScript only
- No bundler - direct file loading
- Single-page popup architecture
- In-memory conversation history (lost when popup closes)

### Technology Stack

- **Chrome Extension API:** Manifest V3
- **LLM:** Google Gemini API (free tier: 15 requests/min)
- **Weather Data:** OpenWeatherMap API (free tier: 1000 calls/day)
- **News Data:** Public RSS feeds (Google News RSS or NewsAPI free tier)
- **UI:** Vanilla HTML/CSS/JavaScript

## Agent Flow

### Core Loop

1. **User Input:** User types query in popup
2. **Build Prompt:** Construct prompt with full conversation history
3. **LLM Call:** Send to Gemini with tool definitions
4. **Tool Decision:**
   - If Gemini returns tool call → execute tool
   - Append tool result to conversation history
   - Loop back to step 2 with updated history
5. **Final Answer:** When Gemini provides text response without tool calls, display and stop

### Conversation History Format

```javascript
conversationHistory = [
  { role: "user", parts: "Find weather in NYC and news about AI" },
  { role: "model", parts: "I'll help with that", toolCalls: [...] },
  { role: "tool", toolName: "getWeather", result: {...} },
  { role: "model", parts: "Based on the weather data..." },
  { role: "tool", toolName: "scrapeNews", result: [...] },
  { role: "model", parts: "Here's what I found..." }
]
```

Each interaction appends to the array, ensuring Gemini always sees full context for multi-step reasoning.

### Visual Chain Display

As the agent executes:
- Each LLM response → render as "Thinking" card
- Each tool call → render as "Tool Call" card with function name and arguments
- Each tool result → render as "Tool Result" card with returned data
- Final answer → render as "Answer" card

All cards auto-append to scrollable container with auto-scroll to latest.

## Custom Tools

### Tool 1: getWeather(city)

**Purpose:** Fetch current weather data for a specified city

**Implementation:**
- Call OpenWeatherMap API: `https://api.openweathermap.org/data/2.5/weather?q={city}&appid={key}&units=metric`
- Parse JSON response
- Return temperature, conditions, humidity

**Input:** `city` (string) - City name  
**Output:** JSON object with weather data

**Tool Definition for Gemini:**
```javascript
{
  name: "getWeather",
  description: "Fetches current weather for a city including temperature, conditions, and humidity",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name (e.g., 'New York', 'London')" }
    },
    required: ["city"]
  }
}
```

### Tool 2: scrapeNews(topic, count)

**Purpose:** Fetch recent news headlines on a specific topic

**Implementation:**
- Use Google News RSS: `https://news.google.com/rss/search?q={topic}&hl=en-US&gl=US&ceid=US:en`
- Parse XML to extract titles, links, publish dates
- Return top N results

**Input:**
- `topic` (string) - News topic or keyword
- `count` (number, optional, default 5) - Number of headlines to return

**Output:** Array of objects `[{title, link, date}]`

**Tool Definition for Gemini:**
```javascript
{
  name: "scrapeNews",
  description: "Fetches recent news headlines about a specific topic from Google News RSS",
  parameters: {
    type: "object",
    properties: {
      topic: { type: "string", description: "News topic or keyword to search for" },
      count: { type: "number", description: "Number of headlines to return (default 5)" }
    },
    required: ["topic"]
  }
}
```

### Tool 3: calculateFibonacci(n)

**Purpose:** Calculate Fibonacci sequence (demonstrates tasks LLM can't do directly)

**Implementation:**
- Compute Fibonacci numbers iteratively
- Return array of first n numbers

**Input:** `n` (number) - How many Fibonacci numbers to generate  
**Output:** Array of numbers `[0, 1, 1, 2, 3, 5, 8, ...]`

**Tool Definition for Gemini:**
```javascript
{
  name: "calculateFibonacci",
  description: "Calculates the first n numbers in the Fibonacci sequence",
  parameters: {
    type: "object",
    properties: {
      n: { type: "number", description: "How many Fibonacci numbers to generate (max 50)" }
    },
    required: ["n"]
  }
}
```

### Tool 4: getCurrentTime(timezone)

**Purpose:** Get current time in specified timezone

**Implementation:**
- Use browser's `Intl.DateTimeFormat` API (no external call)
- Format time for given timezone

**Input:** `timezone` (string) - IANA timezone (e.g., "America/New_York")  
**Output:** Formatted time string

**Tool Definition for Gemini:**
```javascript
{
  name: "getCurrentTime",
  description: "Returns the current time in a specified timezone",
  parameters: {
    type: "object",
    properties: {
      timezone: { type: "string", description: "IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')" }
    },
    required: ["timezone"]
  }
}
```

## UI Design

### Popup Layout (300px wide, 600px tall)

```
┌─────────────────────────────────┐
│  🤖 Chrome Agent AI             │
│  ────────────────────────────── │
│  [API Keys Setup (if missing)]  │
├─────────────────────────────────┤
│                                 │
│  [Reasoning Chain - Scrollable] │
│                                 │
│  ┌─ 👤 User Query ─────────────┐│
│  │ Find weather in NYC        ││
│  └────────────────────────────┘│
│                                 │
│  ┌─ 🧠 Agent Thinking ─────────┐│
│  │ I need to fetch weather... ││
│  └────────────────────────────┘│
│                                 │
│  ┌─ 🔧 Tool Call ──────────────┐│
│  │ getWeather("New York")     ││
│  └────────────────────────────┘│
│                                 │
│  ┌─ 📊 Tool Result ────────────┐│
│  │ {temp: 72, sunny} [▼]      ││
│  └────────────────────────────┘│
│                                 │
│  ┌─ ✅ Final Answer ───────────┐│
│  │ NYC is 72°F and sunny!     ││
│  └────────────────────────────┘│
│                                 │
├─────────────────────────────────┤
│ [Type your query...]    [Send]  │
└─────────────────────────────────┘
```

### Visual Elements

**Card Types:**
- **User Query:** Light blue background, user icon
- **Agent Thinking:** Purple background, brain icon, shows LLM reasoning
- **Tool Call:** Orange background, tool icon, function name + args
- **Tool Result:** Green background, data icon, collapsible JSON viewer
- **Final Answer:** Blue background, checkmark icon, larger text
- **Error:** Red background, warning icon

**Interactions:**
- Auto-scroll to latest card as chain grows
- Click to expand/collapse tool results (for long JSON)
- Loading spinner overlay during API calls
- Clear conversation button (resets history)

## API Configuration

### Setup Flow

1. On first launch, show API key input form
2. User enters:
   - Google Gemini API key (from ai.google.dev)
   - OpenWeatherMap API key (from openweathermap.org)
3. Keys stored in `localStorage` (local to extension)
4. Validate keys by making test API calls
5. If valid, hide form and enable query input

### Storage

```javascript
localStorage.setItem('gemini_api_key', key);
localStorage.setItem('weather_api_key', key);
```

Keys never leave the user's machine.

## Error Handling

### API Call Failures

- **Network errors:** Display error card, suggest checking internet connection
- **Invalid API key:** Show error, prompt user to re-enter key
- **Rate limit hit:** Display friendly message, suggest waiting
- **Malformed response:** Log error, show generic failure message

### Tool Execution Errors

- Catch all tool errors
- Display error in chain as error card
- Pass error message back to LLM in next call
- Let LLM see error and potentially retry with different approach

### No Retry Logic

Keep it simple - fail fast, display errors, let user retry manually.

### Rate Limits (Free Tiers)

- **Gemini:** 15 requests/min
- **OpenWeatherMap:** 60 calls/min
- No throttling implemented (not needed for demo/learning use case)

## Testing Strategy

### Manual Testing Checklist

1. **Extension Loading:**
   - Load unpacked extension in Chrome
   - Verify popup opens and displays correctly

2. **API Key Setup:**
   - Enter valid keys → should save and hide form
   - Enter invalid keys → should show error
   - Refresh popup → keys should persist

3. **Single Tool Queries:**
   - "What's the weather in London?" → calls getWeather
   - "Show me news about AI" → calls scrapeNews
   - "Calculate first 10 Fibonacci numbers" → calls calculateFibonacci
   - "What time is it in Tokyo?" → calls getCurrentTime

4. **Multi-Tool Queries:**
   - "Get weather in NYC and current time there" → 2 tool calls
   - "Find weather in Paris and news about France" → 2 tool calls
   - "Calculate Fibonacci(8) and tell me the weather in Berlin" → 2 tool calls

5. **Multi-Step Reasoning:**
   - "Compare weather in NYC vs London" → 2 sequential getWeather calls
   - "Find tech news and summarize the top 3" → scrapeNews + LLM processing

6. **Visual Chain Display:**
   - Verify each step appears as separate card
   - Check auto-scroll behavior
   - Test expand/collapse on tool results
   - Confirm all icons and colors render correctly

7. **Error Cases:**
   - Invalid city name → tool error displayed
   - Network offline → error message shown
   - Invalid API key → proper error handling

### Success Criteria

✅ Agent makes 2-3+ LLM calls per complex query  
✅ All tool calls visible in UI with arguments  
✅ All tool results visible in UI with data  
✅ Conversation history maintained during session  
✅ Works entirely with free API tiers  
✅ At least 3 custom tools implemented  
✅ Visual reasoning chain displays correctly  

## Implementation Notes

### Gemini API Integration

Use the REST API directly (no SDK needed for simplicity):

```javascript
async function callGemini(conversationHistory, tools) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: conversationHistory,
      tools: [{ functionDeclarations: tools }]
    })
  });
  return await response.json();
}
```

### Tool Execution Dispatcher

```javascript
async function executeTool(toolName, args) {
  switch(toolName) {
    case 'getWeather': return await getWeather(args.city);
    case 'scrapeNews': return await scrapeNews(args.topic, args.count);
    case 'calculateFibonacci': return calculateFibonacci(args.n);
    case 'getCurrentTime': return getCurrentTime(args.timezone);
    default: throw new Error(`Unknown tool: ${toolName}`);
  }
}
```

### Agent Loop Pseudocode

```javascript
async function runAgent(userQuery) {
  conversationHistory.push({ role: 'user', parts: userQuery });
  displayCard('user', userQuery);
  
  while (true) {
    const response = await callGemini(conversationHistory, tools);
    
    if (response.functionCall) {
      // LLM wants to use a tool
      displayCard('thinking', response.text);
      displayCard('toolCall', response.functionCall);
      
      const result = await executeTool(response.functionCall.name, response.functionCall.args);
      displayCard('toolResult', result);
      
      conversationHistory.push({ role: 'model', functionCall: response.functionCall });
      conversationHistory.push({ role: 'tool', toolName: response.functionCall.name, result: result });
      
      // Loop continues - call LLM again with tool result
    } else {
      // LLM gave final answer
      displayCard('answer', response.text);
      conversationHistory.push({ role: 'model', parts: response.text });
      break;
    }
  }
}
```

## Example Interactions

### Example 1: Simple Weather Query

**User:** "What's the weather in Tokyo?"

**Chain Display:**
1. 👤 User Query: "What's the weather in Tokyo?"
2. 🧠 Agent: "I'll fetch the weather data for Tokyo"
3. 🔧 Tool Call: `getWeather("Tokyo")`
4. 📊 Tool Result: `{temp: 18, conditions: "Cloudy", humidity: 65}`
5. ✅ Answer: "The weather in Tokyo is currently 18°C and cloudy with 65% humidity."

**LLM Calls:** 2 (initial + after tool result)

### Example 2: Multi-Step Research

**User:** "Find weather in San Francisco and tech news, then tell me if outdoor tech events would be good this week"

**Chain Display:**
1. 👤 User Query: "Find weather in San Francisco..."
2. 🧠 Agent: "I'll get the weather and news first"
3. 🔧 Tool Call: `getWeather("San Francisco")`
4. 📊 Tool Result: `{temp: 22, conditions: "Sunny", ...}`
5. 🧠 Agent: "Now let me get tech news"
6. 🔧 Tool Call: `scrapeNews("technology", 5)`
7. 📊 Tool Result: `[{title: "AI breakthrough...", ...}, ...]`
8. ✅ Answer: "With sunny 22°C weather in SF and current tech news showing..., outdoor tech events would be ideal this week!"

**LLM Calls:** 3 (initial + after weather + after news)

### Example 3: Calculation Task

**User:** "Calculate the sum of the first 6 Fibonacci numbers"

**Chain Display:**
1. 👤 User Query: "Calculate the sum of the first 6 Fibonacci numbers"
2. 🧠 Agent: "I'll calculate the Fibonacci sequence first"
3. 🔧 Tool Call: `calculateFibonacci(6)`
4. 📊 Tool Result: `[0, 1, 1, 2, 3, 5]`
5. ✅ Answer: "The first 6 Fibonacci numbers are [0,1,1,2,3,5], and their sum is 12."

**LLM Calls:** 2 (initial + after tool result)

## Security Considerations

- API keys stored in localStorage (not encrypted, acceptable for local dev extension)
- No data sent to third-party servers beyond documented APIs
- CORS headers must be handled for API calls (fetch from extension context)
- Content Security Policy in manifest.json restricts script execution

## Future Enhancements (Out of Scope)

These are explicitly NOT being built now, but could be added later:
- Persistent conversation history with chrome.storage.local
- Export conversation as PDF/text
- Custom tool builder UI
- Background service worker for long-running tasks
- Integration with webpage content via content scripts
- Voice input/output
- Multi-turn conversation branching

## Setup Instructions for Users

1. Clone repository
2. Get API keys:
   - Google Gemini: Visit ai.google.dev, create project, enable API, copy key
   - OpenWeatherMap: Visit openweathermap.org/api, sign up, copy key
3. Open Chrome → `chrome://extensions`
4. Enable "Developer mode"
5. Click "Load unpacked"
6. Select project folder
7. Click extension icon, enter API keys
8. Start asking questions!

## Success Metrics

- Extension loads without errors
- Agent successfully chains 2+ tool calls for complex queries
- All reasoning steps visible in UI
- Works with free API tiers (no payment required)
- Clear, educational demonstration of agentic AI concepts
