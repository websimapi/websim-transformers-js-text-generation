import { pipeline } from '@xenova/transformers';

// Get DOM elements
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const chatHistory = document.getElementById('chat-history');
const statusDiv = document.getElementById('status');
const chatForm = document.getElementById('chat-form');

let generator = null;
let conversationHistory = [];

// Initialize the text generation pipeline
async function initializeGenerator() {
    try {
        generator = await pipeline('text-generation', 'Xenova/distilgpt2');
        statusDiv.textContent = 'Model loaded. You can now chat with the AI!';
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.placeholder = 'Type your message...';
        addMessageToChat("Hello! I'm a friendly AI. What would you like to talk about?", 'bot');
    } catch (error) {
        statusDiv.textContent = 'Failed to load model.';
        console.error('Model loading error:', error);
    }
}

// Function to add a message to the chat UI
function addMessageToChat(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = text;
    chatHistory.appendChild(messageElement);
    // Scroll to the bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Function to handle sending a message
async function handleSendMessage(e) {
    e.preventDefault(); // Prevent form from submitting and reloading the page

    if (!generator) {
        addMessageToChat('The AI is not ready yet. Please wait.', 'bot');
        return;
    }

    const userPrompt = messageInput.value.trim();
    if (!userPrompt) {
        return;
    }

    // Add user message to UI and history
    addMessageToChat(userPrompt, 'user');
    conversationHistory.push(`User: ${userPrompt}`);
    messageInput.value = '';
    messageInput.style.height = 'auto'; // Reset height for auto-growing effect

    // Disable input while bot is replying
    sendBtn.disabled = true;
    messageInput.disabled = true;

    // Add typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('message', 'bot-message', 'typing-indicator');
    typingIndicator.textContent = '...';
    chatHistory.appendChild(typingIndicator);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        // Construct the conversation prompt for DialoGPT
        const conversationText = conversationHistory.slice(-6).join(' '); // Keep last 6 exchanges
        const prompt = conversationText ? `${conversationText} User: ${userPrompt} AI:` : `User: ${userPrompt} AI:`;

        // Generate response
        const output = await generator(prompt, { 
            max_new_tokens: 50,
            num_return_sequences: 1,
            do_sample: true,
            temperature: 0.8,
            top_k: 40,
            top_p: 0.9,
            pad_token_id: 50256
        });
        
        // Extract the bot's response
        let botResponse = output[0].generated_text.slice(prompt.length).trim();
        
        // Clean up the response - remove any continuation patterns
        const stopPatterns = ["\nUser:", "\nAI:", "User:", "AI:"];
        for (const pattern of stopPatterns) {
            const index = botResponse.indexOf(pattern);
            if (index > -1) {
                botResponse = botResponse.substring(0, index).trim();
                break;
            }
        }
        
        // Handle empty or whitespace-only responses
        if (!botResponse) {
            botResponse = "I'm sorry, could you rephrase that? I want to make sure I understand you correctly.";
        }

        // Update the typing indicator with the actual message
        typingIndicator.textContent = botResponse;
        typingIndicator.classList.remove('typing-indicator');

        // Add bot response to history
        conversationHistory.push(`AI: ${botResponse}`);

    } catch (error) {
        typingIndicator.textContent = 'Sorry, an error occurred while generating a response.';
        typingIndicator.classList.remove('typing-indicator');
        console.error('Generation error:', error);
    } finally {
        // Re-enable input
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

// Event Listeners
chatForm.addEventListener('submit', handleSendMessage);

// Auto-grow textarea
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    // Use scrollHeight to set the new height, respecting max-height from CSS
    messageInput.style.height = `${messageInput.scrollHeight}px`;
});

// Send message on Enter, but allow Shift+Enter for new line
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.requestSubmit();
    }
});

// Initialize the generator when the script loads
initializeGenerator();