import * as webllm from "https://esm.run/@mlc-ai/web-llm";
/*************** Game logic ***************/
const prompt = "Give me any short 4 sentences. EVERY sentence format has to look like this: 1.<sentence> \"\n\"";

function getSentencesFromModelResponse(response) {
  const sentences = response.split("\n").map((sentence) => sentence.trim());
  
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].length < 2 || !/^\d+\./.test(sentences[i])) {
      sentences.splice(i, 1);
      i--;
    }
  }

  for (let i = 0; i < sentences.length; i++) {
    sentences[i] = sentences[i].replace(/^\d+\.\s*/, "");
  }

  console.log(sentences);
  return sentences;
}

/*************** WebLLM logic ***************/
const messages = [
  {
    content: "You are a helpful AI agent helping users.",
    role: "system",
  },
  {
    content: prompt,
    role: "user",
  }
];

const availableModels = webllm.prebuiltAppConfig.model_list.map(
  (m) => m.model_id,
);
let selectedModel = "Llama-3.1-8B-Instruct-q4f32_1-1k";

// Callback function for initializing progress
function updateEngineInitProgressCallback(report) {
  console.log("initialize", report.progress);
  document.getElementById("download-status").textContent = report.text;
}

// Create engine instance
const engine = new webllm.MLCEngine();
engine.setInitProgressCallback(updateEngineInitProgressCallback);

async function initializeWebLLMEngine() {
  selectedModel = availableModels[44];
  const config = {
    temperature: 1.0,
    top_p: 1,
  };
  await engine.reload(selectedModel, config);
}

async function streamingGenerating(messages, onUpdate, onFinish, onError) {
  try {
    let curMessage = "";
    let usage;
    const completion = await engine.chat.completions.create({
      stream: true,
      messages,
      stream_options: { include_usage: true },
    });
    for await (const chunk of completion) {
      const curDelta = chunk.choices[0]?.delta.content;
      if (curDelta) {
        curMessage += curDelta;
      }
      if (chunk.usage) {
        usage = chunk.usage;
      }
      if (onUpdate) {
        onUpdate(curMessage);
      }
    }
    const finalMessage = await engine.getMessage();
    onFinish(finalMessage, usage);
  } catch (err) {
    onError(err);
  }
}

/*************** UI logic ***************/
function onMessageSend() {
  document.getElementById("send").disabled = true;

  document.getElementById("user-input").value = "";
  document
    .getElementById("user-input")
    .setAttribute("placeholder", "Generating...");

  const onFinishGenerating = (finalMessage, usage) => {
    document.getElementById("send").disabled = false;
    const sentences = getSentencesFromModelResponse(finalMessage);
    // we got the sentences, now we make random 1 or 2 words as _ _ _ (underscore count is by their alphabet count)
    const words = sentences.map((sentence) => {
      const words = sentence.split(" ");
      const randomIndex = Math.floor(Math.random() * words.length);
      const word = words[randomIndex];
      const underscores = "_ ".repeat(word.length);
      words[randomIndex] = underscores;
      return words.join(" ");
    });
    console.log(words);
    // map all the strings into a single string and give it to user-input
    document.getElementById("user-input").value = words.join("\n");
  };

  streamingGenerating(
    messages,
    null,
    onFinishGenerating,
    console.error,
  );
}

/*************** UI binding ***************/
initializeWebLLMEngine().then(() => {
  document.getElementById("send").disabled = false;
});
document.getElementById("send").addEventListener("click", function () {
  onMessageSend();
});
