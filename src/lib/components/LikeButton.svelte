<script lang="ts">
  import { user } from '../stores/index.js';
  import { likePost, unlikePost, hasUserLikedPost } from '../firebase/index.js';

  export let postId: string;
  export let initialLikeCount = 0;
  export let openAuthModal: (returnUrl: string) => void = () => console.warn('openAuthModal not implemented');

  let likeCount = initialLikeCount;
  let isLiked = false;
  let isLoading = false;

  // Load like state on mount
  $: if ($user && postId) {
    loadLikeState();
  }

  async function loadLikeState() {
    if (!$user) return;
    
    try {
      isLiked = await hasUserLikedPost(postId);
    } catch (error) {
      console.error('Error loading like state:', error);
    }
  }

  async function handleLike() {
    if (!$user) {
      openAuthModal(window.location.pathname);
      return;
    }

    if (isLoading) return;

    isLoading = true;
    const wasLiked = isLiked;

    try {
      if (wasLiked) {
        await unlikePost(postId);
        isLiked = false;
        likeCount = Math.max(0, likeCount - 1);
      } else {
        await likePost(postId);
        isLiked = true;
        likeCount = likeCount + 1;
      }
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert optimistic update
      isLiked = wasLiked;
      likeCount = wasLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
    } finally {
      isLoading = false;
    }
  }
</script>

<button
  on:click={handleLike}
  disabled={isLoading}
  class="flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors duration-200 {isLiked 
    ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
  } disabled:opacity-50 disabled:cursor-not-allowed"
  aria-label={isLiked ? 'Unlike post' : 'Like post'}
>
  <svg 
    class="w-5 h-5 transition-transform duration-200 {isLoading ? 'animate-pulse' : ''}" 
    fill={isLiked ? 'currentColor' : 'none'}
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      stroke-width="2" 
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
  
  <span class="font-medium">
    {likeCount}
  </span>
  
  <span class="text-sm">
    {likeCount === 1 ? 'like' : 'likes'}
  </span>
</button>
