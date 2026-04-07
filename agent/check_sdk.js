import { LMStudioClient } from "@lmstudio/sdk";
const client = new LMStudioClient();
const loaded = await client.llm.listLoaded();
console.log("Loaded models count:", loaded.length);
if (loaded.length > 0) {
  console.log("First model entry:", Object.keys(loaded[0]));
  console.log("Identifier:", loaded[0].identifier);
}
