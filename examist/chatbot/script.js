const API_KEY = "sk-proj-Wlmbw0q6TxkF1t1tSrQCT3BlbkFJIELeGcRd0mYrXHh2mzsR";

const SUBJECTS = {
    "Leaving Cert": ["Irish", "English", "Mathematics", "History", "Geography", "French", "German", "Spanish", "Physics", "Chemistry", "Biology", "Agricultural Science", "Economics", "Accounting", "Business"],
    "Junior Cert": ["English", "Irish", "Mathematics", "Science", "History", "Geography", "French", "German", "Spanish", "Business Studies", "Home Economics", "Music", "Art, Craft & Design"]
};

const OFF_TOPIC_RESPONSES = [
    "Let's focus on your Leaving Cert or Junior Cert studies. Which subject would you like to discuss?",
    "I'm here to help with Irish secondary education. What topic from your syllabus shall we explore?",
    "To best assist you, let's concentrate on your coursework. Which subject are you currently studying?",
    "I specialize in Leaving Cert and Junior Cert topics. What area of your curriculum interests you?",
    "For the most relevant help, let's stick to your syllabus. What subject would you like to review?"
];

class ConversationContext {
    constructor() {
        this.messageHistory = [];
        this.currentSubject = null;
    }

    addMessage(role, content) {
        this.messageHistory.push({ role, content });
        if (this.messageHistory.length > 10) {
            this.messageHistory.shift();
        }
    }

    getContext() {
        return this.messageHistory.map(msg => `${msg.role}: ${msg.content}`).join("\n");
    }

    setSubject(subject) {
        this.currentSubject = subject;
    }
}

class ExamistAI {
    constructor() {
        this.context = new ConversationContext();
        this.converter = new showdown.Converter();
        this.initializeElements();
        this.addEventListeners();
        this.sendWelcomeMessage();
    }

    initializeElements() {
        this.chatMessages = document.getElementById("chatMessages");
        this.userInput = document.getElementById("userInput");
        this.sendButton = document.getElementById("sendButton");
        this.voiceButton = document.getElementById("voiceButton");
        this.exitButton = document.getElementById("exitButton");
        this.exitModal = document.getElementById("exitModal");
        this.cancelExit = document.getElementById("cancelExit");
        this.confirmExit = document.getElementById("confirmExit");
        this.subjectSelector = document.getElementById("subjectSelector");
        this.subjectModal = document.getElementById("subjectModal");
        this.subjectList = document.getElementById("subjectList");
        this.closeSubjectModal = document.getElementById("closeSubjectModal");
        this.themeToggle = document.getElementById("themeToggle");
    }

