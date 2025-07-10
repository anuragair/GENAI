const nameSectionContainer = document.getElementById('name-section-container');
const appContainer = document.getElementById('app-container');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const greeting = document.getElementById('greeting');
const userNameSpan = document.getElementById('user-name');

const mainContentArea = document.getElementById('main-content-area');
const welcomeView = document.getElementById('welcome-view');
const responseView = document.getElementById('response-view');

const promptForm = document.getElementById('prompt-form');
const promptInput = document.getElementById('prompt-input');
const loaderContainer = document.getElementById('loader-container');
const stopBtn = document.getElementById('stop-btn');
const responseOutput = document.getElementById('response-output');
const suggestionChipsContainer = document.getElementById('suggestion-chips-container');
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = document.getElementById('theme-icon-sun');
const moonIcon = document.getElementById('theme-icon-moon');
const summarizeBtn = document.getElementById('summarize-btn');
const featureBtn = document.getElementById('feature-btn');
const popupOverlay = document.getElementById('popup-overlay');
const closePopupBtn = document.getElementById('close-popup-btn');

let pyodide = null;
let isPyodideLoading = false;

async function initializePyodide() {
    if (pyodide || isPyodideLoading) return;
    isPyodideLoading = true;
    console.log("Initializing Pyodide...");
    pyodide = await loadPyodide();
    console.log("Pyodide ready.");
    isPyodideLoading = false;
}
// --- Theme Toggle ---
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    sunIcon.classList.toggle('hidden');
    moonIcon.classList.toggle('hidden');
});
let chatHistory = []; // Array to store the conversation history
let currentUserName = "You"; // Default user name
let typingInterval = null; // To control the typing animation

const allSuggestions = [
    "Simulate a virtual ecosystem",
    "Compare teachings of Plato and Aristotle",
    "Generate novel protein structures",
    "Write a python script to sort a list",
    "Explain quantum computing in simple terms",
    "Draft an email to my boss about my new project idea",
    "Create a recipe for a vegan chocolate cake",
    "What are the main tourist attractions in Bihar?",
    "Compose a short poem about rain",
    "Give me some ideas for a weekend trip near Darbhanga",
    "How does a blockchain work?",
    "Write a simple HTML page with a button",
    "surprise me",
    "What are the ingredients to make a cake"
];
// Auto-resize textarea
promptInput.addEventListener('input', () => {
    promptInput.style.height = 'auto';
    promptInput.style.height = (promptInput.scrollHeight) + 'px';
});

