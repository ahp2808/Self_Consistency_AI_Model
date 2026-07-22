import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI, {
  APIConnectionTimeoutError,
  RateLimitError,
  AuthenticationError,
  PermissionDeniedError,
  BadRequestError,
  NotFoundError,
  UnprocessableEntityError,
  InternalServerError,
  APIConnectionError,
  APIError,
} from "openai";

import gemini_resp from "./api/gemini_response.js";
import mistral_resp from "./api/mistral_reponse.js";
import openr_resp from "./api/open_router_response.js";
import { get } from "http";

const DEFAULT_MODEL = "gemini-3.1-flash-lite";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.json());
app.use(express.static(path.join(__dirname, "src")));

app.use("/api/gemini_resp", gemini_resp);
app.use("/api/mistral_resp", mistral_resp);
app.use("/api/openr_resp", openr_resp);

const CHANNELS = {
  chat: {
    label: "Chat1",
    systemPrompt: `You are one of the AI models used in self consistency 
    technique and will evaluate the output of three models.
    Select the best output and display it as the final output.
    Just mention the output from the model (that is, text after Output number: )
    If the text means that the output is not generated due to an error, skip it.
    The outputs are mentioned below as Output 1, 2 and 3.
      `,
  },
};

app.post("/api/chat", async (req, res) => {
  const { message, history, sysP } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required." });
  }
  const channelConfig = CHANNELS.chat;
  channelConfig.systemPrompt += sysP;
  const MESSAGES_DB = [{ role: "system", content: channelConfig.systemPrompt }];
  const apiKey = process.env.GEMINI_API_KEY || "";
  const client = new OpenAI({
    apiKey: `${apiKey}`,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });

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
    const result = await client.chat.completions.create({
      model: `${DEFAULT_MODEL}`,
      messages: MESSAGES_DB,
    });

    const response = result.choices[0].message.content;
    if (!response) {
      console.error("Gemini API error");
      return res.status(502).json({ error: "Upstream API error." });
    }

    res.json({ response });
  } catch (err) {
    console.error(err);

    if (err instanceof APIConnectionTimeoutError) {
      return res.status(504).json({
        error:
          "The AI took too long to respond. Try a shorter message, or try again in a moment.",
      });
    }

    if (err instanceof RateLimitError) {
      return res.status(429).json({
        error:
          "We're sending requests too fast right now. Wait a few seconds and try again.",
      });
    }

    if (err instanceof AuthenticationError) {
      return res.status(500).json({
        error:
          "Server configuration problem: the AI API key is missing or invalid.",
      });
    }

    if (err instanceof PermissionDeniedError) {
      return res.status(500).json({
        error:
          "Server configuration problem: this API key does not have permission for this request.",
      });
    }

    if (err instanceof BadRequestError) {
      return res.status(400).json({
        error:
          "That message could not be processed — try rephrasing or shortening it.",
      });
    }

    if (err instanceof NotFoundError) {
      return res.status(500).json({
        error:
          "Server configuration problem: the requested AI model was not found.",
      });
    }

    if (err instanceof UnprocessableEntityError) {
      return res.status(422).json({
        error:
          "The request was understood but could not be processed. Try adjusting your message.",
      });
    }

    if (err instanceof InternalServerError) {
      return res.status(502).json({
        error:
          "The AI provider is having an internal issue right now — it's not something you did. Try again shortly.",
      });
    }

    if (err instanceof APIConnectionError) {
      return res.status(502).json({
        error:
          "Could not reach the AI API. Check your network, firewall, or proxy settings.",
      });
    }

    if (err instanceof APIError) {
      return res.status(err.status || 500).json({
        error: `AI API error (${err.status}): ${err.message}`,
      });
    }
    res
      .status(500)
      .json({ error: `${err} Server error contacting the AI API.` });
  }
});

app.listen(PORT, () => {
  console.log(`Chat running at http://localhost:${PORT}`);
});
