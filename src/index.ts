import 'dotenv/config';
import { ChatOpenAI } from "langchain/chat_models/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import StyleTool from "./StyleTool";

// Define the URL and input message as constants for better readability
const URL = "https://www.answera.ai/";

const ELEMENT_DESCRIPTION = "Hero section with an image, title, subtitle, and a button"

const inputMessage = `With the aid of the StyleExtractorTool, our task is to construct an HTML page featuring a ${ELEMENT_DESCRIPTION}. The style of this element should be inspired by the aesthetics of ${URL}. We will restrict the use of the tool to only one instance. Your output should exclusively consist of valid HTML and CSS code, and any other information or output should be omitted. Please refrain from utilizing CSS variables such as var(--box-shadow). For text content, Lorem Ipsum should be used. For image URLs, please use the following placeholder: http://via.placeholder.com/640x360. It's crucial to ensure a high contrast between the background and foreground to maintain legibility.
`;

async function run() {
    // Initialize the model with desired parameters
    const model = new ChatOpenAI({
        modelName:"gpt-3.5-turbo",
        temperature: 0.4,
        verbose: true,
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