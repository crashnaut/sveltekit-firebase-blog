<script lang="ts">
  import { user } from '../stores/index.js';
  import { addComment } from '../firebase/index.js';

  export let postId: string;
  export let parentId: string | null = null;
  export let onCommentAdded: () => void = () => {};
  export let onCancel: () => void = () => {};
  export let openAuthModal: (returnUrl: string) => void = () => console.warn('openAuthModal not implemented');
  export let placeholder = 'Write your comment here...';
  export let submitText = 'Submit Comment';
  export let showCancel = false;

  let commentText = '';
  let isSubmitting = false;
  let error = '';

  async function handleSubmit() {
    if (!commentText.trim() || isSubmitting) return;

    if (!$user) {
      openAuthModal(window.location.pathname);
      return;
    }

    isSubmitting = true;
    error = '';

    try {
      await addComment({ 
        postId, 
        content: commentText,
        parentId: parentId || undefined
      });
      
      commentText = '';
      onCommentAdded();
    } catch (err) {
      error = 'Failed to add comment. Please try again later.';
      console.error(err);
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    commentText = '';
    error = '';
    onCancel();
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
  {#if error}
    <div class="p-3 text-sm text-red-700 bg-red-100 rounded-lg">
      {error}
    </div>
  {/if}

  <div>
    <textarea
      bind:value={commentText}
      rows="4"
      class="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
      placeholder={placeholder}
      disabled={isSubmitting}
      required
    ></textarea>
  </div>

  <div class="flex justify-end space-x-2">
    {#if showCancel}
      <button
        type="button"
        on:click={handleCancel}
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        disabled={isSubmitting}
      >
        Cancel
      </button>
    {/if}

    <button
      type="submit"
      disabled={isSubmitting || !commentText.trim()}
      class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSubmitting ? 'Submitting...' : submitText}
    </button>
  </div>
</form>
