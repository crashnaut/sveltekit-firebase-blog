// Firebase configuration and initialization
export { initializeBlogFirebase, getFirebaseInstances } from './config.js';

// Authentication utilities
export { 
  getCurrentUser, 
  initializeAuth, 
  signIn, 
  signOut, 
  isAuthenticated 
} from './auth.js';

// Blog post management
export {
  getBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  likePost,
  unlikePost,
  hasUserLikedPost
} from './blog.js';

// Comments system
export {
  addComment,
  getComments,
  getCommentReplies,
  toggleCommentLike,
  deleteComment,
  hasUserLikedComment,
  hasUserDislikedComment,
  editComment,
  likeComment,
  unlikeComment,
  dislikeComment,
  undislikeComment
} from './comments.js';
