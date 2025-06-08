---
applyTo: "src/lib/components/*.svelte"
---

# Svelte Component Instructions

## Component Structure
- Always use TypeScript: `<script lang="ts">`
- Import types from `../types/index.js`
- Import stores from `../stores/index.js`
- Import Firebase functions from `../firebase/index.js`

## Props and Exports
- Use explicit typing: `export let postId: string;`
- Provide default values for optional props
- Include callback props for external actions: `openAuthModal: (returnUrl: string) => void`
- Use descriptive prop names that match the domain

## State Management
- Use reactive statements for derived state: `$: isLiked = likedPosts.has(postId)`
- Implement loading states: `let isLoading = false`
- Handle error states: `let error = ''`
- Use optimistic updates for better UX

## Authentication Integration
- Check `$user` store for authentication state
- Call `openAuthModal(window.location.pathname)` for auth-required actions
- Show appropriate UI based on authentication state

## Styling
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use consistent spacing and color schemes
- Include hover and focus states for interactive elements

## Accessibility
- Include proper ARIA labels and roles
- Use semantic HTML elements
- Ensure keyboard navigation works
- Provide screen reader friendly content

## Example Component Pattern:
```svelte
<script lang="ts">
  import { user } from '../stores/index.js';
  import { someFirebaseFunction } from '../firebase/index.js';
  import type { SomeType } from '../types/index.js';

  export let requiredProp: string;
  export let optionalProp: number = 0;
  export let openAuthModal: (returnUrl: string) => void = () => console.warn('openAuthModal not implemented');

  let isLoading = false;
  let error = '';

  async function handleAction() {
    if (!$user) {
      openAuthModal(window.location.pathname);
      return;
    }
    // Implementation...
  }
</script>
```