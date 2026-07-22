import "dotenv/config";
import { Router } from "express";
const router = Router();

const CHANNELS = {
  chat: {
    label: "Chat2",
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
  const apiKey = process.env.OPENROUTER_API_KEY || "";

  if (!apiKey) {
    return res.json({
      reply: `[${channelConfig.label} channel — demo mode, no API_KEY set]\n\nYou said: "${message}"\n\nAdd your API key to a .env file to get real answers here.`,
    });
  }

  try {
    const messages = [
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message },
    ];
    MESSAGES_DB.push({ role: "user", content: message });

    let result = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-ultra-550b-a55b:free",
        messages: MESSAGES_DB,
        reasoning: { enabled: true },
      }),
    });

    const output = await result.json();
    const response = output.choices[0].message.content;
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