    addEventListeners() {
        this.sendButton.addEventListener("click", () => this.handleUserInput());
        this.userInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.handleUserInput();
        });
        this.exitButton.addEventListener("click", () => this.showExitModal());
        this.cancelExit.addEventListener("click", () => this.hideExitModal());
        this.confirmExit.addEventListener("click", () => this.exitChat());
        this.userInput.addEventListener("input", () => this.toggleSendButton());
        this.subjectSelector.addEventListener("click", () => this.showSubjectModal());
        this.closeSubjectModal.addEventListener("click", () => this.hideSubjectModal());
        this.themeToggle.addEventListener("click", () => this.toggleTheme());
        this.initializeVoiceInput();
        this.initializeSubjectList();
    }

    async handleUserInput() {
        const message = this.userInput.value.trim();
        if (message) {
            this.addMessage(message, true);
            this.userInput.value = "";
            this.toggleSendButton();
            const typingIndicator = this.showTypingIndicator();
            try {
                const botResponse = await this.getBotResponse(message);
                this.addMessage(botResponse);
            } catch (error) {
                console.error('Error getting bot response:', error);
                this.addMessage("I apologize, but I encountered an error. Please try again.");
            } finally {
                typingIndicator.remove();
            }
        }
    }

    async getBotResponse(message) {
        const aiPrompt = `You are ExamistAI, an advanced study assistant for Leaving Certificate and Junior Certificate subjects in the Irish education system. Your goal is to provide accurate, concise responses tailored to the Irish curriculum. Adapt your language to the student's level and use Markdown for formatting when appropriate.

Current subject: ${this.context.currentSubject || "Not specified"}

Previous messages:
${this.context.getContext()}

User message: ${message}

Instructions:
1. If the query is unrelated to Leaving Cert or Junior Cert, respond with one of the off-topic responses, keeping it brief and redirecting to study topics.
2. For simple questions or definitions, provide very concise answers (1-2 sentences max).
3. For complex topics, offer a brief explanation and ask if more detail is needed.
4. Always relate your response to the Irish curriculum when possible.
5. If no subject is set, suggest selecting one before answering subject-specific questions.
6. Use Markdown for formatting when appropriate (e.g., **bold** for important terms, * for lists).
7. For mathematical equations, use LaTeX notation within double dollar signs (e.g., $$E = mc^2$$).
8. Ensure high accuracy, especially for mathematical and scientific content.

Respond directly and concisely to the user's query.`;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "ft:gpt-3.5-turbo-0125:personal:examist:9mJvsrwn",
                    messages: [{ role: "user", content: aiPrompt }],
                    max_tokens: 150,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            let aiResponse = data.choices[0].message.content.trim();

            // Check if the response is off-topic
            if (OFF_TOPIC_RESPONSES.some(response => aiResponse.includes(response))) {
                aiResponse = OFF_TOPIC_RESPONSES[Math.floor(Math.random() * OFF_TOPIC_RESPONSES.length)];
            }

            this.context.addMessage("user", message);
            this.context.addMessage("assistant", aiResponse);

            return aiResponse;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    addMessage(message, isUser = false) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", isUser ? "user-message" : "bot-message", "animate__animated", "animate__fadeInUp");
        
        const content = isUser ? message : this.converter.makeHtml(message);
        messageDiv.innerHTML = `
            <div class="message-header">${isUser ? 'You' : 'ExamistAI'}</div>
            <div class="message-content">${content}</div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        // Announce new messages for screen readers
        this.announceNewMessage(isUser ? "You" : "ExamistAI", message);
    }

    announceNewMessage(sender, message) {
        const announcement = document.createElement("div");
        announcement.setAttribute("aria-live", "polite");
        announcement.classList.add("sr-only");
        announcement.textContent = `New message from ${sender}: ${message}`;
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
    }

    showTypingIndicator() {
        const typingDiv = document.createElement("div");
        typingDiv.classList.add("message", "bot-message", "typing-indicator", "animate__animated", "animate__fadeIn");
        typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        this.chatMessages.appendChild(typingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        return typingDiv;
    }

    initializeVoiceInput() {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-IE';

            this.voiceButton.addEventListener('click', () => {
                recognition.start();
                this.voiceButton.classList.add('listening');
                this.voiceButton.setAttribute('aria-label', 'Listening...');
            });

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.userInput.value = transcript;
                this.voiceButton.classList.remove('listening');
                this.voiceButton.setAttribute('aria-label', 'Voice input');
                this.handleUserInput();
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.voiceButton.classList.remove('listening');
                this.voiceButton.setAttribute('aria-label', 'Voice input');
            };

            recognition.onend = () => {
                this.voiceButton.classList.remove('listening');
                this.voiceButton.setAttribute('aria-label', 'Voice input');
            };
        } else {
            this.voiceButton.style.display = 'none';
        }
    }

    showExitModal() {
        this.exitModal.style.display = "flex";
        this.exitModal.setAttribute('aria-hidden', 'false');
        this.confirmExit.focus();
    }

    hideExitModal() {
        this.exitModal.style.display = "none";
        this.exitModal.setAttribute('aria-hidden', 'true');
    }

    exitChat() {
        window.location.href = "/dashboard";
    }

    toggleSendButton() {
        this.sendButton.disabled = this.userInput.value.trim().length === 0;
    }

    sendWelcomeMessage() {
        this.addMessage("Welcome to ExamistAI! I'm your advanced study assistant for Leaving Cert and Junior Cert subjects in the Irish education system. How can I help you today? Remember to select a subject to get started!");
    }

    showSubjectModal() {
        this.subjectModal.style.display = "flex";
        this.subjectModal.setAttribute('aria-hidden', 'false');
    }

    hideSubjectModal() {
        this.subjectModal.style.display = "none";
        this.subjectModal.setAttribute('aria-hidden', 'true');
    }

    initializeSubjectList() {
        for (const [exam, subjects] of Object.entries(SUBJECTS)) {
            const examDiv = document.createElement("div");
            examDiv.classList.add("exam-group");
            examDiv.innerHTML = `<h3>${exam}</h3>`;
            
            const subjectList = document.createElement("ul");
            subjects.forEach(subject => {
                const li = document.createElement("li");
                li.textContent = subject;
                li.addEventListener("click", () => this.selectSubject(`${exam} - ${subject}`));
                li.setAttribute('tabindex', '0');
                li.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.selectSubject(`${exam} - ${subject}`);
                    }
                });
                subjectList.appendChild(li);
            });
            
            examDiv.appendChild(subjectList);
            this.subjectList.appendChild(examDiv);
        }
    }

    selectSubject(subject) {
        this.context.setSubject(subject);
        this.subjectSelector.textContent = subject;
        this.hideSubjectModal();
        this.addMessage(`Subject changed to ${subject}. How can I assist you with your ${subject} studies?`);
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        this.themeToggle.setAttribute('aria-label', isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
    }
}

const examistAI = new ExamistAI();

// Error handling for API calls
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    examistAI.addMessage("I apologize, but I encountered an error. Please try again later.");
});

// Accessibility improvements
document.querySelectorAll('button, input').forEach(element => {
    if (!element.getAttribute('aria-label')) {
        element.setAttribute('aria-label', element.textContent || element.placeholder);
    }
});

// Load theme preference
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}