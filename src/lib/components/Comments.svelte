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
  let tempSavedText = '';
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
  
  // Track which comments actually have replies (for cases where replyCount might be missing)
  let commentsWithReplies: Set<string> = new Set();

  onMount(async () => {
    await loadComments();
    // Check for temporarily saved content in local storage
    const savedContent = localStorage.getItem(`temp_comment_${postId}`);
    if (savedContent) {
      try {
        const parsed = JSON.parse(savedContent);
        if (parsed.commentId && parsed.content) {
          tempSavedText = parsed.content;
        }
      } catch (e) {
        console.error('Failed to parse saved comment content', e);
      }
    }
  });

  async function loadComments() {
    isLoading = true;
    error = '';
    
    try {
      // Load only top-level comments
      comments = await getComments(postId, false);
      
      // Check which comments actually have replies (for missing replyCount cases)
      await checkForActualReplies();
      
      // Load like states for authenticated users
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

  // Check if comments have actual replies even if replyCount is missing/wrong
  async function checkForActualReplies() {
    const commentsWithActualReplies = new Set<string>();
    
    for (const comment of comments) {
      try {
        // Quick check to see if this comment has any replies
        const replies = await getCommentReplies(comment.id);
        if (replies.length > 0) {
          commentsWithActualReplies.add(comment.id);
          
          // Update the comment's replyCount if it's missing or incorrect
          if ((comment.replyCount || 0) !== replies.length) {
            console.log(`Updating replyCount for comment ${comment.id}: ${comment.replyCount || 0} -> ${replies.length}`);
            comments = comments.map(c => 
              c.id === comment.id 
                ? { ...c, replyCount: replies.length }
                : c
            );
          }
        }
      } catch (err) {
        console.error('Error checking replies for comment:', comment.id, err);
      }
    }
    
    commentsWithReplies = commentsWithActualReplies;
  }

  async function loadReplies(commentId: string) {
    console.log('loadReplies called with commentId:', commentId);
    if (loadingReplies.has(commentId)) {
      console.log('Already loading replies for:', commentId);
      return;
    }
    
    loadingReplies = new Set([...loadingReplies, commentId]);
    console.log('Loading replies for comment:', commentId);
    
    try {
      const replies = await getCommentReplies(commentId);
      console.log('Loaded replies:', replies);
      repliesMap = new Map(repliesMap.set(commentId, replies));
      
      // Load like and dislike states for replies if user is authenticated
      if ($user) {
        for (const reply of replies) {
          try {
            const [isLiked, isDisliked] = await Promise.all([
              hasUserLikedComment(reply.id),
              hasUserDislikedComment(reply.id)
            ]);
            
            if (isLiked) {
              likedComments = new Set([...likedComments, reply.id]);
            }
            if (isDisliked) {
              dislikedComments = new Set([...dislikedComments, reply.id]);
            }
          } catch (err) {
            console.error('Error checking like/dislike state for reply:', reply.id, err);
          }
        }
      }
    } catch (err) {
      console.error('Error loading replies:', err);
    } finally {
      loadingReplies = new Set([...loadingReplies].filter(id => id !== commentId));
      console.log('Finished loading replies for:', commentId);
    }
  }

  async function loadLikeStates() {
    if (!$user) return;
    
    console.log('🔍 Loading like/dislike states for user:', $user.uid);
    const likedSet = new Set<string>();
    const dislikedSet = new Set<string>();
    
    for (const comment of comments) {
      try {
        console.log(`🔍 Checking like/dislike state for comment: ${comment.id}`);
        const [isLiked, isDisliked] = await Promise.all([
          hasUserLikedComment(comment.id),
          hasUserDislikedComment(comment.id)
        ]);
        
        console.log(`📊 Comment ${comment.id}: liked=${isLiked}, disliked=${isDisliked}`);
        
        if (isLiked) {
          likedSet.add(comment.id);
        }
        if (isDisliked) {
          dislikedSet.add(comment.id);
        }
      } catch (err) {
        console.error('❌ Error checking like/dislike state for comment:', comment.id, err);
      }
    }
    
    console.log('✅ Final like states:', Array.from(likedSet));
    console.log('✅ Final dislike states:', Array.from(dislikedSet));
    
    likedComments = likedSet;
    dislikedComments = dislikedSet;
  }

  function startReply(commentId: string) {
    console.log('startReply called with commentId:', commentId);
    if (!$user) {
      console.log('No user, opening auth modal');
      openAuthModal(window.location.pathname);
      return;
    }
    console.log('Setting replyingToComment to:', commentId);
    replyingToComment = commentId;
    replyText = '';
    
    // Auto-focus the reply textarea after a short delay to ensure it's rendered
    setTimeout(() => {
      const replyTextarea = document.querySelector(`[data-reply-to="${commentId}"]`) as HTMLTextAreaElement;
      if (replyTextarea) {
        replyTextarea.focus();
        replyTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  function cancelReply() {
    console.log('cancelReply called');
    replyingToComment = null;
    replyText = '';
  }

  async function handleSubmitReply() {
    if (!replyText.trim() || isSubmittingReply || !replyingToComment) return;
    
    isSubmittingReply = true;
    error = '';
    
    try {
      await addComment({ postId, content: replyText, parentId: replyingToComment });
      replyText = '';
      const parentId = replyingToComment;
      replyingToComment = null;
      
      // Reload replies for the parent comment
      await loadReplies(parentId);
      
      // Update reply count in the parent comment
      comments = comments.map(comment => 
        comment.id === parentId 
          ? { ...comment, replyCount: (comment.replyCount || 0) + 1 }
          : comment
      );
    } catch (err) {
      error = 'Failed to add reply. Please try again later.';
      console.error(err);
    } finally {
      isSubmittingReply = false;
    }
  }

  async function handleCommentLike(commentId: string) {
    if (!$user) {
      openAuthModal(window.location.pathname);
      return;
    }

    if (likingComments.has(commentId)) return;

    likingComments = new Set([...likingComments, commentId]);

    try {
      const isLiked = likedComments.has(commentId);
      
      if (isLiked) {
        await unlikeComment(commentId);
        likedComments = new Set([...likedComments].filter(id => id !== commentId));
        
        // Update local comment like count in both main comments and replies
        comments = comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, likeCount: Math.max(0, (comment.likeCount || 0) - 1) }
            : comment
        );
        
        // Also update in replies map
        for (const [parentId, replies] of repliesMap.entries()) {
          const updatedReplies = replies.map(reply => 
            reply.id === commentId 
              ? { ...reply, likeCount: Math.max(0, (reply.likeCount || 0) - 1) }
              : reply
          );
          repliesMap = new Map(repliesMap.set(parentId, updatedReplies));
        }
      } else {
        await likeComment(commentId);
        likedComments = new Set([...likedComments, commentId]);
        
        // Update local comment like count in both main comments and replies
        comments = comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, likeCount: (comment.likeCount || 0) + 1 }
            : comment
        );
        
        // Also update in replies map
        for (const [parentId, replies] of repliesMap.entries()) {
          const updatedReplies = replies.map(reply => 
            reply.id === commentId 
              ? { ...reply, likeCount: (reply.likeCount || 0) + 1 }
              : reply
          );
          repliesMap = new Map(repliesMap.set(parentId, updatedReplies));
        }
      }
    } catch (err) {
      error = 'Failed to update like. Please try again later.';
      console.error(err);
    } finally {
      likingComments = new Set([...likingComments].filter(id => id !== commentId));
    }
  }

  async function handleCommentDislike(commentId: string) {
    console.log('👎 handleCommentDislike called with commentId:', commentId);
    
    if (!$user) {
      console.log('❌ No user authenticated');
      openAuthModal(window.location.pathname);
      return;
    }

    if (dislikingComments.has(commentId)) {
      console.log('⚠️ Already processing dislike for:', commentId);
      return;
    }

    console.log('🔄 Starting dislike process for:', commentId);
    dislikingComments = new Set([...dislikingComments, commentId]);

    try {
      const isDisliked = dislikedComments.has(commentId);
      console.log('📊 Current dislike state for comment:', commentId, 'isDisliked:', isDisliked);
      
      if (isDisliked) {
        console.log('🔄 Removing dislike...');
        await undislikeComment(commentId);
        dislikedComments = new Set([...dislikedComments].filter(id => id !== commentId));
        console.log('✅ Dislike removed, new disliked set:', Array.from(dislikedComments));
        
        // Update local comment dislike count in both main comments and replies
        comments = comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, dislikeCount: Math.max(0, (comment.dislikeCount || 0) - 1) }
            : comment
        );
        
        // Also update in replies map
        for (const [parentId, replies] of repliesMap.entries()) {
          const updatedReplies = replies.map(reply => 
            reply.id === commentId 
              ? { ...reply, dislikeCount: Math.max(0, (reply.dislikeCount || 0) - 1) }
              : reply
          );
          repliesMap = new Map(repliesMap.set(parentId, updatedReplies));
        }
      } else {
        console.log('🔄 Adding dislike...');
        await dislikeComment(commentId);
        dislikedComments = new Set([...dislikedComments, commentId]);
        console.log('✅ Dislike added, new disliked set:', Array.from(dislikedComments));
        
        // Update local comment dislike count in both main comments and replies
        comments = comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, dislikeCount: (comment.dislikeCount || 0) + 1 }
            : comment
        );
        
        // Also update in replies map
        for (const [parentId, replies] of repliesMap.entries()) {
          const updatedReplies = replies.map(reply => 
            reply.id === commentId 
              ? { ...reply, dislikeCount: (reply.dislikeCount || 0) + 1 }
              : reply
          );
          repliesMap = new Map(repliesMap.set(parentId, updatedReplies));
        }
      }
    } catch (err) {
      console.error('❌ Failed to update dislike:', err);
      error = 'Failed to update dislike. Please try again later.';
      console.error(err);
    } finally {
      dislikingComments = new Set([...dislikingComments].filter(id => id !== commentId));
      console.log('🏁 Finished dislike process for:', commentId);
    }
  }

  async function handleSubmitComment() {
    if (!newCommentText.trim() || isSubmitting) return;
    
    isSubmitting = true;
    error = '';
    
    try {
      await addComment({ postId, content: newCommentText });
      newCommentText = '';
      await loadComments(); // Reload comments
    } catch (err) {
      error = 'Failed to add comment. Please try again later.';
      console.error(err);
    } finally {
      isSubmitting = false;
    }
  }
  
  function openCommentModal(comment: Comment) {
    selectedComment = comment;
    // Check if we have temporarily saved content for this comment
    const savedContent = localStorage.getItem(`temp_comment_${postId}`);
    if (savedContent) {
      try {
        const parsed = JSON.parse(savedContent);
        if (parsed.commentId === comment.id) {
          editedCommentText = parsed.content;
        } else {
          editedCommentText = comment.content;
        }
      } catch (e) {
        editedCommentText = comment.content;
      }
    } else {
      editedCommentText = comment.content;
    }
    showModal = true;
    // Start in editing mode immediately
    isEditing = true;
  }
  
  function closeModal() {
    showModal = false;
    selectedComment = null;
    editedCommentText = '';
  }
  
  function startEditing() {
    isEditing = true;
  }

  async function handleEditComment() {
    if (!selectedComment || !editedCommentText.trim() || isSubmitting) return;
    
    isSubmitting = true;
    error = '';
    
    try {
      await editComment(selectedComment.id, editedCommentText);
      // Remove the temporary saved content
      localStorage.removeItem(`temp_comment_${postId}`);
      await loadComments(); // Reload comments
      closeModal();
    } catch (err) {
      error = 'Failed to edit comment. Please try again later.';
      console.error(err);
    } finally {
      isSubmitting = false;
      isEditing = false;
    }
  }
  
  async function handleDeleteComment(commentId: string) {
    try {
      await deleteComment(commentId, postId);
      // Remove the temporary saved content if it exists for this comment
      const savedContent = localStorage.getItem(`temp_comment_${postId}`);
      if (savedContent) {
        try {
          const parsed = JSON.parse(savedContent);
          if (parsed.commentId === commentId) {
            localStorage.removeItem(`temp_comment_${postId}`);
          }
        } catch (e) {
          console.error('Failed to parse saved comment content', e);
        }
      }
      closeModal();
      await loadComments(); // Reload comments
    } catch (err) {
      error = 'Failed to delete comment. Please try again later.';
      console.error(err);
    }
  }
  
  function saveTextTemporarily() {
    if (selectedComment && editedCommentText) {
      localStorage.setItem(`temp_comment_${postId}`, JSON.stringify({
        commentId: selectedComment.id,
        content: editedCommentText,
        timestamp: new Date().toISOString()
      }));
    }
  }
  
  function cancelEditing() {
    if (editedCommentText !== selectedComment?.content) {
      saveTextTemporarily();
    }
    isEditing = false;
    closeModal();
  }

  // Handle beforeunload event to clear temporary content if user navigates away
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (tempSavedText) {
        localStorage.removeItem(`temp_comment_${postId}`);
      }
    });
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
        <div class="p-4 border rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                {comment.userDisplayName?.charAt(0) || 'A'}
              </div>
              <div>
                <p class="font-medium">{comment.userDisplayName || 'Anonymous'}</p>
                <p class="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>
              </div>
            </div>
            {#if $user && $user.uid === comment.userId}
              <button
                on:click={() => openCommentModal(comment)}
                class="text-xs px-2 py-1 rounded-md bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
              >
                Delete
              </button>
            {/if}
          </div>
          <p class="text-sm whitespace-pre-line">{comment.content}</p>
          <div class="flex items-center space-x-2 mt-2">
            <button
              on:click={() => handleCommentLike(comment.id)}
              class="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-blue-600"
              disabled={likingComments.has(comment.id)}
              aria-label={likedComments.has(comment.id) ? 'Unlike' : 'Like'}
            >
              <svg class="w-4 h-4" fill={likedComments.has(comment.id) ? '#ef4444' : 'none'} stroke="#ef4444" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {#if comment.likeCount && comment.likeCount > 0}
                <span class="text-gray-500">
                  {comment.likeCount} {comment.likeCount === 1 ? 'like' : 'likes'}
                </span>
              {/if}
            </button>
            <button
              on:click={() => handleCommentDislike(comment.id)}
              class="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-blue-600"
              disabled={dislikingComments.has(comment.id)}
              aria-label={dislikedComments.has(comment.id) ? 'Remove Dislike' : 'Dislike'}
            >
              <svg class="w-4 h-4" fill={dislikedComments.has(comment.id) ? '#ef4444' : 'none'} stroke="#ef4444" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.5 15h2.25m8.024-9.75c.011.05.013.1.013.15 0 .468-.425.899-.874 1.257l-4.374 3.498c-.251.2-.571.199-.822 0L6.293 6.257C5.844 5.899 5.419 5.468 5.419 5c0-.05.002-.1.013-.15C5.592 3.217 6.685 2.25 8 2.25s2.408.967 2.568 2.6z" />
              </svg>
              {#if comment.dislikeCount && comment.dislikeCount > 0}
                <span class="text-gray-500">
                  {comment.dislikeCount} {comment.dislikeCount === 1 ? 'dislike' : 'dislikes'}
                </span>
              {/if}
            </button>
            <!-- Reply button moved here, next to like/dislike buttons -->
            {#if replyingToComment !== comment.id}
              <button
                on:click={() => startReply(comment.id)}
                class="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:underline"
                aria-label="Reply to comment"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Reply</span>
              </button>
            {/if}
          </div>

          <!-- Replies Section -->
          <div class="mt-4">
            <!-- Reply form (outside the replies area, always visible when replying) -->
            {#if replyingToComment === comment.id}
              <div class="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-blue-200">
                <h4 class="text-sm font-medium text-blue-600 mb-2">Replying to {comment.userDisplayName || 'Anonymous'}</h4>
                <textarea
                  bind:value={replyText}
                  rows="3"
                  class="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Write your reply here..."
                  disabled={isSubmittingReply}
                  data-reply-to={comment.id}
                ></textarea>
                <div class="flex justify-end space-x-2 mt-2">
                  <button
                    on:click={cancelReply}
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    disabled={isSubmittingReply}
                  >
                    Cancel
                  </button>
                  <button
                    on:click={handleSubmitReply}
                    class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    disabled={isSubmittingReply || !replyText.trim()}
                  >
                    {isSubmittingReply ? 'Submitting...' : 'Reply'}
                  </button>
                </div>
              </div>
            {/if}

            <!-- Show replies button if comment has replies (check both replyCount and actual replies) -->
            {#if ((comment.replyCount || 0) > 0 || commentsWithReplies.has(comment.id)) && !repliesMap.has(comment.id)}
              <button
                on:click={() => loadReplies(comment.id)}
                class="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:underline mb-2"
                disabled={loadingReplies.has(comment.id)}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>
                  {loadingReplies.has(comment.id) 
                    ? 'Loading...' 
                    : `View ${comment.replyCount || 1} ${(comment.replyCount || 1) === 1 ? 'reply' : 'replies'}`
                  }
                </span>
              </button>
            {/if}

            <!-- Show replies area if replies have been loaded or are loading -->
            {#if repliesMap.has(comment.id) || loadingReplies.has(comment.id)}
              <div class="ml-4 border-l border-gray-200 pl-4">
                {#if loadingReplies.has(comment.id)}
                  <div class="flex justify-center py-2">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                {:else}
                  <!-- Show loaded replies -->
                  {#each (repliesMap.get(comment.id) || []) as reply (reply.id)}
                    <div class="p-4 border-b last:border-b-0">
                      <div class="flex items-center space-x-2 mb-2">
                        <div class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                          {reply.userDisplayName?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <p class="font-medium">{reply.userDisplayName || 'Anonymous'}</p>
                          <p class="text-xs text-gray-500">{formatDate(reply.createdAt)}</p>
                        </div>
                      </div>
                      <p class="text-sm whitespace-pre-line">{reply.content}</p>
                      <div class="flex items-center space-x-2 mt-2">
                        <button
                          on:click={() => handleCommentLike(reply.id)}
                          class="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-blue-600"
                          disabled={likingComments.has(reply.id)}
                          aria-label={likedComments.has(reply.id) ? 'Unlike' : 'Like'}
                        >
                          <svg class="w-4 h-4" fill={likedComments.has(reply.id) ? '#ef4444' : 'none'} stroke="#ef4444" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {#if reply.likeCount && reply.likeCount > 0}
                            <span class="text-gray-500">
                              {reply.likeCount} {reply.likeCount === 1 ? 'like' : 'likes'}
                            </span>
                          {/if}
                        </button>
                        <button
                          on:click={() => handleCommentDislike(reply.id)}
                          class="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-blue-600"
                          disabled={dislikingComments.has(reply.id)}
                          aria-label={dislikedComments.has(reply.id) ? 'Remove Dislike' : 'Dislike'}
                        >
                          <svg class="w-4 h-4" fill={dislikedComments.has(reply.id) ? '#ef4444' : 'none'} stroke="#ef4444" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.5 15h2.25m8.024-9.75c.011.05.013.1.013.15 0 .468-.425.899-.874 1.257l-4.374 3.498c-.251.2-.571.199-.822 0L6.293 6.257C5.844 5.899 5.419 5.468 5.419 5c0-.05.002-.1.013-.15C5.592 3.217 6.685 2.25 8 2.25s2.408.967 2.568 2.6z" />
                          </svg>
                          {#if reply.dislikeCount && reply.dislikeCount > 0}
                            <span class="text-gray-500">
                              {reply.dislikeCount} {reply.dislikeCount === 1 ? 'dislike' : 'dislikes'}
                            </span>
                          {/if}
                        </button>
                      </div>
                    </div>
                  {:else}
                    <p class="text-sm text-gray-500 py-2">No replies yet.</p>
                  {/each}
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</section>

<!-- Comment Action Modal -->
{#if showModal && selectedComment}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg max-w-md w-full p-6 relative shadow-xl">
      <button 
        on:click={closeModal}
        class="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <h3 class="text-lg font-bold mb-4">Comment Options</h3>
      
      <div class="mb-4">
        <label for="edit-comment" class="block mb-2 text-sm font-medium">Edit comment</label>
        <textarea
          id="edit-comment"
          bind:value={editedCommentText}
          rows="4"
          class="w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        ></textarea>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button
          on:click={() => selectedComment && handleDeleteComment(selectedComment.id)}
          class="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
          disabled={isSubmitting}
        >
          Delete
        </button>
        
        <button
          on:click={closeModal}
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        
        <button
          on:click={handleEditComment}
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          disabled={isSubmitting || !editedCommentText.trim()}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if tempSavedText && selectedComment}
  <div class="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-md shadow-md">
    <p class="text-sm">You have a saved draft for this comment.</p>
    <div class="mt-2 flex space-x-2">
      <button
        on:click={() => {
          if (selectedComment) {
            openCommentModal(selectedComment);
            isEditing = true;
          }
        }}
        class="text-xs px-2 py-1 bg-yellow-500 text-white rounded"
      >
        Continue editing
      </button>
      <button
        on:click={() => {
          localStorage.removeItem(`temp_comment_${postId}`);
          tempSavedText = '';
        }}
        class="text-xs px-2 py-1 bg-gray-200 rounded"
      >
        Discard
      </button>
    </div>
  </div>
{/if}
