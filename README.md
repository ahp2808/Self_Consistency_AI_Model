# Self_Consistency_AI_Model

This model is a simple chat based AI model, which evaluates
response from 3 different models on every user prompt and 
selects the best output of the three. 


You can access the deployed project here:
[Self_Consistency_AI](https://self-consistency-ai-model.vercel.app/)

The project uses Gemini, Mistral and OpenRouter AI models for AI API.
To run the project in your system, you can add the keys in your .env file.

## Run these commands after cloning the repo.

```bash
npm install
cp .env.example .env
npm start
```

Then open http://localhost:3000.

Without an API key, `/api/chat` runs in demo mode and echoes back a canned
reply so you can see the UI working end to end. Add `API_KEY` to
`.env` to get real Claude responses per channel.

## Structure

```
/app/server.js            Express server + /api/chat endpoint (per-channel system prompts)
/app/src/public/          Contains html, css, js files for the UI and page content.
/app/api/                 Contains api calls to different models.
```
