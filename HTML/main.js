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
const imageGenBtn = document.getElementById('image-gen-btn');


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
    if (type === 'html') {
        bodyContent = `<iframe class="preview-iframe" sandbox="allow-scripts allow-same-origin"></iframe>`;
    } else if (type === 'terminal' || type === 'summary' || type === 'explanation') {
        bodyContent = `<pre class="preview-terminal"></pre>`;
    } else if (type === 'image') {
        bodyContent = `<img class="preview-image" />`;
    }
    
    modal.innerHTML = `
        <div class="preview-container">
            <div class="preview-header">
                <h3 class="text-lg font-semibold">${type.charAt(0).toUpperCase() + type.slice(1)}</h3>
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
        
        const importRegex = /^(?:from\s+(\w+)|import\s+(\w+))/gm;
        const packages = new Set();
        let match;
        while ((match = importRegex.exec(code)) !== null) {
            packages.add(match[1] || match[2]);
        }

        if (packages.size > 0) {
            runButton.textContent = 'Loading...';
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
                plt.savefig(buf, format='png')
                buf.seek(0)
                base64.b64encode(buf.read()).decode('utf-8')
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
        if (!codeElement) return;

        hljs.highlightElement(codeElement);
        
        if (preElement.querySelector('.code-actions')) return; 
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'code-actions';
        
        const copyButton = document.createElement('button');
        copyButton.className = 'action-btn';
        copyButton.textContent = 'Copy';
        copyButton.addEventListener('click', () => {
            const codeToCopy = codeElement.innerText;
            const textArea = document.createElement('textarea');
            textArea.value = codeToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                copyButton.textContent = 'Copied!';
            } catch (err) {
                console.error('Failed to copy text: ', err);
                copyButton.textContent = 'Error';
            }
            document.body.removeChild(textArea);
            setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
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
    }, 1);
}

// --- Function to display user's prompt in the chat ---
function displayUserPrompt(prompt) {
    const promptContainer = document.createElement('div');
    promptContainer.className = 'user-prompt-container';
    
    const promptHeader = document.createElement('div');
    promptHeader.className = 'user-prompt-header';
    promptHeader.textContent = currentUserName;
    
    const promptContent = document.createElement('div');
    promptContent.textContent = prompt;
    
    promptContainer.appendChild(promptHeader);
    promptContainer.appendChild(promptContent);
    responseOutput.appendChild(promptContainer);
}

// --- Function to generate and display random suggestion chips ---
function displayRandomSuggestions() {
    suggestionChipsContainer.innerHTML = ''; // Clear existing chips
    const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
    const randomSuggestions = shuffled.slice(0, 3);

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
    const hinglishWords = ['bhai', 'kya', 'hai', 'kaise', 'kab', 'kyun', 'aur', 'toh', 'ekdum', 'mast'];
    const words = text.toLowerCase().split(/\s+/);
    const hasHinglish = words.some(word => hinglishWords.includes(word));
    const hasEnglish = words.some(word => word.length > 3 && !hinglishWords.includes(word)); // Simple check for English words
    
    if (hasHinglish && hasEnglish) {
        return 'Hinglish';
    }
    return 'English'; // Default to English
}
//function for fetching the weather API
// --- Function to generate and display random suggestion chips ---
function displayRandomSuggestions() {
    suggestionChipsContainer.innerHTML = ''; // Clear existing chips
    const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
    const randomSuggestions = shuffled.slice(0, 3);

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

// --- Weather Fetching Function (AccuWeather) ---
async function getWeather(city) {
    // IMPORTANT: Replace with your own free API key from AccuWeather
    const apiKey = 'KYNEZGbI8PxFGEBMSAP3Xhgl6kGLPUcP'; 
    if (apiKey === 'KYNEZGbI8PxFGEBMSAP3Xhgl6kGLPUcP') {
        return "Weather API key is not set. Please add your AccuWeather API key in script.js";
    }
    
    const locationUrl = `http://dataservice.accuweather.com/locations/v1/cities/search?apikey=${apiKey}&q=${city}`;

    try {
        // Step 1: Get the location key for the city
        const locationResponse = await fetch(locationUrl);
        if (!locationResponse.ok) {
            throw new Error('Failed to find location.');
        }
        const locationData = await locationResponse.json();
        if (!locationData || locationData.length === 0) {
            return `Sorry, I couldn't find the location for ${city}.`;
        }
        const locationKey = locationData[0].Key;

        // Step 2: Get the current weather using the location key
        const weatherUrl = `http://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${apiKey}&details=true`;
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) {
            throw new Error('Failed to fetch weather data.');
        }
        const weatherData = await weatherResponse.json();
        if (!weatherData || weatherData.length === 0) {
            return `Sorry, could not get current conditions for ${city}.`;
        }
        
        const data = weatherData[0];
        const temp = data.Temperature.Metric.Value;
        const description = data.WeatherText;
        const humidity = data.RelativeHumidity;
        const wind = data.Wind.Speed.Metric.Value;
        
        return `The current weather in ${city} is ${description} with a temperature of ${temp}°C. The humidity is ${humidity}% and the wind speed is ${wind} km/h.`;

    } catch (error) {
        console.error("Weather fetch error:", error);
        return `Sorry, there was an error fetching the weather for ${city}.`;
    }
}

