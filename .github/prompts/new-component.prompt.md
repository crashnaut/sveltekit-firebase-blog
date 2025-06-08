---
mode: 'agent'
tools: ['codebase']
description: 'Create a new Svelte component for the blog library'
---

# Create New Blog Component

Create a new Svelte component following the blog library patterns and conventions.

## Requirements:
- Use TypeScript with proper type definitions
- Follow the established component architecture patterns
- Include proper error handling and loading states
- Implement authentication integration with `$user` store
- Use Tailwind CSS for styling
- Include accessibility attributes
- Follow the naming conventions (PascalCase for components)

## Component Template Structure:
1. Import necessary dependencies (stores, Firebase functions, types)
2. Define exports with proper TypeScript typing
3. Implement state management with reactive statements
4. Add authentication checks where needed
5. Include error handling and loading states
6. Use proper Tailwind CSS classes
7. Add accessibility attributes

## Ask for:
- Component name
- Component purpose/functionality
- Required props and their types
- Any specific Firebase operations needed
- Authentication requirements

## Reference:
- Use existing components in #codebase as examples
- Follow patterns from `LikeButton.svelte`, `Comments.svelte`, etc.
- Ensure consistency with the library's design system