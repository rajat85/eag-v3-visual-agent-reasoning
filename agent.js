// agent.js - Core agent logic

// State
let conversationHistory = [];
let isProcessing = false;

// DOM elements (initialized after DOM loads)
let chainContainer;
let userInput;
let sendBtn;
let clearBtn;
let loadingOverlay;
let apiKeysSection;
let geminiKeyInput;
let weatherKeyInput;
let saveKeysBtn;
let apiError;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  chainContainer = document.getElementById('chain-container');
  userInput = document.getElementById('user-input');
  sendBtn = document.getElementById('send-btn');
  clearBtn = document.getElementById('clear-btn');
  loadingOverlay = document.getElementById('loading-overlay');
  apiKeysSection = document.getElementById('api-keys-section');
  geminiKeyInput = document.getElementById('gemini-key');
  weatherKeyInput = document.getElementById('weather-key');
  saveKeysBtn = document.getElementById('save-keys-btn');
  apiError = document.getElementById('api-error');

  // Check if API keys are configured
  checkApiKeys();

  // Event listeners
  saveKeysBtn.addEventListener('click', saveApiKeys);
  sendBtn.addEventListener('click', handleSendMessage);
  clearBtn.addEventListener('click', clearConversation);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleSendMessage();
    }
  });
});

/**
 * Check if API keys are configured
 */
function checkApiKeys() {
  const geminiKey = localStorage.getItem('gemini_api_key');
  const weatherKey = localStorage.getItem('weather_api_key');

  if (geminiKey && weatherKey) {
    // Keys exist, hide setup section
    apiKeysSection.classList.add('hidden');
    userInput.disabled = false;
    sendBtn.disabled = false;
    clearBtn.disabled = false;
  } else {
    // Show setup section
    apiKeysSection.classList.remove('hidden');
  }
}

/**
 * Save API keys to localStorage
 */
async function saveApiKeys() {
  const geminiKey = geminiKeyInput.value.trim();
  const weatherKey = weatherKeyInput.value.trim();

  if (!geminiKey || !weatherKey) {
    apiError.textContent = 'Both API keys are required';
    return;
  }

  // Validate Gemini key with a test call
  try {
    showLoading();
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`;
    const testResponse = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'test' }] }]
      })
    });

    if (!testResponse.ok) {
      throw new Error('Invalid Gemini API key');
    }

    // Save keys
    localStorage.setItem('gemini_api_key', geminiKey);
    localStorage.setItem('weather_api_key', weatherKey);

    apiError.textContent = '';
    hideLoading();
    checkApiKeys();
  } catch (error) {
    hideLoading();
    apiError.textContent = `Error: ${error.message}`;
  }
}

/**
 * Show loading overlay
 */
function showLoading() {
  loadingOverlay.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

/**
 * Clear conversation history
 */
function clearConversation() {
  conversationHistory = [];
  chainContainer.innerHTML = '';
}

/**
 * Call Google Gemini API
 */
async function callGemini(contents) {
  const apiKey = localStorage.getItem('gemini_api_key');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: contents,
      tools: [{ functionDeclarations: window.ChromeAgentTools.TOOL_DEFINITIONS }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API error: ${errorData.error?.message || response.status}`);
  }

  return await response.json();
}

/**
 * Main agent loop
 */
async function runAgent(userQuery) {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Add user query to history and display
    conversationHistory.push({
      role: 'user',
      parts: [{ text: userQuery }]
    });
    displayCard('user', userQuery);

    // Agent loop
    let maxIterations = 10; // Prevent infinite loops
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      showLoading();

      // Call Gemini with conversation history
      const response = await callGemini(conversationHistory);
      hideLoading();

      const candidate = response.candidates?.[0];
      if (!candidate) {
        throw new Error('No response from Gemini');
      }

      const content = candidate.content;
      const functionCall = content.parts?.find(part => part.functionCall);

      if (functionCall) {
        // LLM wants to use a tool
        const toolName = functionCall.functionCall.name;
        const toolArgs = functionCall.functionCall.args;

        // Display thinking (if there's text before function call)
        const textPart = content.parts?.find(part => part.text);
        if (textPart?.text) {
          displayCard('thinking', textPart.text);
        }

        // Display tool call
        displayCard('toolCall', { name: toolName, args: toolArgs });

        // Execute tool
        try {
          const toolResult = await window.ChromeAgentTools.executeTool(toolName, toolArgs);
          displayCard('toolResult', toolResult);

          // Add function call and result to history
          conversationHistory.push({
            role: 'model',
            parts: [{ functionCall: functionCall.functionCall }]
          });
          conversationHistory.push({
            role: 'function',
            parts: [{
              functionResponse: {
                name: toolName,
                response: { result: toolResult }
              }
            }]
          });
        } catch (toolError) {
          // Tool execution failed
          displayCard('error', `Tool error: ${toolError.message}`);

          // Add error to history so LLM can see it
          conversationHistory.push({
            role: 'model',
            parts: [{ functionCall: functionCall.functionCall }]
          });
          conversationHistory.push({
            role: 'function',
            parts: [{
              functionResponse: {
                name: toolName,
                response: { error: toolError.message }
              }
            }]
          });
        }

        // Continue loop to get next LLM response
      } else {
        // LLM provided final answer
        const textPart = content.parts?.find(part => part.text);
        if (textPart?.text) {
          displayCard('answer', textPart.text);
          conversationHistory.push({
            role: 'model',
            parts: [{ text: textPart.text }]
          });
        }
        break; // Exit loop
      }
    }

    if (iteration >= maxIterations) {
      displayCard('error', 'Maximum iterations reached. Please try a simpler query.');
    }
  } catch (error) {
    hideLoading();
    displayCard('error', `Error: ${error.message}`);
  } finally {
    isProcessing = false;
  }
}

/**
 * Handle send message button click
 */
function handleSendMessage() {
  const query = userInput.value.trim();
  if (!query || isProcessing) return;

  userInput.value = '';
  runAgent(query);
}