// --- Gemini API Call Function ---
async function callGeminiAPI(payload) {
    const apiKey = "AIzaSyDNmcvVY8fub1RFPTvSvc8tYHgWAOVozZA";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
    return await response.json();
}

// --- ✨ New Gemini Features ---
async function summarizeChat() {
    if (chatHistory.length === 0) {
        openPreview('summary', 'Chat history is empty.');
        return;
    }
    const historyText = chatHistory.map(item => `${item.role}: ${item.parts[0].text}`).join('\n');
    const prompt = `Please provide a concise summary of the following conversation,try to provide the result in best format i.e bullet points or numbering:\n\n${historyText}`;
    openPreview('summary', 'Summarizing...');
    const result = await callGeminiAPI({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const summary = result.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate summary.";
    openPreview('summary', summary);
}

async function generateImage(prompt) {
    if (!prompt) {
        openPreview('terminal', "Bhai, image banane ke liye kuch likho to sahi!");
        return;
    }
    openPreview('image', '[https://placehold.co/512x512/282c34/a9aaad?text=Generating](https://placehold.co/512x512/282c34/a9aaad?text=Generating)...');
    const payload = { instances: [{ prompt: prompt }], parameters: { "sampleCount": 1 } };
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        const dynamicModal = document.getElementById('dynamic-preview-modal');
        if (result.predictions?.[0]?.bytesBase64Encoded) {
            const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
            if(dynamicModal) dynamicModal.querySelector('.preview-image').src = imageUrl;
        } else {
            throw new Error(result.error?.message || "No image data in response.");
        }
    } catch (error) {
        console.error("Image generation error:", error);
        const dynamicModal = document.getElementById('dynamic-preview-modal');
        if(dynamicModal) dynamicModal.remove();
        openPreview('terminal', `Error generating image: ${error.message}`);
    }
}

async function explainCode(code) {
    const prompt = `Please explain the following code snippet line by line in a simple way:\n\n\`\`\`\n${code}\n\`\`\``;
    openPreview('explanation', 'Explaining code...');
    const result = await callGeminiAPI({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const explanation = result.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate explanation.";
    openPreview('explanation', explanation);
}

// --- Event Listeners ---
summarizeBtn.addEventListener('click', summarizeChat);
imageGenBtn.addEventListener('click', () => generateImage(promptInput.value));
stopBtn.addEventListener('click', () => {
    if (typingInterval) {
        clearInterval(typingInterval);
        loaderContainer.classList.add('hidden');
        // Process any fully formed code blocks after stopping
        const lastResponseContent = responseOutput.querySelector('.ai-response-container:last-child .response-content');
        if (lastResponseContent) {
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
    mainContentArea.style.justifyContent = 'flex-start';
    
    displayUserPrompt(userPrompt);
    
    loaderContainer.classList.remove('hidden');
    mainContentArea.scrollTop = mainContentArea.scrollHeight;

    // --- AI Name intent detection ---
    const aiNameKeywords = [
        'name','naam',
        'who are you',
        'what is your name',
        'tell me your name',
        'apka naam',
        'tumhara naam',
        'tuhara naam',
        'aapka naam',
        'naam kya hai'
    ];
    const isAiNameQuery = aiNameKeywords.some(keyword => userPrompt.toLowerCase().includes(keyword));
    if (isAiNameQuery) {
        const aiNameResponse = 'GENAI is my name and I am developed by Anurag, and currently I am under the development phase.';
        const aiResponseContainer = document.createElement('div');
        aiResponseContainer.className = 'ai-response-container';
        const responseContent = document.createElement('div');
        responseContent.className = 'response-content';
        responseContent.textContent = aiNameResponse;
        aiResponseContainer.appendChild(responseContent);
        responseOutput.appendChild(aiResponseContainer);
        loaderContainer.classList.add('hidden');
        mainContentArea.scrollTop = mainContentArea.scrollHeight;
        return;
    }

    // --- Weather intent detection and fetch ---
    let toolResult = null;
    const weatherKeywords = ['weather', 'mausam', 'tapman', 'temperature'];
    const isWeatherQuery = weatherKeywords.some(keyword => userPrompt.toLowerCase().includes(keyword));

    if (isWeatherQuery) {
        const analysisPrompt = `Extract the city name from the following prompt. Respond with only the city name, or "N/A" if no city is found. Prompt: "${userPrompt}"`;
        try {
            const analysisResult = await callGeminiAPI({ contents: [{ role: "user", parts: [{ text: analysisPrompt }] }] });
            const city = analysisResult.candidates?.[0]?.content?.parts?.[0]?.text.trim();

            if (city && city !== "N/A") {
                const toolInfoDiv = document.createElement('div');
                toolInfoDiv.className = 'tool-call-info';
                toolInfoDiv.textContent = `Fetching weather for ${city}...`;
                responseOutput.appendChild(toolInfoDiv);
                mainContentArea.scrollTop = mainContentArea.scrollHeight;
                toolResult = await getWeather(city);
            }
        } catch (error) {
            console.error("Weather tool logic failed:", error);
        }
    }

    chatHistory.push({ role: "user", parts: [{ text: userPrompt }] });
    if (toolResult) {
         chatHistory.push({ role: "model", parts: [{ text: `[Function Call Result: ${toolResult}]` }] });
    }

    const analysisPrompt = `Does the following user prompt require real-time information (like current time, date, or news)? Answer with a concise Google search query if yes, otherwise answer "NO_TOOL_NEEDED". Prompt: "${userPrompt}"`;
    
    let searchResultInfo = null;
    
    try {
        const analysisResult = await callGeminiAPI({ contents: [{ role: "user", parts: [{ text: analysisPrompt }] }] });
        const toolQuery = analysisResult.candidates?.[0]?.content?.parts?.[0]?.text.trim();

        if (toolQuery && toolQuery !== "NO_TOOL_NEEDED") {
            const toolInfoDiv = document.createElement('div');
            toolInfoDiv.className = 'tool-call-info';
            toolInfoDiv.textContent = `Searching for: "${toolQuery}"...`;
            responseOutput.appendChild(toolInfoDiv);
            mainContentArea.scrollTop = mainContentArea.scrollHeight;
            searchResultInfo = googleSearch(toolQuery);
        }
    } catch (error) {
        console.error("Tool analysis failed:", error);
    }
    
    if (searchResultInfo) {
         chatHistory.push({ role: "model", parts: [{ text: `[Function Call: Searching for "${userPrompt}"]` }] });
         chatHistory.push({ role: "user", parts: [{ text: `[Tool Output: ${searchResultInfo}]` }] });
    }

    // --- Smart System Instruction ---
    const languageStyle = detectLanguageStyle(userPrompt);
    let systemInstruction = `Format your entire response using Markdown. Use tables for tabular data,use bullet points and numbering for the definition of any question, headings for titles, and specify the language for code blocks (e.g., \`\`\`python).`;
    if (languageStyle === 'Hinglish') {
        systemInstruction = `Your primary task is to mirror the user's language style and tone precisely. The user is communicating in Hinglish (a mix of Hindi and English), so you must respond in the same mixed-language style. Do not default to a pure language. ${systemInstruction}`;
    } else {
         systemInstruction = `Respond to the user in clear and professional English. ${systemInstruction}`;
    }
    
    if (searchResultInfo) {
        systemInstruction += ` If you are provided with tool output in the history, use that information to directly answer the user's question without mentioning the tool or the information source.`;
    }

    const payload = { 
        contents: [
            ...chatHistory,
            { role: "user", parts: [{ text: `${systemInstruction} The user's latest prompt is: "${userPrompt}"` }] }
        ]
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
            loaderContainer.classList.add('hidden');
            const errorContainer = document.createElement('div');
            errorContainer.innerHTML = '<p>Sorry, I could not generate a response. Please try again.</p>';
            responseOutput.appendChild(errorContainer);
        }

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        loaderContainer.classList.add('hidden');
        const errorContainer = document.createElement('div');
        errorContainer.innerHTML = `<p>An error occurred: ${error.message}. Please check the console for details.</p>`;
        responseOutput.appendChild(errorContainer);
    }
});

//function to show the popup for the feature button
function showPopup() {
    popupOverlay.classList.remove('hidden'); // 'hidden' class ko hata do
}

//function to hide the popup button for the feature btn
function hidePopup() {
    popupOverlay.classList.add('hidden'); // 'hidden' class ko wapas laga do
}

// event listner for the feature btn
featureBtn.addEventListener('click', showPopup);

closePopupBtn.addEventListener('click', hidePopup);

// jab user black background pe click kre, tb bhi popup band ho jaaye.
popupOverlay.addEventListener('click', function(event) {
    // Yeh check karta hai ki click overlay par hua hai, na ki popup box ke andar

    if (event.target === popupOverlay) {
        hidePopup();
    }
});

