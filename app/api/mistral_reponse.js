import "dotenv/config";
import { Mistral } from "@mistralai/mistralai";
import { Router } from "express";
const router = Router();

const CHANNELS = {
  chat: {
    label: "Chat1",
    systemPrompt: `You are one of the three models that give output
    for the user prompt. The outputs of the three models will then be
    evaluated by another AI model and the best will be selected as the 
    final output.
    Thus, give a short but accurate output for the user prompt since
    your output will be part of the final AI model's systemPrompt.`,
  },
};

router.post("/", async (req, res) => {
  const { message, history } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required." });
  }
  const channelConfig = CHANNELS.chat;

  const MESSAGES_DB = [{ role: "system", content: channelConfig.systemPrompt }];
  const apiKey = process.env.MISTRAL_API_KEY || "";

  const client = new Mistral({ apiKey: apiKey });

  if (!apiKey) {
    return res.json({
      reply: `[${channelConfig.label} channel — demo mode, no GEMINI_API_KEY set]\n\nYou said: "${message}"\n\nAdd your API key to a .env file to get real answers here.`,
    });
  }

  try {
    const messages = [
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message },
    ];
    MESSAGES_DB.push({ role: "user", content: message });

    const result = await client.chat.complete({
      model: "ministral-3b-2512",
      messages: MESSAGES_DB,
    });
    const response = result.choices[0].message.content;

    if (!response) {
      console.error("API error");
      return res.status(502).json({ error: "Upstream API error." });
    }

    res.json({ response });
  } catch (err) {
    console.error(err);
    if (err)
      return {
        error: "The AI took too long to respond. Try again after some time.",
      };
  }
});

export default router;
