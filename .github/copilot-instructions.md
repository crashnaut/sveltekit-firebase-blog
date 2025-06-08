# SvelteKit Firebase Blog Library - Development Guidelines

## Project Overview
This is a reusable SvelteKit library for Firebase-based blog systems with TypeScript, featuring comments, likes, authentication, and admin tools.

## Technology Stack
- **Frontend**: SvelteKit with TypeScript
- **Backend**: Firebase Firestore & Auth
- **Styling**: Tailwind CSS
- **Build**: Vite + svelte-package
- **Package Manager**: npm

## Code Generation Guidelines

### TypeScript Standards
- Use TypeScript for all new code
- Prefer interfaces for data structures: `BlogPost`, `Comment`, etc.
- Use proper typing for Firebase operations
- Export types from `src/lib/types/index.ts`
- Use optional chaining (`?.`) and nullish coalescing (`??`)

### Svelte Component Standards
- Use `<script lang="ts">` for all components
- Follow reactive statement patterns: `$: if (condition) { ... }`
- Use proper prop typing: `export let postId: string;`
- Implement loading states and error handling
- Use Tailwind CSS classes for styling
- Include accessibility attributes (aria-label, etc.)

### Firebase Integration
- All Firebase functions go in `src/lib/firebase/` directory
- Import from `./config.js` for Firebase instances
- Use proper error handling with try/catch blocks
- Include user authentication checks: `getCurrentUser()`
- Export functions from `src/lib/firebase/index.ts`

### Component Architecture
- Keep components focused and reusable
- Use slots for flexible content insertion
- Accept callback props for external actions: `openAuthModal`
- Implement optimistic updates for user interactions
- Handle authentication state properly with `$user` store

### File Organization
- Components: `src/lib/components/`
- Firebase functions: `src/lib/firebase/`
- Types: `src/lib/types/`
- Stores: `src/lib/stores/`
- Utilities: `src/lib/utils/`
- CLI scripts: `src/lib/scripts/`

### Error Handling
- Use try/catch for all async Firebase operations
- Provide user-friendly error messages
- Log errors to console with context
- Implement loading states during operations
- Revert optimistic updates on errors

### Authentication Patterns
- Check `$user` store for authentication state
- Call `openAuthModal(returnUrl)` for unauthenticated actions
- Use `getCurrentUser()` in Firebase functions
- Handle authentication state changes properly

### Library Export Structure
- Main exports from `src/lib/index.ts`
- Component exports with named exports
- Firebase functions grouped by feature
- Separate exports for types, stores, utils

## Naming Conventions
- Components: PascalCase (`BlogPost`, `LikeButton`)
- Functions: camelCase (`getBlogPosts`, `likeComment`)
- Files: kebab-case for components, camelCase for utilities
- Firebase collections: lowercase (`posts`, `comments`, `postLikes`)

## Code Quality
- Use consistent indentation (tabs)
- Add JSDoc comments for public functions
- Include proper TypeScript return types
- Validate required parameters
- Use defensive programming practices