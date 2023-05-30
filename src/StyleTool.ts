import axios from "axios";
import { DynamicTool } from "langchain/tools";
import { JSDOM } from "jsdom";


const systemColors = {
    'ActiveBorder': 'rgb(212,208,200)',
    'ActiveCaption': 'rgb(10,36,106)',
    'AppWorkspace': 'rgb(128,128,128)',
    'Background': 'rgb(58,110,165)',
    'ButtonFace': 'rgb(236,233,216)',
    'ButtonHighlight': 'rgb(255,255,255)',
    'ButtonShadow': 'rgb(172,168,153)',
    'ButtonText': 'rgb(0,0,0)',
    'CaptionText': 'rgb(255,255,255)',
    'GrayText': 'rgb(172,168,153)',
    'Highlight': 'rgb(10,36,106)',
    'HighlightText': 'rgb(255,255,255)',
    'InactiveBorder': 'rgb(212,208,200)',
    'InactiveCaption': 'rgb(122,150,223)',
    'InactiveCaptionText': 'rgb(216,228,248)',
    'InfoBackground': 'rgb(255,255,225)',
    'InfoText': 'rgb(0,0,0)',
    'Menu': 'rgb(255,255,255)',
    'MenuText': 'rgb(0,0,0)',
    'Scrollbar': 'rgb(212,208,200)',
    'ThreeDDarkShadow': 'rgb(113,111,100)',
    'ThreeDFace': 'rgb(236,233,216)',
    'ThreeDHighlight': 'rgb(255,255,255)',
    'ThreeDLightShadow': 'rgb(241,239,226)',
    'ThreeDShadow': 'rgb(172,168,153)',
    'Window': 'rgb(255,255,255)',
    'WindowFrame': 'rgb(0,0,0)',
    'WindowText': 'rgb(0,0,0)'
} as Record<string, string>;

interface ParsedInput {
    url: string;
    // selectors: string[];
}

// Helper function to fetch and process styles
const fetchAndProcessStyles = async (input: string): Promise<string> => {
    try {
        const { url } = parseInput(input);

        // Add default selectors
        const selectors = ["button", "input", "a", "p", "span", "img", "h1", "h2", "h3", "h4", "h5", "h6", "textarea", "select", "option", "label", "form", "table", "tr", "td", "th", "ul", "ol", "li", "nav", "header", "footer", "section", "article", "main", "aside", "div"];

        // Fetch the HTML of the webpage
        const response = await axios.get(url);
        const html = response.data;

        // Parse the HTML and extract the CSS styles
        const dom = new JSDOM(html, { url, resources: "usable", runScripts: "outside-only" });
        const document = dom.window.document;


        const loaderPromise = new Promise<string>((resolve, reject) => {
            dom.window.addEventListener('load', function () {
                // All resources are loaded, you can start manipulating the DOM here.
                resolve("Success!");
            });
            // Set a timeout to reject the promise after a certain amount of time to prevent hanging forever in case the 'load' event never fires.
            setTimeout(() => reject('Timeout'), 10000);
        });

        await loaderPromise;


        // Define the properties we're interested in
        const relevantProperties = [
            'color', 'background', 'background-color', 'background-image', 'font-family', 'font-size',
            'margin', 'margin-block', 'margin-inline',
            'padding', 'padding-block', 'padding-inline',
            'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
            'border-radius',
            'border', 'border-width', 'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width',
            'box-shadow',
        ];


        const valueRegexesToIgnore = [
            /url\(data:image/,
            /url\(http/,
        ];

        // Extract the styles from the selectors
        const styleCounts: Record<string, Record<string, Record<string, number>>> = {};


        // Extract the styles from the selectors
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector) as any as Element[];
            for (const element of elements) {
                const computedStyle = dom.window.getComputedStyle(element);
                const elementStyles = Array.from(computedStyle)
                    .filter((key) => relevantProperties.includes(key))  // Only consider the relevant properties
                    .reduce((acc, key) => {
                        const fieldValue = computedStyle.getPropertyValue(key);

                        // ignore if in valueRegexesToIgnore
                        if (valueRegexesToIgnore.some((regex) => regex.test(fieldValue))) {
                            return acc;
                        }
                        acc[key] = fieldValue;
                        //if css variable then look up the value
                        if (acc[key].startsWith("var(")) {
                            const cssVar = acc[key].replace("var(", "").replace(")", "").trim();
                            const varLav = computedStyle.getPropertyValue(cssVar);
                            if (varLav) {
                                acc[key] = varLav;
                            }
                        }


                        return acc;
                    }, {} as Record<string, string>);

                // Add the element's styles to styleCounts
                for (const [property, value] of Object.entries(elementStyles)) {
                    let finalValue = value;
                    if (systemColors[value]) {
                        finalValue = systemColors[value];
                    }
                    if (!styleCounts[selector]) {
                        styleCounts[selector] = {};
                    }
                    if (!styleCounts[selector][property]) {
                        styleCounts[selector][property] = {};
                    }
                    if (!styleCounts[selector][property][finalValue]) {
                        styleCounts[selector][property][finalValue] = 0;
                    }
                    styleCounts[selector][property][finalValue]++;
                }
            }
        }

        const sortedStyles: Record<string, Record<string, [string][]>> = {};

        for (const [selector, properties] of Object.entries(styleCounts)) {
            sortedStyles[selector] = {};
            for (const [property, counts] of Object.entries(properties)) {
                sortedStyles[selector][property] = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([value]) => [value]);
            }
        }

        console.log(JSON.stringify(sortedStyles, null, 2));

        if (Object.keys(sortedStyles).length === 0) {
            return "No styles found for the given selectors.";
        }
        const safeLength = 7000;
        const stylesSafeLength = JSON.stringify(sortedStyles).slice(0, safeLength);
        return stylesSafeLength;
    } catch (error: any) {
        console.error(error);
        return `Error: ${ error.message }`;
    }
};

// Helper function to parse input
const parseInput = (input: string): ParsedInput => {
    input = input.replace(/^"(.*)"$/, '$1');
    return { url: input }
};


// Define the tool
const styleTool = new DynamicTool({
    name: "StyleExtractorTool",
    description: `Return JSON representation of the most common CSS style properties for elements on a webpage and their counts from a given URL.
     Input should be a single valid url. Example: "https://www.google.com"`,
    func: fetchAndProcessStyles,
});

export default styleTool;