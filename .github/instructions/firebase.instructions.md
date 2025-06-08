---
applyTo: "src/lib/firebase/*.ts"
---

# Firebase Function Instructions

## Function Structure
- Export all functions from `src/lib/firebase/index.ts`
- Import Firebase functions from 'firebase/firestore' and 'firebase/auth'
- Import config from `./config.js`: `{ getFirebaseInstances }`
- Import auth from `./auth.js`: `{ getCurrentUser }`

## Error Handling
- Wrap all Firebase operations in try/catch blocks
- Provide meaningful error messages for users
- Log errors with context: `console.error('Error context:', error)`
- Throw errors with user-friendly messages

## Authentication Checks
- Use `getCurrentUser()` for auth-required operations
- Check user permissions before write operations
- Throw authentication errors when user is null

## Data Validation
- Validate required parameters at function start
- Use TypeScript for compile-time type checking
- Validate data structure before Firestore operations
- Sanitize user input data

## Firestore Patterns
- Use collection references: `collection(db, 'posts')`
- Use proper queries with orderBy, where, limit
- Handle pagination with startAfter cursors
- Use transactions for multi-document operations

## Example Firebase Function:
```typescript
export async function createBlogPost(blogPost: Omit<BlogPost, 'id'>): Promise<BlogPost> {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Authentication required');
    }

    const { db } = getFirebaseInstances();
    
    // Validate required fields
    if (!blogPost.title) {
      throw new Error('Title is required');
    }

    // Create post with metadata
    const postWithMetadata = {
      ...blogPost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authorId: currentUser.uid
    };

    const docRef = await addDoc(collection(db, 'posts'), postWithMetadata);
    
    return {
      id: docRef.id,
      ...postWithMetadata
    } as BlogPost;
  } catch (error) {
    console.error('Error creating blog post:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create blog post');
  }
}
```

## Collection Naming
- `posts` - Blog posts
- `comments` - Comments on posts  
- `postLikes` - Post like records
- `commentLikes` - Comment like/dislike records