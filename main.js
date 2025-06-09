import { pipeline } from '@xenova/transformers';

const promptInput = document.getElementById('prompt-input');
const generateBtn = document.getElementById('generate-btn');
const outputBox = document.getElementById('output-box');
const statusDiv = document.getElementById('status');

let generator = null;

async function initializeGenerator() {
    try {
        // The pipeline function will download and cache the model.
        // It can take some time on the first run.
        generator = await pipeline('text-generation', 'Xenova/distilgpt2');
        statusDiv.textContent = 'Model loaded. Ready to generate text!';
        promptInput.disabled = false;
        generateBtn.disabled = false;
        promptInput.placeholder = 'e.g., The quick brown fox...';
    } catch (error) {
        statusDiv.textContent = 'Failed to load model.';
        console.error('Model loading error:', error);
    }
}

async function handleGeneration() {
    if (!generator) {
        outputBox.textContent = 'Generator not initialized.';
        return;
    }

    const prompt = promptInput.value.trim();
    if (!prompt) {
        outputBox.textContent = 'Please enter a prompt.';
        return;
    }

    generateBtn.disabled = true;
    promptInput.disabled = true;
    statusDiv.textContent = 'Generating...';
    outputBox.textContent = '...';

    try {
        const output = await generator(prompt, { max_new_tokens: 50, num_return_sequences: 1 });
        outputBox.textContent = output[0].generated_text;
        statusDiv.textContent = 'Generation complete!';
    } catch (error) {
        outputBox.textContent = 'An error occurred during generation.';
        statusDiv.textContent = 'Generation failed.';
        console.error('Generation error:', error);
    } finally {
        generateBtn.disabled = false;
        promptInput.disabled = false;
    }
}

generateBtn.addEventListener('click', handleGeneration);

// Initialize the generator when the script loads
initializeGenerator();

