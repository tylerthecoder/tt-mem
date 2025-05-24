# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev`
- **Build**: `npm run build`
- **Production server**: `npm start`
- **Linting**: `npm run lint`

## Architecture Overview

This is a Next.js 14 application using the App Router with TypeScript, MongoDB, and AI integration for flashcard learning.

### Core Technologies
- **Frontend**: Next.js 14 with App Router, React 19, TailwindCSS 4
- **Backend**: Next.js Server Actions for API logic
- **Database**: MongoDB with connection pooling via `app/lib/db.ts`
- **State Management**: TanStack Query for server state, React Context for auth
- **AI Integration**: OpenAI API for deck/card generation and editing

### Project Structure
- **Pages/Routes**: App Router structure in `app/` directory
- **Server Actions**: Business logic in `app/actions/` (grouped by resource: `decks.ts`, `cards.ts`, `reviewEvents.ts`, etc.)
- **Components**: Reusable UI in `app/components/`
- **Types**: Shared interfaces in `app/types.ts` with MongoDB document mapping
- **Database**: MongoDB client in `app/lib/db.ts` with cached connections
- **Auth**: JWT-based authentication via `app/lib/auth.ts`

### Data Flow
1. **Client State**: React Query hooks in `app/hooks/queryHooks.ts` call Server Actions
2. **Server Actions**: Handle authentication, validate input, interact with MongoDB
3. **Data Mapping**: MongoDB `_id` fields converted to string `id` using `mapMongoId` utility
4. **Types**: Separate Document types (with ObjectId) and client-facing types (with string ids)

### Key Features
- **Spaced Repetition**: Review system with difficulty ratings (easy/medium/hard/missed)
- **AI Deck Generation**: Create decks from topics via `/deck/ai-generate`
- **AI Card Editing**: Suggest card modifications via AI prompts
- **Quiz System**: AI-generated quizzes with scoring

### Authentication
- JWT tokens stored in localStorage via AuthContext
- Server Actions verify tokens using `verifyAuthToken` helper
- Failed auth returns `{ success: false, message: 'Unauthorized' }`

### Environment Variables Required
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB_NAME`: Database name
- `JWT_SECRET`: JWT signing secret
- `OPENAI_API_KEY`: OpenAI API key for AI features