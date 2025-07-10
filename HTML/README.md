# GENAI - A Generative AI Chat Project

GENAI is a sleek, modern web application designed to explore the capabilities of Generative AI. It provides a conversational interface to interact with Google's Gemini model, featuring real-time responses, code execution, and other advanced functionalities.

---

## ✨ Features

- **Conversational AI:** Engage in natural, context-aware conversations.
- **Markdown Rendering:** Responses are beautifully formatted with support for tables, lists, code blocks, and more.
- **Python Code Execution:** Run Python code snippets directly in the browser, powered by Pyodide. It automatically handles package installation and displays output, including Matplotlib plots.
- **HTML Previews:** Instantly render and preview HTML code in a sandboxed iframe.
- **Code Analysis:** Get simple, line-by-line explanations for code snippets.
- **Chat Summarization:** Quickly generate a concise summary of the current conversation.
- **Intelligent Tool Use (Simulated):**
    - Detects questions about real-time information and simulates a web search.
    - Detects weather-related queries and simulates fetching data.
- **Hinglish Support:** Automatically detects and adapts to a Hinglish (Hindi-English mix) conversational style.
- **Responsive Design:** A clean, modern UI that works seamlessly on all screen sizes.
- **Light/Dark Mode:** Toggle between themes for your viewing comfort.

---

## 🚀 Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript
- **Styling:** TailwindCSS for utility-first styling.
- **AI Model:** Google Gemini API
- **In-Browser Python:** [Pyodide](https://pyodide.org/en/stable/)
- **Syntax Highlighting:** [highlight.js](https://highlightjs.org/)
- **Markdown Parsing:** [marked.js](https://marked.js.org/)

---

## 🔧 Setup & Usage

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd genai-project
    ```

3.  **Get a Gemini API Key:**
    - Visit the [Google AI for Developers](https://ai.google.dev/) page to get your free API key.

4.  **Add your API Key:**
    - Open the `main.js` file.
    - Find the line `const apiKey = "YOUR_API_KEY_HERE";`
    - Replace `"YOUR_API_KEY_HERE"` with your actual Gemini API key.

5.  **Open `index.html`:**
    - Open the `index.html` file in your web browser to start using the application.

**Note:** All functions and code blocks related to direct image generation calls have been removed as per the project's focus. However, Python code that generates plots with Matplotlib will still display the resulting image.