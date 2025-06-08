---
mode: 'agent'
tools: ['codebase']
description: 'Create a new Firebase function for the blog library'
---

# Create New Firebase Function

Create a new Firebase function following the blog library patterns and conventions.

## Requirements:
- Use TypeScript with proper type definitions
- Follow established Firebase operation patterns
- Include comprehensive error handling with try/catch
- Implement authentication checks using `getCurrentUser()`
- Add data validation and sanitization
- Use proper Firestore query patterns
- Export function from `src/lib/firebase/index.ts`

## Function Template Structure:
1. Import necessary Firebase functions and types
2. Import `getFirebaseInstances` from config
3. Import `getCurrentUser` for auth operations
4. Validate parameters and authentication
5. Implement Firestore operations with proper error handling
6. Return properly typed results

## Ask for:
- Function name and purpose
- Input parameters and their types
- Return type
- Required Firestore collections
- Authentication requirements
- Any specific query patterns needed

## Reference:
- Use existing Firebase functions in #codebase as examples
- Follow patterns from `blog.ts`, `comments.ts`, etc.
- Ensure consistent error handling and typing
- Use established collection naming conventions