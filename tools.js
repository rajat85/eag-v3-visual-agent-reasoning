// tools.js - Tool function implementations

/**
 * Tool 1: Get current weather for a city
 */
async function getWeather(city) {
  if (!city || city.trim() === '') {
    throw new Error('City parameter is required');
  }

  // TODO: Consider using chrome.storage.local for better security
  const apiKey = localStorage.getItem('weather_api_key');
  if (!apiKey) {
    throw new Error('Weather API key not configured');
  }

  // Strip state codes (e.g. "Columbus, OH" → "Columbus") — API only supports city or city,country
  const cityName = city.split(',')[0].trim();
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`City "${city}" not found`);
      }
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      city: data.name,
      temperature: Math.round(data.main.temp),
      conditions: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed
    };
  } catch (error) {
    throw new Error(`Failed to fetch weather: ${error.message}`);
  }
}

/**
 * Tool 2: Scrape news headlines for a topic
 */
async function scrapeNews(topic, count = 5) {
  if (count < 1 || count > 50) {
    throw new Error('count must be between 1 and 50');
  }

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const items = xmlDoc.querySelectorAll('item');
    const articles = [];

    for (let i = 0; i < Math.min(items.length, count); i++) {
      const item = items[i];
      articles.push({
        title: item.querySelector('title')?.textContent || 'No title',
        link: item.querySelector('link')?.textContent || '',
        pubDate: item.querySelector('pubDate')?.textContent || ''
      });
    }

    if (articles.length === 0) {
      throw new Error(`No news found for topic: ${topic}`);
    }

    return articles;
  } catch (error) {
    throw new Error(`Failed to fetch news: ${error.message}`);
  }
}

/**
 * Tool 3: Calculate Fibonacci sequence
 */
function calculateFibonacci(n) {
  if (n < 1) {
    throw new Error('n must be at least 1');
  }
  if (n > 50) {
    throw new Error('n must be at most 50');
  }
  if (!Number.isInteger(n)) {
    throw new Error('n must be an integer');
  }

  const sequence = [];
  let a = 0, b = 1;

  for (let i = 0; i < n; i++) {
    sequence.push(a);
    const temp = a + b;
    a = b;
    b = temp;
  }

  return sequence;
}

/**
 * Tool 4: Get current time in a timezone
 */
function getCurrentTime(timezone) {
  if (!timezone || timezone.trim() === '') {
    throw new Error('Timezone parameter is required');
  }

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'long'
    });
    return formatter.format(now);
  } catch (error) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}

/**
 * Tool definitions for Gemini API
 */
const TOOL_DEFINITIONS = [
  {
    name: 'getWeather',
    description: 'Fetches current weather for a city including temperature, conditions, and humidity',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'City name (e.g., "New York", "London")'
        }
      },
      required: ['city']
    }
  },
  {
    name: 'scrapeNews',
    description: 'Fetches recent news headlines about a specific topic from Google News RSS',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'News topic or keyword to search for'
        },
        count: {
          type: 'number',
          description: 'Number of headlines to return (default 5)'
        }
      },
      required: ['topic']
    }
  },
  {
    name: 'calculateFibonacci',
    description: 'Calculates the first n numbers in the Fibonacci sequence',
    parameters: {
      type: 'object',
      properties: {
        n: {
          type: 'number',
          description: 'How many Fibonacci numbers to generate (max 50)'
        }
      },
      required: ['n']
    }
  },
  {
    name: 'getCurrentTime',
    description: 'Returns the current time in a specified timezone',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'IANA timezone identifier (e.g., "America/New_York", "Europe/London")'
        }
      },
      required: ['timezone']
    }
  }
];

/**
 * Execute a tool by name with arguments
 */
async function executeTool(toolName, args) {
  if (!args) {
    throw new Error('Tool arguments are required');
  }

  switch (toolName) {
    case 'getWeather':
      return await getWeather(args.city);
    case 'scrapeNews':
      return await scrapeNews(args.topic, args.count || 5);
    case 'calculateFibonacci':
      return calculateFibonacci(args.n);
    case 'getCurrentTime':
      return getCurrentTime(args.timezone);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Export to global scope for agent.js to use
window.ChromeAgentTools = {
  executeTool,
  TOOL_DEFINITIONS
};