// --- Dynamic Modal Control ---
function openPreview(type, content) {
    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    modal.id = 'dynamic-preview-modal';
    
    let bodyContent = '';
    const title = type.charAt(0).toUpperCase() + type.slice(1);

    if (type === 'html') {
        bodyContent = `<iframe class="preview-iframe" sandbox="allow-scripts allow-same-origin"></iframe>`;
    } else if (type === 'terminal' || type === 'summary' || type === 'explanation') {
        bodyContent = `<pre class="preview-terminal"></pre>`;
    } else if (type === 'image') {
        bodyContent = `<img class="preview-image" alt="Generated plot"/>`;
    }
    
    modal.innerHTML = `
        <div class="preview-container">
            <div class="preview-header">
                <h3 class="text-lg font-semibold">${title}</h3>
                <button class="action-btn close-preview-btn">Close</button>
            </div>
            <div class="preview-body">${bodyContent}</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    if (type === 'html') {
        modal.querySelector('.preview-iframe').srcdoc = content;
    } else if (type === 'terminal' || type === 'summary' || type === 'explanation') {
        modal.querySelector('.preview-terminal').textContent = content;
    } else if (type === 'image') {
        modal.querySelector('.preview-image').src = content;
    }

    const closeModal = () => {
        modal.remove();
        window.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (event) => {
        if (event.key === 'Escape') closeModal();
    };

    modal.querySelector('.close-preview-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });
    window.addEventListener('keydown', handleEsc);
}

// --- Python Code Execution with Auto-Package Loading ---
async function runPythonCode(code, runButton) {
    runButton.textContent = 'Initializing...';
    runButton.disabled = true;

    try {
        if (!pyodide) {
            await initializePyodide();
        }
        
        runButton.textContent = 'Loading...';
        const importRegex = /^(?:from\s+(\w+)|import\s+(\w+))/gm;
        const packages = new Set();
        let match;
        while ((match = importRegex.exec(code)) !== null) {
            packages.add(match[1] || match[2]);
        }

        if (packages.size > 0) {
            await pyodide.loadPackage([...packages]);
        }
        
        runButton.textContent = 'Running...';
        
        const isMatplotlibUsed = packages.has('matplotlib');
        if (isMatplotlibUsed) {
            await pyodide.runPythonAsync(`
                import matplotlib.pyplot as plt
                import io, base64
            `);
        }

        await pyodide.runPythonAsync(`
            import sys, io
            sys.stdout = io.StringIO()
        `);
        
        await pyodide.runPythonAsync(code);
        
        let output = await pyodide.runPythonAsync("sys.stdout.getvalue()");
        
        if (isMatplotlibUsed) {
             const image_b64 = await pyodide.runPythonAsync(`
                buf = io.BytesIO()
                if plt.get_fignums(): # Check if a figure exists
                    plt.savefig(buf, format='png')
                    buf.seek(0)
                    base64.b64encode(buf.read()).decode('utf-8')
                else:
                    ""
            `);
            if (image_b64) {
                openPreview('image', 'data:image/png;base64,' + image_b64);
                return;
            }
        }
        
        openPreview('terminal', output || '(No output)');

    } catch (error) {
        console.error("Python execution error:", error);
        openPreview('terminal', `Error: ${error.message}`);
    } finally {
        runButton.textContent = 'Run Code';
        runButton.disabled = false;
    }
}


// --- Helper function to add buttons and highlight code ---
function processCodeBlocks(container) {
    container.querySelectorAll('pre').forEach(preElement => {
        const codeElement = preElement.querySelector('code');
        if (!codeElement || preElement.querySelector('.code-actions')) return;

        hljs.highlightElement(codeElement);
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'code-actions';
        
        const copyButton = document.createElement('button');
        copyButton.className = 'action-btn';
        copyButton.textContent = 'Copy';
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(codeElement.innerText).then(() => {
                copyButton.textContent = 'Copied!';
                setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                copyButton.textContent = 'Error';
                setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
            });
        });
        actionsContainer.appendChild(copyButton);

        const language = [...codeElement.classList].find(cls => cls.startsWith('language-'));
        if (language) {
            const explainButton = document.createElement('button');
            explainButton.className = 'action-btn';
            explainButton.innerHTML = '✨ Explain';
            explainButton.addEventListener('click', () => explainCode(codeElement.innerText));
            actionsContainer.appendChild(explainButton);
        }

        if (language === 'language-html' || language === 'language-python') {
            const runButton = document.createElement('button');
            runButton.className = 'action-btn';
            runButton.textContent = 'Run Code';
            runButton.addEventListener('click', () => {
                const codeToRun = codeElement.innerText;
                if (language === 'language-html') {
                    openPreview('html', codeToRun);
                } else if (language === 'language-python') {
                    runPythonCode(codeToRun, runButton);
                }
            });
            actionsContainer.appendChild(runButton);
        }
        
        preElement.appendChild(actionsContainer);
    });
}

// --- Helper function for the typing effect with live rendering ---
function typeResponse(text, container) {
    let i = 0;
    let currentText = "";
    clearInterval(typingInterval); // Clear any existing interval
    typingInterval = setInterval(() => {
        if (i < text.length) {
            currentText += text.charAt(i);
            container.innerHTML = marked.parse(currentText);
            i++;
            mainContentArea.scrollTop = mainContentArea.scrollHeight;
        } else {
            clearInterval(typingInterval);
            container.innerHTML = marked.parse(text); 
            processCodeBlocks(container);
            mainContentArea.scrollTop = mainContentArea.scrollHeight;
            loaderContainer.classList.add('hidden');
            
            if (text.includes('```python')) {
                initializePyodide();
            }
        }
    }, 10); // Adjusted interval for better performance
}

