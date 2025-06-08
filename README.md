# SvelteKit Firebase Blog Library

A comprehensive, reusable SvelteKit blog system with Firebase backend, featuring comments, likes, authentication, and admin tools.

## Features

- 🔥 **Firebase Integration**: Complete Firestore backend with authentication
- 📝 **Blog Management**: Create, edit, delete blog posts with markdown support
- 💬 **Comments System**: Threaded comments with like/dislike functionality
- ❤️ **Like System**: Post and comment likes with real-time updates
- 🔐 **Authentication**: Firebase Auth integration
- 🎨 **Responsive Design**: Mobile-first Tailwind CSS components
- 📦 **TypeScript**: Full type safety throughout
- 🛠️ **CLI Tools**: Blog management and migration utilities

## Installation

```bash
npm install @crashnaut/sveltekit-firebase-blog firebase
```

## Quick Setup

### 1. Initialize Firebase in your SvelteKit app

```typescript
// src/lib/firebase.ts
import { initializeBlogFirebase } from '@crashnaut/sveltekit-firebase-blog/firebase';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize the blog library with your Firebase config
initializeBlogFirebase(firebaseConfig);
```

### 2. Use in your routes

```svelte
<!-- src/routes/blog/+page.svelte -->
<script lang="ts">
  import { BlogList } from '@crashnaut/sveltekit-firebase-blog';
  import { getBlogPosts } from '@crashnaut/sveltekit-firebase-blog/firebase';
  import { onMount } from 'svelte';
  
  let posts = [];
  let loading = true;

  onMount(async () => {
    try {
      const result = await getBlogPosts();
      posts = result.posts;
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      loading = false;
    }
  });

  function handleAuthModal(returnUrl: string) {
    // Implement your auth modal logic
    console.log('Open auth modal, return to:', returnUrl);
  }
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-4xl font-bold mb-8">Blog</h1>
  
  {#if loading}
    <div class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  {:else}
    <BlogList {posts} {handleAuthModal} />
  {/if}
</div>
```

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { BlogPost, Comments, LikeButton } from '@crashnaut/sveltekit-firebase-blog';
  import { getBlogPost } from '@crashnaut/sveltekit-firebase-blog/firebase';
  import { onMount } from 'svelte';
  
  let post = null;
  let loading = true;

  onMount(async () => {
    try {
      const slug = $page.params.slug;
      post = await getBlogPost(slug);
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      loading = false;
    }
  });

  function handleAuthModal(returnUrl: string) {
    // Implement your auth modal logic
  }
</script>

<div class="container mx-auto px-4 py-8">
  {#if loading}
    <div class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  {:else if post}
    <BlogPost {post}>
      <svelte:fragment slot="comments">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-semibold">Comments</h3>
          <LikeButton postId={post.id} initialLikeCount={post.likeCount} {handleAuthModal} />
        </div>
        <Comments postId={post.id} {handleAuthModal} />
      </svelte:fragment>
    </BlogPost>
  {:else}
    <div class="text-center py-8">
      <h1 class="text-2xl font-bold text-gray-900">Post not found</h1>
      <p class="text-gray-600 mt-2">The blog post you're looking for doesn't exist.</p>
    </div>
  {/if}
</div>
```

### 3. Set up authentication state (optional)

```typescript
// src/lib/stores/auth.ts
import { user } from '@crashnaut/sveltekit-firebase-blog/stores';
import { initializeAuth } from '@crashnaut/sveltekit-firebase-blog/firebase';

// Initialize auth state management
initializeAuth();

// Export the user store to use in your app
export { user };
```

## Firebase Setup

### 1. Create Firestore Collections

Your Firebase project needs these collections:

- `posts` - Blog posts
- `comments` - Comments on posts
- `postLikes` - Post likes
- `commentLikes` - Comment likes/dislikes

### 2. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Blog posts - public read, authenticated write
    match /posts/{postId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Comments - public read, authenticated write
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (request.auth.uid == resource.data.userId);
    }
    
    // Post likes - authenticated users only
    match /postLikes/{likeId} {
      allow read, write: if request.auth != null;
    }
    
    // Comment likes - authenticated users only
    match /commentLikes/{likeId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## API Reference

### Firebase Functions

```typescript
// Blog management
import { 
  getBlogPosts, 
  getBlogPost, 
  createBlogPost, 
  updateBlogPost, 
  deleteBlogPost,
  likePost,
  unlikePost,
  hasUserLikedPost
} from '@crashnaut/sveltekit-firebase-blog/firebase';

// Comments
import { 
  getComments, 
  addComment, 
  deleteComment,
  likeComment,
  dislikeComment,
  hasUserLikedComment,
  hasUserDislikedComment
} from '@crashnaut/sveltekit-firebase-blog/firebase';

// Auth
import { 
  getCurrentUser, 
  signIn, 
  signOut, 
  isAuthenticated 
} from '@crashnaut/sveltekit-firebase-blog/firebase';
```

### Components

```typescript
// Main components
import { 
  BlogList,     // Display list of blog posts
  BlogPost,     // Display single blog post
  Comments,     // Comments section
  LikeButton    // Like/unlike button
} from '@crashnaut/sveltekit-firebase-blog';
```

### Types

```typescript
import type { 
  BlogPost, 
  Comment, 
  NewComment,
  BlogPostsResult 
} from '@crashnaut/sveltekit-firebase-blog/types';
```

## CLI Tools

### Blog Manager

Create and manage blog posts from the command line:

```bash
npx blog-manager
```

Features:
- Create new blog posts
- Interactive prompts for metadata
- Markdown content editing
- Preview functionality

### Migration Tool

Migrate existing markdown files to Firebase:

```bash
npx migrate-blogs --verbose
npx migrate-blogs --no-dry-run  # Actually migrate
npx migrate-blogs --validate    # Validate posts only
```

## Styling

The library uses Tailwind CSS classes. Make sure your project has Tailwind configured:

```javascript
// tailwind.config.js
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@crashnaut/sveltekit-firebase-blog/**/*.{js,svelte,ts}'
  ],
  // ... your other config
}
```

## Advanced Usage

### Custom Authentication Modal

```svelte
<script lang="ts">
  import { Modal } from 'your-ui-library';
  import { signIn } from '@crashnaut/sveltekit-firebase-blog/firebase';
  
  let showAuthModal = false;
  let returnUrl = '';

  function handleAuthModal(url: string) {
    returnUrl = url;
    showAuthModal = true;
  }
  
  async function handleSignIn() {
    try {
      await signIn();
      showAuthModal = false;
      // Optionally redirect to returnUrl
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  }
</script>

<BlogList posts={posts} openAuthModal={handleAuthModal} />

<Modal bind:open={showAuthModal}>
  <h2>Sign In Required</h2>
  <p>Please sign in to interact with posts.</p>
  <button on:click={handleSignIn}>Sign In with Google</button>
</Modal>
```

### Admin Interface

```svelte
<script lang="ts">
  import { user } from '@crashnaut/sveltekit-firebase-blog/stores';
  import { createBlogPost, updateBlogPost, deleteBlogPost } from '@crashnaut/sveltekit-firebase-blog/firebase';
  
  // Only show admin interface to authenticated users
  $: isAdmin = $user && $user.email === 'admin@yourdomain.com';
</script>

{#if isAdmin}
  <div class="admin-panel">
    <!-- Your admin interface here -->
  </div>
{/if}
```

## Development

To contribute to this library:

```bash
git clone https://github.com/crashnaut/sveltekit-firebase-blog
cd sveltekit-firebase-blog
npm install
npm run dev
```

## License

MIT © Crashnaut
