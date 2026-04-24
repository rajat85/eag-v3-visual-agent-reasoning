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
let changeKeysSection;
let changeKeysBtn;

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
  changeKeysSection = document.getElementById('change-keys-section');
  changeKeysBtn = document.getElementById('change-keys-btn');

  // Check if API keys are configured
  checkApiKeys();

  // Restore previous conversation
  restoreConversationState();

  // Event listeners
  saveKeysBtn.addEventListener('click', saveApiKeys);
  changeKeysBtn.addEventListener('click', () => {
    changeKeysSection.classList.add('hidden');
    apiKeysSection.classList.remove('hidden');
    geminiKeyInput.value = localStorage.getItem('gemini_api_key') || '';
    weatherKeyInput.value = localStorage.getItem('weather_api_key') || '';
  });
  sendBtn.addEventListener('click', handleSendMessage);
  clearBtn.addEventListener('click', clearConversation);
  geminiKeyInput.addEventListener('input', () => {
    if (geminiKeyInput.value.trim()) localStorage.setItem('gemini_api_key', geminiKeyInput.value.trim());
  });
  weatherKeyInput.addEventListener('input', () => {
    if (weatherKeyInput.value.trim()) localStorage.setItem('weather_api_key', weatherKeyInput.value.trim());
  });
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
    apiKeysSection.classList.add('hidden');
    changeKeysSection.classList.remove('hidden');
    userInput.disabled = false;
    sendBtn.disabled = false;
    clearBtn.disabled = false;
  } else {
    changeKeysSection.classList.add('hidden');
    apiKeysSection.classList.remove('hidden');
    // Pre-fill any partially saved keys so closing popup doesn't lose progress
    if (geminiKey) geminiKeyInput.value = geminiKey;
    if (weatherKey) weatherKeyInput.value = weatherKey;
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
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;
    const testResponse = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': geminiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'test' }] }]
      })
    });

    if (!testResponse.ok) {
      const errData = await testResponse.json().catch(() => ({}));
      const msg = errData.error?.message || `HTTP ${testResponse.status}`;
      throw new Error(msg);
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
 * Persist conversation state to chrome.storage.local
 */
function saveConversationState() {
  const cards = Array.from(chainContainer.children).map(card => ({
    type: card.className.replace('card card-', ''),
    html: card.outerHTML
  }));
  chrome.storage.local.set({ conversationHistory, cards });
}

/**
 * Restore conversation state from chrome.storage.local
 */
function restoreConversationState() {
  chrome.storage.local.get(['conversationHistory', 'cards'], (result) => {
    if (result.conversationHistory) {
      conversationHistory = result.conversationHistory;
    }
    if (result.cards && result.cards.length > 0) {
      result.cards.forEach(({ html }) => {
        chainContainer.insertAdjacentHTML('beforeend', html);
      });
      chainContainer.scrollTop = chainContainer.scrollHeight;
    }
  });
}

/**
 * Clear conversation history
 */
function clearConversation() {
  conversationHistory = [];
  chainContainer.innerHTML = '';
  chrome.storage.local.remove(['conversationHistory', 'cards']);
}

/**
 * Call Google Gemini API
 */
async function callGemini(contents) {
  const apiKey = localStorage.getItem('gemini_api_key');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: contents,
      tools: [{ functionDeclarations: window.ChromeAgentTools.TOOL_DEFINITIONS }]
    })
  });

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = `Gemini API error: ${errorData.error?.message || response.status}`;
    } catch (e) {
      // Response body is not JSON, use status code
    }
    throw new Error(errorMessage);
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
    const maxIterations = 10; // Prevent infinite loops
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

        // Preserve full model response (including thought_signature) exactly as returned
        conversationHistory.push({ role: 'model', parts: content.parts });

        // Execute tool
        try {
          const toolResult = await window.ChromeAgentTools.executeTool(toolName, toolArgs);
          displayCard('toolResult', toolResult);

          // Add result to history
          conversationHistory.push({
            role: 'user',
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
            role: 'user',
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

/**
 * Display a card in the reasoning chain
 */
function displayCard(type, content) {
  const card = document.createElement('div');
  card.className = `card card-${type}`;

  let icon = '';
  let title = '';
  let body = '';

  switch (type) {
    case 'user':
      icon = '👤';
      title = 'User Query';
      body = `<p class="card-text">${escapeHtml(content)}</p>`;
      break;

    case 'thinking':
      icon = '🧠';
      title = 'Agent Thinking';
      body = `<p class="card-text">${escapeHtml(content)}</p>`;
      break;

    case 'toolCall':
      icon = '🔧';
      title = 'Tool Call';
      const argsJson = JSON.stringify(content.args, null, 2);
      body = `
        <p class="card-text"><strong>${escapeHtml(content.name)}</strong></p>
        <pre class="card-code">${escapeHtml(argsJson)}</pre>
      `;
      break;

    case 'toolResult':
      icon = '📊';
      title = 'Tool Result';
      const resultJson = JSON.stringify(content, null, 2);
      body = `
        <details class="card-details">
          <summary>View result</summary>
          <pre class="card-code">${escapeHtml(resultJson)}</pre>
        </details>
      `;
      break;

    case 'answer':
      icon = '✅';
      title = 'Final Answer';
      body = `<p class="card-text card-answer-text">${escapeHtml(content)}</p>`;
      break;

    case 'error':
      icon = '⚠️';
      title = 'Error';
      body = `<p class="card-text card-error-text">${escapeHtml(content)}</p>`;
      break;
  }

  card.innerHTML = `
    <div class="card-header">
      <span class="card-icon">${icon}</span>
      <span class="card-title">${title}</span>
    </div>
    <div class="card-body">
      ${body}
    </div>
  `;

  chainContainer.appendChild(card);
  chainContainer.scrollTop = chainContainer.scrollHeight;
  saveConversationState();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