// --- Function to display user's prompt in the chat ---
function displayUserPrompt(prompt) {
    const promptContainer = document.createElement('div');
    promptContainer.className = 'user-prompt-container';
    
    const promptHeader = document.createElement('div');
    promptHeader.className = 'user-prompt-header';
    promptHeader.textContent = currentUserName;
    
    const promptContent = document.createElement('div');
    promptContent.className = 'user-prompt-content';
    promptContent.textContent = prompt;
    
    promptContainer.appendChild(promptHeader);
    promptContainer.appendChild(promptContent);
    responseOutput.appendChild(promptContainer);
}

// --- Function to generate and display random suggestion chips ---
function displayRandomSuggestions() {
    suggestionChipsContainer.innerHTML = ''; // Clear existing chips
    const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
    const randomSuggestions = shuffled.slice(0, 4); // Show 4 suggestions

    randomSuggestions.forEach(suggestionText => {
        const chip = document.createElement('button');
        chip.className = 'suggestion-chip px-4 py-2 rounded-full transition';
        chip.style.backgroundColor = 'var(--suggestion-chip-bg)';
        chip.style.border = '1px solid var(--border-color)';
        chip.style.color = 'var(--text-primary)';
        chip.textContent = suggestionText;
        chip.addEventListener('click', () => {
            promptInput.value = chip.textContent;
            promptForm.dispatchEvent(new Event('submit', { cancelable: true }));
        });
        suggestionChipsContainer.appendChild(chip);
    });
}

// --- Simulated Google Search Tool ---
function googleSearch(query) {
    console.log(`Simulating Google Search for: "${query}"`);
    if (query.toLowerCase().includes('time')) {
        return `The current date and time is: ${new Date().toString()}`;
    }
    if (query.toLowerCase().includes('news')) {
        return "Latest News: 1. Tech giant announces new AI model. 2. Global markets show mixed results. 3. Sports team wins championship.";
    }
    if (query.toLowerCase().includes('prime minister of japan')) {
        return "The current Prime Minister of Japan is Fumio Kishida.";
    }
    return `No specific real-time information found for "${query}".`;
}

// --- Language Style Detection ---
function detectLanguageStyle(text) {
    const hinglishWords = ['bhai', 'kya', 'hai', 'kaise', 'kab', 'kyun', 'aur', 'toh', 'ekdum', 'mast', 'naam'];
    const words = text.toLowerCase().split(/\s+/);
    const hasHinglish = words.some(word => hinglishWords.includes(word));
    // A simple check for non-Hinglish, likely English words
    const hasEnglish = words.some(word => word.length > 3 && !hinglishWords.includes(word));
    
    if (hasHinglish && hasEnglish) return 'Hinglish';
    if (hasHinglish && !hasEnglish) return 'Hinglish';
    return 'English'; // Default to English
}

// --- Placeholder for Weather Function ---
// This function prevents the app from crashing. 
// For real functionality, you would implement a weather API call here.
async function getWeather(city) {
    console.log(`Simulating weather fetch for: ${city}`);
    return `The weather feature is currently for demonstration. Real-time weather for ${city} is not available.`;
}

