import { writable, derived } from 'svelte/store';
import type { BlogPost, Comment } from '../types/index.js';
import type { User } from 'firebase/auth';

// Authentication store
export const user = writable<User | null>(null);
export const isAuthenticated = derived(user, ($user) => $user !== null);

// Blog posts store
export const blogPosts = writable<BlogPost[]>([]);
export const currentBlogPost = writable<BlogPost | null>(null);
export const hasMorePosts = writable<boolean>(false);
export const isLoadingPosts = writable<boolean>(false);

// Comments store
export const comments = writable<Comment[]>([]);
export const isLoadingComments = writable<boolean>(false);

// UI state
export const showAdminPanel = writable<boolean>(false);
export const selectedPost = writable<BlogPost | null>(null);

// Error handling
export const error = writable<string | null>(null);
export const success = writable<string | null>(null);

// Reset functions
export function resetBlogState() {
  blogPosts.set([]);
  currentBlogPost.set(null);
  hasMorePosts.set(false);
  isLoadingPosts.set(false);
}

export function resetCommentState() {
  comments.set([]);
  isLoadingComments.set(false);
}

export function clearMessages() {
  error.set(null);
  success.set(null);
}
