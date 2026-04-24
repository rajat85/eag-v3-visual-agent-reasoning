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

  // Restore toggle state
  const geminiToggle = document.getElementById('gemini-toggle');
  geminiToggle.checked = localStorage.getItem('gemini_enabled') === 'true';
  updateGeminiKeyVisibility(geminiToggle.checked);
  geminiToggle.addEventListener('change', () => {
    localStorage.setItem('gemini_enabled', geminiToggle.checked);
    updateGeminiKeyVisibility(geminiToggle.checked);
    checkApiKeys();
  });

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
function updateGeminiKeyVisibility(enabled) {
  document.getElementById('gemini-key-group').classList.toggle('hidden', !enabled);
}

function checkApiKeys() {
  const geminiEnabled = document.getElementById('gemini-toggle').checked;
  const geminiKey = localStorage.getItem('gemini_api_key');
  const weatherKey = localStorage.getItem('weather_api_key');

  const keysReady = geminiEnabled ? (geminiKey && weatherKey) : weatherKey;

  if (keysReady) {
    apiKeysSection.classList.add('hidden');
    changeKeysSection.classList.remove('hidden');
    userInput.disabled = false;
    sendBtn.disabled = false;
    clearBtn.disabled = false;
  } else {
    changeKeysSection.classList.add('hidden');
    apiKeysSection.classList.remove('hidden');
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
 * Call the selected LLM, falling back to Ollama if Gemini is selected but fails.
 */
async function callLLM(contents) {
  const geminiEnabled = document.getElementById('gemini-toggle').checked;
  if (!geminiEnabled) {
    return await callOllama(contents);
  }
  try {
    return await callGemini(contents);
  } catch (geminiError) {
    displayCard('thinking', `⚠️ Gemini failed (${geminiError.message}) — falling back to Ollama gemma4`);
    return await callOllama(contents);
  }
}

async function callGemini(contents) {
  const apiKey = localStorage.getItem('gemini_api_key');
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
    body: JSON.stringify({
      contents,
      tools: [{ functionDeclarations: window.ChromeAgentTools.TOOL_DEFINITIONS }]
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content;
  if (!content) throw new Error('No response from Gemini');

  const functionCallPart = content.parts?.find(p => p.functionCall);
  return {
    provider: 'Gemini',
    rawContent: content,
    functionCall: functionCallPart ? { name: functionCallPart.functionCall.name, args: functionCallPart.functionCall.args } : null,
    text: content.parts?.find(p => p.text)?.text || null
  };
}

async function callOllama(contents) {
  // Convert Gemini-format contents to OpenAI-format messages
  const messages = contents.map(c => {
    if (c.role === 'user') {
      const fnResponse = c.parts?.find(p => p.functionResponse);
      if (fnResponse) {
        return {
          role: 'tool',
          tool_call_id: fnResponse.functionResponse.name,
          content: JSON.stringify(fnResponse.functionResponse.response)
        };
      }
      return { role: 'user', content: c.parts?.find(p => p.text)?.text || '' };
    }
    if (c.role === 'model') {
      const fnCall = c.parts?.find(p => p.functionCall);
      if (fnCall) {
        return {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: fnCall.functionCall.name,
            type: 'function',
            function: { name: fnCall.functionCall.name, arguments: JSON.stringify(fnCall.functionCall.args) }
          }]
        };
      }
      return { role: 'assistant', content: c.parts?.find(p => p.text)?.text || '' };
    }
    return null;
  }).filter(Boolean);

  // Convert Gemini tool definitions to OpenAI format
  const tools = window.ChromeAgentTools.TOOL_DEFINITIONS.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters }
  }));

  const response = await fetch('http://localhost:11434/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gemma4', messages, tools })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`Ollama error: ${errData.error?.message || `HTTP ${response.status}`}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error('No response from Ollama');

  const toolCall = message.tool_calls?.[0];
  return {
    provider: 'Ollama gemma4',
    rawContent: null,
    functionCall: toolCall ? { name: toolCall.function.name, args: JSON.parse(toolCall.function.arguments) } : null,
    text: message.content || null
  };
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

      const result = await callLLM(conversationHistory);
      hideLoading();

      displayCard('provider', result.provider);

      if (result.functionCall) {
        const { name: toolName, args: toolArgs } = result.functionCall;

        if (result.text) displayCard('thinking', result.text);
        displayCard('toolCall', { name: toolName, args: toolArgs });

        // Preserve full model turn in history
        if (result.rawContent) {
          conversationHistory.push({ role: 'model', parts: result.rawContent.parts });
        } else {
          conversationHistory.push({
            role: 'model',
            parts: [{ functionCall: { name: toolName, args: toolArgs } }]
          });
        }

        try {
          const toolResult = await window.ChromeAgentTools.executeTool(toolName, toolArgs);
          displayCard('toolResult', toolResult);
          conversationHistory.push({
            role: 'user',
            parts: [{ functionResponse: { name: toolName, response: { result: toolResult } } }]
          });
        } catch (toolError) {
          displayCard('error', `Tool error: ${toolError.message}`);
          conversationHistory.push({
            role: 'user',
            parts: [{ functionResponse: { name: toolName, response: { error: toolError.message } } }]
          });
        }
      } else {
        if (result.text) {
          displayCard('answer', result.text);
          conversationHistory.push({ role: 'model', parts: [{ text: result.text }] });
        }
        break;
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

    case 'provider':
      icon = content === 'Gemini' ? '✨' : '🦙';
      title = `Using ${content}`;
      body = '';
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
