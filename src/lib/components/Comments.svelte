<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '../stores/index.js';
  import { getComments, addComment, deleteComment, editComment, likeComment, unlikeComment, hasUserLikedComment, getCommentReplies, dislikeComment, undislikeComment, hasUserDislikedComment } from '../firebase/index.js';
  import type { Comment } from '../types/index.js';

  export let postId: string;
  export let openAuthModal: (returnUrl: string) => void = () => console.warn('openAuthModal not implemented');
  
  let comments: Comment[] = [];
  let newCommentText = '';
  let isLoading = true;
  let isSubmitting = false;
  let error = '';
  
  // Modal state variables
  let showModal = false;
  let selectedComment: Comment | null = null;
  let editedCommentText = '';
  let isEditing = false;

  // Like states
  let likedComments: Set<string> = new Set();
  let likingComments: Set<string> = new Set();
  
  // Dislike states
  let dislikedComments: Set<string> = new Set();
  let dislikingComments: Set<string> = new Set();

  // Reply states
  let replyingToComment: string | null = null;
  let replyText = '';
  let isSubmittingReply = false;
  let repliesMap: Map<string, Comment[]> = new Map();
  let loadingReplies: Set<string> = new Set();

  onMount(async () => {
    await loadComments();
  });

  async function loadComments() {
    isLoading = true;
    error = '';
    
    try {
      comments = await getComments(postId, false);
      
      if ($user) {
        await loadLikeStates();
      }
    } catch (err) {
      error = 'Failed to load comments. Please try again later.';
      console.error(err);
    } finally {
      isLoading = false;
    }
  }

  async function loadLikeStates() {
    if (!$user) return;
    
    try {
      const likedPromises = comments.map(async (comment) => {
        const [liked, disliked] = await Promise.all([
          hasUserLikedComment(comment.id),
          hasUserDislikedComment(comment.id)
        ]);
        return { commentId: comment.id, liked, disliked };
      });
      
      const results = await Promise.all(likedPromises);
      
      const newLikedComments = new Set<string>();
      const newDislikedComments = new Set<string>();
      
      results.forEach(({ commentId, liked, disliked }) => {
        if (liked) newLikedComments.add(commentId);
        if (disliked) newDislikedComments.add(commentId);
      });
      
      likedComments = newLikedComments;
      dislikedComments = newDislikedComments;
    } catch (err) {
      console.error('Error loading like states:', err);
    }
  }

  async function handleSubmitComment() {
    if (!newCommentText.trim() || isSubmitting) return;
    
    if (!$user) {
      openAuthModal(window.location.pathname);
      return;
    }
    
    isSubmitting = true;
    error = '';
    
    try {
      await addComment({ postId, content: newCommentText });
      newCommentText = '';
      await loadComments();
    } catch (err) {
      error = 'Failed to add comment. Please try again later.';
      console.error(err);
    } finally {
      isSubmitting = false;
    }
  }

  async function handleLikeComment(commentId: string) {
    if (!$user) {
      openAuthModal(window.location.pathname);
      return;
    }

    if (likingComments.has(commentId)) return;

    likingComments.add(commentId);
    const wasLiked = likedComments.has(commentId);

    try {
      if (wasLiked) {
        await unlikeComment(commentId);
        likedComments.delete(commentId);
      } else {
        await likeComment(commentId);
        likedComments.add(commentId);
        // Remove dislike if exists
        if (dislikedComments.has(commentId)) {
          dislikedComments.delete(commentId);
        }
      }
      
      // Update the comments array
      comments = comments.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              likeCount: wasLiked ? (comment.likeCount || 0) - 1 : (comment.likeCount || 0) + 1 
            }
          : comment
      );
    } catch (err) {
      // Revert optimistic update
      if (wasLiked) {
        likedComments.add(commentId);
      } else {
        likedComments.delete(commentId);
      }
      console.error('Error liking comment:', err);
    } finally {
      likingComments.delete(commentId);
    }
  }

  async function handleDislikeComment(commentId: string) {
    if (!$user) {
      openAuthModal(window.location.pathname);
      return;
    }

    if (dislikingComments.has(commentId)) return;

    dislikingComments.add(commentId);
    const wasDisliked = dislikedComments.has(commentId);

    try {
      if (wasDisliked) {
        await undislikeComment(commentId);
        dislikedComments.delete(commentId);
      } else {
        await dislikeComment(commentId);
        dislikedComments.add(commentId);
        // Remove like if exists
        if (likedComments.has(commentId)) {
          likedComments.delete(commentId);
        }
      }
      
      // Update the comments array
      comments = comments.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              dislikeCount: wasDisliked ? (comment.dislikeCount || 0) - 1 : (comment.dislikeCount || 0) + 1 
            }
          : comment
      );
    } catch (err) {
      // Revert optimistic update
      if (wasDisliked) {
        dislikedComments.add(commentId);
      } else {
        dislikedComments.delete(commentId);
      }
      console.error('Error disliking comment:', err);
    } finally {
      dislikingComments.delete(commentId);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<section class="my-8 max-w-3xl mx-auto">
  <h2 class="text-2xl font-bold mb-6">Comments ({comments.length})</h2>
  
  {#if $user}
    <div class="mb-8">
      <form on:submit|preventDefault={handleSubmitComment} class="space-y-4">
        <div>
          <label for="comment" class="block mb-2 text-sm font-medium">Leave your comment</label>
          <textarea
            id="comment"
            bind:value={newCommentText}
            rows="4"
            class="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Write your comment here..."
            disabled={isSubmitting}
          ></textarea>
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !newCommentText.trim()}
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Comment'}
          </button>
        </div>
      </form>
    </div>
  {:else}
    <div class="mb-8 p-4 bg-gray-100 rounded-lg">
      <p class="text-center">
        <button 
          on:click={() => openAuthModal(window.location.pathname)}
          class="text-blue-600 hover:underline focus:outline-none focus:underline"
        >
          Login
        </button> 
        to leave a comment.
      </p>
    </div>
  {/if}

  {#if error}
    <div class="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
      {error}
    </div>
  {/if}

  <div class="space-y-6">
    {#if isLoading}
      <div class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else if comments.length === 0}
      <p class="text-center text-gray-500 py-8">Be the first to comment on this post!</p>
    {:else}
      {#each comments as comment (comment.id)}
        <div class="p-4 border rounded-lg bg-white">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                {comment.userDisplayName?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div>
                <p class="font-medium text-gray-900">{comment.userDisplayName || 'Anonymous'}</p>
                <p class="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>
              </div>
            </div>
          </div>
          
          <p class="text-gray-800 whitespace-pre-line mb-3">{comment.content}</p>
          
          <div class="flex items-center space-x-4">
            <!-- Like button -->
            <button
              on:click={() => handleLikeComment(comment.id)}
              disabled={likingComments.has(comment.id)}
              class="flex items-center space-x-1 text-sm {likedComments.has(comment.id) 
                ? 'text-blue-600' 
                : 'text-gray-500 hover:text-blue-600'
              } disabled:opacity-50"
            >
              <svg class="w-4 h-4" fill={likedComments.has(comment.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7m5 3v10m-5-10l-2-2m2 2v10m0 0l-2-2m2 2l2-2" />
              </svg>
              <span>{comment.likeCount || 0}</span>
            </button>
            
            <!-- Dislike button -->
            <button
              on:click={() => handleDislikeComment(comment.id)}
              disabled={dislikingComments.has(comment.id)}
              class="flex items-center space-x-1 text-sm {dislikedComments.has(comment.id) 
                ? 'text-red-600' 
                : 'text-gray-500 hover:text-red-600'
              } disabled:opacity-50"
            >
              <svg class="w-4 h-4" fill={dislikedComments.has(comment.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 17m-7-3v-10m7 3l2 2m-2-2v10m0 0l2 2m-2-2l-2 2" />
              </svg>
              <span>{comment.dislikeCount || 0}</span>
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</section>
