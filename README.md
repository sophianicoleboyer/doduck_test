# Doduck Test

This project is a Next.js app with TypeScript that implements a two-panel UI for chat and code.

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/sophianicoleboyer/doduck_test.git
   cd doduck_test
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Set your OpenAI API key in an `.env.local` file:
   ```bash
   OPENAI_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Architecture

- **/pages/api/chat**: API route for handling OpenAI requests.
- **/components**: React components for the chat and code panels.
- **/public**: Static assets.
- **/styles**: Global styles for the application.

## Safety Notes

- Ensure you do not expose your `OPENAI_API_KEY` publicly.
- Implement rate limiting and other security measures in the API route to avoid abuse.

## License

This project is licensed under the MIT License.