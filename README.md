# This will be a website that has anki cards that I can study

## Main Features

- Create and edit decks and cards via API.
- Practice decks using spaced repetition (logic client-side).
- User authentication (single user, password-based).
- Use AI to convert video links, PDFs, or text prompts into anki cards (future goal).

## Backend

- API implemented using **Vercel Serverless Functions**. Files placed in the `/api` directory at the root are automatically deployed as serverless endpoints.
- Uses Node.js runtime environment on Vercel.

## AI

- **Planned:** Gemini for AI processing (video, text, PDF).
  - <https://ai.google.dev/gemini-api/docs/video-understanding#javascript>

## Styles

- Use **Tailwind CSS** (v4 likely, check `src/index.css`).
- `src/index.css` stores the Tailwind config and base styles.
- Reusable `Button` component in `src/components/Button.tsx`.

## Auth

- **Password based (single user):** Login compares provided password against a master password stored in an environment variable (`MASTER_PASSWORD`).
- **JWT:** Authentication handled via JWTs. The login endpoint (`/api/login`) returns a token upon successful password verification. The secret key is stored in `JWT_SECRET` environment variable.
- Protected API routes require a valid JWT in the `Authorization: Bearer <token>` header.

## Technology

- **Runtime:** Bun.js
- **Frontend:** Vite + React + TypeScript
- **Styling:** Tailwind CSS
- **API:** Vercel Serverless Functions
- **Database:** PostgreSQL + Vercel Postgres SDK (`@vercel/postgres`)
- **Server State Syncing:** Tanstack Query (React Query)
- **Routing (Client):** React Router
- **Local DB:** Docker Compose
- **Environment Vars:** dotenv

## Deployment

- **Vercel** for deployment.
- `/api` routes deployed as serverless functions.
- Frontend built by Vite and served statically.
- AI conversion jobs (if implemented) will run server-side.

## Database

- **Postgres** database.
- **SDK:** The `@vercel/postgres` SDK is used for interacting with the database directly within the API routes.
- **Schema:** Database tables (like `decks`, `cards`) are created and managed manually or via SQL scripts. There is no separate ORM schema definition file.
- **Tables:**
  - `decks`: Stores deck information (id, name, etc.).
  - `cards`: Stores card information (id, deck_id, front_text, back_text, etc.).
  - `review_events`: Logs review attempts (id, card_id, result, timestamp, etc.).

## API Endpoints

All endpoints are prefixed with `/api`.

- `POST /api/login`: Takes `{ password: string }`, returns `{ token: string }` on success.
- **Decks:**
  - `GET /api/decks`: Returns a list of all decks.
  - `POST /api/decks`: Creates a new deck (requires auth). Takes `{ name: string }`.
  - `GET /api/decks/{deckId}`: Returns details for a specific deck.
  - `PUT/PATCH /api/decks/{deckId}`: Updates a specific deck (requires auth).
  - `DELETE /api/decks/{deckId}`: Deletes a specific deck (requires auth).
- **Cards:**
  - `GET /api/decks/{deckId}/cards`: Returns cards for a specific deck.
  - `POST /api/decks/{deckId}/cards`: Creates a new card in a deck (requires auth).
  - `GET /api/cards/{cardId}`: Returns details for a specific card.
  - `PUT/PATCH /api/cards/{cardId}`: Updates a specific card (requires auth).
  - `DELETE /api/cards/{cardId}`: Deletes a specific card (requires auth).
- **Review Events:**
  - `POST /api/reviewEvents`: Logs a review event (requires auth). Takes `{ cardId: string, result: ReviewResult }`.
- **AI:**
  - `POST /api/aiConversion`: Takes video link, PDF, or text prompt; returns generated cards (requires auth).

## Client Pages

- **Login Page (`/login`):** Allows the user to log in.
- **View Decks (Home `/`):** Fetches and displays all decks.
- **Edit Deck (`/deck/:id/edit`):** View/edit cards in a deck.
- **Play Deck (`/deck/:id/play`):**
  - Loads cards for the deck client-side.
  - Manages spaced repetition algorithm locally.
  - Persists `ReviewEvent`s to the server via `/api/reviewEvents`.
  - Assumes decks are reasonably small.

## Development Setup

1. **Environment Variables:**
    - Create a `.env` file in the project root.
    - Add the following variables:
      ```
      DATABASE_URL="postgresql://postgres:<YOUR_POSTGRES_PASSWORD>@localhost:5432/postgres?sslmode=disable"
      JWT_SECRET="<YOUR_RANDOM_JWT_SECRET>"
      MASTER_PASSWORD="<YOUR_CHOSEN_MASTER_PASSWORD>"
      ```
    - Replace `<YOUR_POSTGRES_PASSWORD>` with the password you set (or the default `postgres` if using the provided docker-compose).
    - Replace `<YOUR_RANDOM_JWT_SECRET>` with a long, random, secure string.
    - Replace `<YOUR_CHOSEN_MASTER_PASSWORD>` with the password you want to use for login.
    - **Note:** The `DATABASE_URL` should match the configuration in `docker-compose.yml`.
2. **Database:**
    - Ensure you have Docker installed and running.
    - Start the PostgreSQL container: `docker compose up -d`
    - You may need to manually connect to the database (using a tool like `psql` or a GUI client) and create the necessary tables (`decks`, `cards`, etc.) based on the expected structure.
3. **Install Dependencies:**
    - Run `bun install`
4. **Manual Schema Management:** Since Drizzle is not used, you need to manage database schema changes manually (e.g., using SQL scripts or a database GUI tool connected to the Docker container).
5. **Run Development Server:**
    - Start the Vite dev server (includes frontend and API routes via Vercel CLI): `bun run dev`
    - The application should be available at `http://localhost:5173` (or the port specified by Vite/Vercel).