// --- Gemini API Call Function ---
// --- Gemini API Call Function ---
async function callGeminiAPI(payload) {
    // IMPORTANT: Replace with your actual Google Gemini API key.
    // It is STRONGLY recommended to use a backend proxy for production to keep your key secure.
    const apiKey = "AIzaSyDNmcvVY8fub1RFPTvSvc8tYHgWAOVozZA"; // Your key here

    // The API key should NOT be in the URL. It goes in the headers.
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Add the API key to the request headers
            'X-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        // Provide a more specific error message if available
        const message = errorData.error?.message || response.statusText;
        throw new Error(`API request failed: ${message}`);
    }
    return await response.json();
}
// --- ✨ New Gemini Features ---
async function summarizeChat() {
    if (chatHistory.length < 2) { // Need at least one user prompt and one model response
        openPreview('summary', 'There is not enough conversation to summarize yet.');
        return;
    }
    openPreview('summary', 'Summarizing...');
    const historyText = chatHistory.map(item => `${item.role === 'user' ? currentUserName : 'GenAI'}: ${item.parts[0].text}`).join('\n');
    const prompt = `Please provide a concise summary of the following conversation. Format the result using bullet points or numbered lists for clarity:\n\n${historyText}`;
    
    try {
        const result = await callGeminiAPI({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
        const summary = result.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate summary.";
        openPreview('summary', summary);
    } catch (error) {
        openPreview('summary', `Error: ${error.message}`);
    }
}

async function explainCode(code) {
    openPreview('explanation', 'Explaining code...');
    const prompt = `Please explain the following code snippet line by line in a simple way:\n\n\`\`\`\n${code}\n\`\`\``;
    try {
        const result = await callGeminiAPI({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
        const explanation = result.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate explanation.";
        openPreview('explanation', explanation);
    } catch (error) {
        openPreview('explanation', `Error: ${error.message}`);
    }
}

//--- Event Listeners ---

summarizeBtn.addEventListener('click', summarizeChat);

stopBtn.addEventListener('click', () => {
    if (typingInterval) {
        clearInterval(typingInterval);
        loaderContainer.classList.add('hidden');
        // Finalize the partially typed response
        const lastResponseContent = responseOutput.querySelector('.ai-response-container:last-child .response-content');
        if (lastResponseContent) {
            const fullText = chatHistory[chatHistory.length - 1].parts[0].text;
            lastResponseContent.innerHTML = marked.parse(fullText);
            processCodeBlocks(lastResponseContent);
        }
    }
});

nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userName = nameInput.value.trim();
    if (userName) {
        currentUserName = userName;
        userNameSpan.textContent = userName;
        
        displayRandomSuggestions();
        
        nameSectionContainer.classList.add('fade-out-up');

        setTimeout(() => {
            nameSectionContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            appContainer.classList.add('flex', 'fade-in');
        }, 500);
    }
});

promptForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userPrompt = promptInput.value.trim();
    if (!userPrompt) return;
    
    promptInput.value = '';
    promptInput.style.height = 'auto';

    welcomeView.classList.add('hidden');
    responseView.classList.remove('hidden');
    
    displayUserPrompt(userPrompt);
    
    loaderContainer.classList.remove('hidden');
    mainContentArea.scrollTop = mainContentArea.scrollHeight;

    // --- AI Name intent detection ---
    const aiNameKeywords = ['name', 'naam', 'who are you', 'what is your name', 'tell me your name', 'apka naam', 'tumhara naam', 'tuhara naam', 'aapka naam', 'naam kya hai'];
    const isAiNameQuery = aiNameKeywords.some(keyword => userPrompt.toLowerCase().includes(keyword));
    if (isAiNameQuery) {
        const aiNameResponse = 'My name is GenAI. I was developed by Anurag and am currently in the development phase.';
        const aiResponseContainer = document.createElement('div');
        aiResponseContainer.className = 'ai-response-container';
        const responseContent = document.createElement('div');
        responseContent.className = 'response-content';
        aiResponseContainer.appendChild(responseContent);
        responseOutput.appendChild(aiResponseContainer);
        typeResponse(aiNameResponse, responseContent); // Use typeResponse for consistency
        return;
    }

    chatHistory.push({ role: "user", parts: [{ text: userPrompt }] });
    
    // --- Tool Use Simulation Logic ---
    let toolResult = null;
    let toolInfoMessage = '';

    const weatherKeywords = ['weather', 'mausam', 'tapman', 'temperature'];
    const isWeatherQuery = weatherKeywords.some(keyword => userPrompt.toLowerCase().includes(keyword));

    if (isWeatherQuery) {
        const analysisPrompt = `Extract the city name from this prompt. Respond with only the city name, or "N/A". Prompt: "${userPrompt}"`;
        try {
            const analysisResult = await callGeminiAPI({ contents: [{ role: "user", parts: [{ text: analysisPrompt }] }] });
            const city = analysisResult.candidates?.[0]?.content?.parts?.[0]?.text.trim();

            if (city && city !== "N/A") {
                toolInfoMessage = `Simulating weather fetch for ${city}...`;
                toolResult = await getWeather(city);
            }
        } catch (error) {
            console.error("Weather tool logic failed:", error);
            // Don't block the chat if tool fails
        }
    } else {
        const analysisPrompt = `Does this prompt require real-time information (like current time, date, or news)? Answer with a concise Google search query if yes, otherwise answer "NO_TOOL_NEEDED". Prompt: "${userPrompt}"`;
        try {
            const analysisResult = await callGeminiAPI({ contents: [{ role: "user", parts: [{ text: analysisPrompt }] }] });
            const toolQuery = analysisResult.candidates?.[0]?.content?.parts?.[0]?.text.trim();

            if (toolQuery && toolQuery !== "NO_TOOL_NEEDED") {
                toolInfoMessage = `Simulating search for: "${toolQuery}"...`;
                toolResult = googleSearch(toolQuery);
            }
        } catch (error) {
            console.error("Tool analysis failed:", error);
        }
    }

    if (toolInfoMessage) {
        const toolInfoDiv = document.createElement('div');
        toolInfoDiv.className = 'tool-call-info';
        toolInfoDiv.textContent = toolInfoMessage;
        responseOutput.appendChild(toolInfoDiv);
        mainContentArea.scrollTop = mainContentArea.scrollHeight;
    }
     if (toolResult) {
         // Providing tool output back to the model for a grounded response
         chatHistory.push({ role: "user", parts: [{ text: `[Tool Output: ${toolResult}]` }] });
    }

    // --- Smart System Instruction ---
    const languageStyle = detectLanguageStyle(userPrompt);
    let systemInstruction = `You are GenAI. Format your entire response using Markdown. Use tables for tabular data, bullet points, and numbered lists. Use headings for titles. Specify the language for code blocks (e.g., \`\`\`python).`;
    
    if (languageStyle === 'Hinglish') {
        systemInstruction += ` You MUST respond in Hinglish (a mix of Hindi and English) because the user is communicating in that style. Mirror their language and tone.`;
    } else {
         systemInstruction += ` Respond clearly in professional English.`;
    }
    
    if (toolResult) {
        systemInstruction += ` You have been provided with Tool Output. Use this information to directly answer the user's question. Do NOT mention the tool or the process of getting the information. Just give the answer.`;
    }

    const payload = { 
        contents: chatHistory,
        system_instruction: {
            role: "system",
            parts: [{ text: systemInstruction }]
        }
    };

    try {
        const result = await callGeminiAPI(payload);
        
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            const generatedText = result.candidates[0].content.parts[0].text;
            
            chatHistory.push({ role: "model", parts: [{ text: generatedText }] });

            const aiResponseContainer = document.createElement('div');
            aiResponseContainer.className = 'ai-response-container';
            const responseContent = document.createElement('div');
            responseContent.className = 'response-content';
            aiResponseContainer.appendChild(responseContent);
            responseOutput.appendChild(aiResponseContainer);

            typeResponse(generatedText, responseContent);
        } else {
            throw new Error("Received an empty response from the API.");
        }

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        loaderContainer.classList.add('hidden');
        const errorContainer = document.createElement('div');
        errorContainer.className = 'ai-response-container response-content';
        errorContainer.innerHTML = `<p>An error occurred: ${error.message}. Please check your API key and network connection.</p>`;
        responseOutput.appendChild(errorContainer);
    }
});

// Popup logic
function showPopup() {
    if (popupOverlay) popupOverlay.classList.remove('hidden');
}
function hidePopup() {
    if (popupOverlay) popupOverlay.classList.add('hidden');
}
if (featureBtn) featureBtn.addEventListener('click', showPopup);
if (closePopupBtn) closePopupBtn.addEventListener('click', hidePopup);
if (popupOverlay) {
    popupOverlay.addEventListener('click', function(event) {
        if (event.target === popupOverlay) {
            hidePopup();
        }
    });
}