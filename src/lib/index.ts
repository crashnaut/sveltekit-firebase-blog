// Main library exports
export * from './types/index.js';
export * from './stores/index.js';

// Re-export Firebase functions with specific names to avoid conflicts
export {
  getBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  likePost,
  unlikePost,
  hasUserLikedPost,
  getComments,
  addComment,
  deleteComment,
  likeComment,
  dislikeComment,
  hasUserLikedComment,
  hasUserDislikedComment,
  getCurrentUser,
  signIn,
  signOut,
  isAuthenticated as checkAuthenticated,
  initializeBlogFirebase,
  initializeAuth
} from './firebase/index.js';

// Re-export components
export { default as BlogPost } from './components/BlogPost.svelte';
export { default as BlogList } from './components/BlogList.svelte';
export { default as Comments } from './components/Comments.svelte';
export { default as CommentForm } from './components/CommentForm.svelte';
export { default as LikeButton } from './components/LikeButton.svelte';

// Re-export utilities
export * from './utils/index.js';
