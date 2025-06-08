---
mode: 'agent'
tools: ['codebase', 'file_search']
description: 'Add a new feature to the blog library with full integration'
---

# Add New Blog Feature

Add a comprehensive new feature to the SvelteKit Firebase blog library with proper integration across all layers.

## Feature Development Checklist:

### 1. Data Model & Types
- Define TypeScript interfaces in `src/lib/types/index.ts`
- Add Firestore collection schema
- Update existing types if needed

### 2. Firebase Functions
- Create Firebase functions in appropriate file (blog.ts, comments.ts, or new file)
- Implement CRUD operations with proper error handling
- Add authentication checks where required
- Export functions from `src/lib/firebase/index.ts`

### 3. Svelte Components
- Create or update components in `src/lib/components/`
- Implement proper state management and reactive patterns
- Add loading states and error handling
- Include authentication integration
- Use Tailwind CSS for styling
- Add accessibility attributes

### 4. Integration
- Update main library exports in `src/lib/index.ts`
- Add to component index if creating new components
- Update README.md with usage examples
- Consider CLI tool integration if applicable

## Ask for:
- Feature name and description
- Data requirements (what needs to be stored)
- User interactions needed
- Authentication requirements
- UI/UX specifications

## Reference:
- Follow patterns from existing features like comments, likes, etc.
- Use #codebase to understand current architecture
- Maintain consistency with established conventions