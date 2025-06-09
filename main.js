import { pipeline } from '@xenova/transformers';

// Get DOM elements
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const chatHistory = document.getElementById('chat-history');
const statusDiv = document.getElementById('status');
const chatForm = document.getElementById('chat-form');
const modelSelect = document.getElementById('model-select');
const loadModelBtn = document.getElementById('load-model-btn');

let generator = null;
let conversationHistory = [];

// Initialize the text generation pipeline
async function initializeGenerator() {
    const selectedModel = modelSelect.value;
    
    try {
        statusDiv.textContent = `Loading ${selectedModel}... This may take a moment.`;
        loadModelBtn.disabled = true;
        loadModelBtn.textContent = 'Loading...';
        
        generator = await pipeline('text-generation', selectedModel);
        statusDiv.textContent = `Model ${selectedModel} loaded successfully!`;
        loadModelBtn.textContent = 'Load Model';
        loadModelBtn.disabled = false;
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.placeholder = 'Type your message...';
        
        // Clear chat history when loading new model
        chatHistory.innerHTML = '';
        conversationHistory = [];
        
        addMessageToChat("Hello! I'm a friendly AI assistant. How can I help you today?", 'bot');
    } catch (error) {
        statusDiv.textContent = `Failed to load ${selectedModel}. Please try again.`;
        loadModelBtn.textContent = 'Load Model';
        loadModelBtn.disabled = false;
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
        // Construct a more natural conversation prompt
        const recentHistory = conversationHistory.slice(-4).join('\n'); // Keep last 4 exchanges
        const prompt = recentHistory ? 
            `${recentHistory}\nHuman: ${userPrompt}\nAssistant:` : 
            `Human: ${userPrompt}\nAssistant:`;

        // Generate response with optimized parameters for chat
        const output = await generator(prompt, { 
            max_new_tokens: 60,
            num_return_sequences: 1,
            do_sample: true,
            temperature: 0.7,
            top_k: 50,
            top_p: 0.95,
            pad_token_id: 50256,
            eos_token_id: 50256
        });
        
        // Extract the bot's response
        let botResponse = output[0].generated_text.slice(prompt.length).trim();
        
        // Clean up the response - remove any continuation patterns
        const stopPatterns = ["\nHuman:", "\nAssistant:", "Human:", "Assistant:", "\n\n"];
        for (const pattern of stopPatterns) {
            const index = botResponse.indexOf(pattern);
            if (index > -1) {
                botResponse = botResponse.substring(0, index).trim();
                break;
            }
        }
        
        // Handle empty or whitespace-only responses
        if (!botResponse || botResponse.length < 2) {
            botResponse = "I understand. Could you tell me more about what you'd like to discuss?";
        }

        // Update the typing indicator with the actual message
        typingIndicator.textContent = botResponse;
        typingIndicator.classList.remove('typing-indicator');

        // Add bot response to history with better format
        conversationHistory.push(`Human: ${userPrompt}`);
        conversationHistory.push(`Assistant: ${botResponse}`);

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
loadModelBtn.addEventListener('click', initializeGenerator);

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

// Initialize with default model when the script loads
// Remove the auto-initialization - user must click "Load Model"
statusDiv.textContent = 'Select a model and click "Load Model" to start chatting.';