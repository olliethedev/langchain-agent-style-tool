import 'dotenv/config';
import { ChatOpenAI } from "langchain/chat_models/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import StyleTool from "./StyleTool";

// Define the URL and input message as constants for better readability
const URL = "https://bearly.ai/";
const ELEMENT_DESCRIPTON = "Hero section with a title, subtitle, and a button"
const inputMessage = `Using the StyleExtractorTool let's write html and css only using vanilla css classes for 
  a page with a single ${ELEMENT_DESCRIPTON} inspired by the style of ${ URL }. Use the tool no more than once. Only return 
  valid css/html code and nothing else. Avoid using css variables like var(--box-shadow). Use Lorem Ipsum for text.`;

async function run() {
    // Initialize the model with desired parameters
    const model = new ChatOpenAI({
        modelName:"gpt-3.5-turbo",
        temperature: 0.4,
        verbose: true,
        maxTokens: 2000,
        timeout: 2 * 60 * 1000
    });

    // Add StyleTool to the tools array
    const tools = [StyleTool];

    // Initialize the executor with the tools and model
    const executor = await initializeAgentExecutorWithOptions(tools, model, {
        agentType: "chat-zero-shot-react-description",
        maxIterations: 6,
    });

    console.log(`Executing agent with input "${ inputMessage }"...`);

    // Call the executor with the input message
    const result = await executor.call({ input: inputMessage });

    console.log(`Got output ${ result.output }`);
}

// Run the async function
run().catch(error => console.error(error));