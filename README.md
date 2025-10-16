# Code Review Assistant

Code Review Assistant is a lightweight web application that allows you to upload or paste code and receive automated reviews powered by Google's Gemini models. It is built with a Node.js backend, an HTML/Tailwind frontend, and supports both local development and deployment on Render.

  Features

* Review code by pasting it directly or uploading a file.
* Supports multiple programming languages including JavaScript, Python, Java, C++, and TypeScript.
* Provides structured issue reports with severity levels and suggestions.
* Works in both mock mode (BYPASS_LLM=1) and real Gemini API mode.
* Clean and responsive user interface built with Tailwind CSS.

  Tech Stack

* Frontend: HTML, JavaScript, Tailwind CSS
* Backend: Node.js, Express.js
* AI Review: Gemini API (via Google Generative Language API)
* Hosting: Render

  Prerequisites

Before running the project locally, make sure you have the following installed:

* Node.js (version 18 or higher)
* npm (Node package manager)

You also need a valid Gemini API key, which can be obtained from the Google AI Studio.

  Getting Started

#  1. Clone the Repository

```bash
git clone https://github.com/your-username/Code-Review-Assistant.git
cd Code-Review-Assistant
```

#  2. Install Dependencies

```bash
npm install
```

#  3. Set Up Environment Variables

Create a `.env` file in the root directory with the following content:

```
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
MAX_FILE_MB=2
MAX_FILES=20
BYPASS_LLM=0
NODE_ENV=production
```

If you are testing locally and do not want to call the Gemini API, set `BYPASS_LLM=1` to enable mock responses.

#  4. Run the Server Locally

```bash
npm start
```

The server should start on `http://localhost:5000`.

#  5. Open the Frontend

You can open the `frontend/index.html` file directly in your browser, or serve it with a local development server such as Live Server (VS Code extension).

  Deployment on Render

1. Push the project to GitHub.
2. Create a new Web Service on Render.
3. Set the build command to `npm install` and the start command to `node server.js`.
4. Add the environment variables in Render's dashboard under the Environment section.
5. Deploy the service. Your app will be available at your Render URL.

  Troubleshooting

* If the API returns mock responses even with a valid key, check that `BYPASS_LLM=0` in your environment variables on Render.
* If you encounter CORS issues during local development, make sure to configure `CORS_ORIGIN` properly or remove it entirely for testing.
* To debug model resolution issues, visit `/api/review/_models` endpoint to see available models for your API key.
