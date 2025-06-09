# Integration Guide for jtosta Project

This guide will help you integrate the `@crashnaut/sveltekit-firebase-blog` library into your jtosta project.

## Installation

Since this is a local library during development, you have two options:

### Option 1: Local Development (Recommended)
```bash
cd /path/to/jtosta
npm install file:../blog-lib
```

### Option 2: Publish and Install
```bash
cd /path/to/blog-lib
npm publish
cd /path/to/jtosta
npm install @crashnaut/sveltekit-firebase-blog
```

## Setup Steps

### 1. Initialize Firebase and Blog System

Create or update your Firebase initialization file:

```typescript
// src/lib/firebase.ts (in jtosta project)
import { initializeBlogFirebase, initializeBlogStores } from '@crashnaut/sveltekit-firebase-blog';

const firebaseConfig = {
  // Your Firebase config
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase for the blog system
initializeBlogFirebase(firebaseConfig);

// Initialize blog stores (this sets up authentication state management)
initializeBlogStores();
```

### 2. Update Your Layout

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../lib/firebase'; // Initialize Firebase
  import '../app.css'; // Your Tailwind CSS
</script>

<main>
  <slot />
</main>
```

### 3. Create Blog Routes

#### Blog List Page
```svelte
<!-- src/routes/blog/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { BlogList, getBlogPosts } from '@crashnaut/sveltekit-firebase-blog';
  import { goto } from '$app/navigation';
  
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

  function handlePostClick(post) {
    goto(`/blog/${post.id}`);
  }

  function handleAuthModal(returnUrl) {
    // Implement your auth modal
    goto('/login?returnUrl=' + encodeURIComponent(returnUrl));
  }
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-4xl font-bold mb-8">Blog</h1>
  <BlogList {posts} {loading} onPostClick={handlePostClick} openAuthModal={handleAuthModal} />
</div>
```

#### Individual Blog Post Page
```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { 
    BlogPost, 
    Comments, 
    LikeButton,
    getBlogPost 
  } from '@crashnaut/sveltekit-firebase-blog';
  
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

  function handleAuthModal(returnUrl) {
    // Implement your auth modal
    goto('/login?returnUrl=' + encodeURIComponent(returnUrl));
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
          <h3 class="text-xl font-semibold">Engage</h3>
          <LikeButton postId={post.id} initialLikeCount={post.likeCount} openAuthModal={handleAuthModal} />
        </div>
        <Comments postId={post.id} openAuthModal={handleAuthModal} />
      </svelte:fragment>
    </BlogPost>
  {:else}
    <div class="text-center py-8">
      <h1 class="text-2xl font-bold text-gray-900">Post not found</h1>
    </div>
  {/if}
</div>
```

### 4. Admin Interface (Optional)

```svelte
<!-- src/routes/admin/+page.svelte -->
<script lang="ts">
  import { AdminPanel } from '@crashnaut/sveltekit-firebase-blog';
  import { goto } from '$app/navigation';

  const adminEmails = ['your-admin@email.com']; // Add your admin emails

  function handleClose() {
    goto('/');
  }
</script>

<div class="min-h-screen bg-gray-100 py-8">
  <AdminPanel {adminEmails} onClose={handleClose} />
</div>
```

### 5. Authentication Integration

If you want to use Google Auth:

```typescript
// src/lib/auth.ts
import { signInWithGoogle, signOut } from '@crashnaut/sveltekit-firebase-blog';

export async function loginWithGoogle() {
  try {
    await signInWithGoogle();
    return true;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
}

export async function logout() {
  try {
    await signOut();
    return true;
  } catch (error) {
    console.error('Logout failed:', error);
    return false;
  }
}
```

### 6. Tailwind Configuration

Ensure your `tailwind.config.js` includes the library:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@crashnaut/sveltekit-firebase-blog/**/*.{js,svelte,ts}'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'), // For prose classes in BlogPost
  ],
}
```

## CLI Tools

### Create Blog Posts
```bash
npx blog-manager
```

### Migrate Existing Posts
```bash
npx migrate-blogs --verbose
npx migrate-blogs --no-dry-run  # Actually migrate
```

## Firebase Setup

### Collections Required
- `posts` - Blog posts
- `comments` - Comments
- `postLikes` - Post likes
- `commentLikes` - Comment likes/dislikes

### Security Rules Example
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    match /postLikes/{likeId} {
      allow read, write: if request.auth != null;
    }
    
    match /commentLikes/{likeId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Next Steps

1. Install the library in your jtosta project
2. Set up Firebase configuration
3. Create the blog routes
4. Configure Tailwind to include the library
5. Set up Firebase security rules
6. Test the integration

The library is now ready for production use with all the essential features:
- ✅ Blog post management
- ✅ Comments system with likes/dislikes
- ✅ Authentication integration
- ✅ Admin interface
- ✅ CLI tools for content management
- ✅ Responsive design
- ✅ TypeScript support