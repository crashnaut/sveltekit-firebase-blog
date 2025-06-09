<!-- Admin panel for managing blog posts -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '../stores/index.js';
  import { getBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost } from '../firebase/index.js';
  import type { BlogPost } from '../types/index.js';

  export let adminEmails: string[] = [];
  export let onClose: () => void = () => {};

  let posts: BlogPost[] = [];
  let isLoading = false;
  let error = '';
  let success = '';
  let editingPost: BlogPost | null = null;
  let showCreateForm = false;

  // Check if current user is admin
  $: isAdmin = $user && adminEmails.includes($user.email || '');

  onMount(async () => {
    if (isAdmin) {
      await loadPosts();
    }
  });

  async function loadPosts() {
    isLoading = true;
    error = '';
    try {
      const result = await getBlogPosts();
      posts = result.posts;
    } catch (err) {
      error = 'Failed to load posts';
      console.error(err);
    } finally {
      isLoading = false;
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await deleteBlogPost(postId);
      success = 'Post deleted successfully';
      await loadPosts();
    } catch (err) {
      error = 'Failed to delete post';
      console.error(err);
    }
  }

  async function handleTogglePublished(post: BlogPost) {
    try {
      await updateBlogPost(post.id, { published: !post.published });
      success = `Post ${post.published ? 'unpublished' : 'published'} successfully`;
      await loadPosts();
    } catch (err) {
      error = 'Failed to update post';
      console.error(err);
    }
  }

  function clearMessages() {
    error = '';
    success = '';
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

{#if !isAdmin}
  <div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
    <p>Access denied. You don't have admin privileges.</p>
  </div>
{:else}
  <div class="bg-white rounded-lg shadow-lg max-w-6xl mx-auto">
    <div class="flex items-center justify-between p-6 border-b">
      <h2 class="text-2xl font-bold text-gray-900">Blog Administration</h2>
      <button
        on:click={onClose}
        class="text-gray-400 hover:text-gray-600"
        aria-label="Close admin panel"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="p-6">
      {#if error}
        <div class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button on:click={clearMessages} class="ml-2 underline">Dismiss</button>
        </div>
      {/if}

      {#if success}
        <div class="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
          <button on:click={clearMessages} class="ml-2 underline">Dismiss</button>
        </div>
      {/if}

      <div class="mb-6">
        <button
          on:click={() => showCreateForm = !showCreateForm}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {showCreateForm ? 'Cancel' : 'Create New Post'}
        </button>
      </div>

      {#if showCreateForm}
        <div class="mb-8 p-6 bg-gray-50 rounded-lg">
          <h3 class="text-lg font-semibold mb-4">Create New Post</h3>
          <p class="text-gray-600">
            Use the CLI tools to create new posts: <code class="bg-gray-200 px-2 py-1 rounded">npx blog-manager</code>
          </p>
        </div>
      {/if}

      {#if isLoading}
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each posts as post (post.id)}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{post.title}</div>
                    <div class="text-sm text-gray-500 max-w-xs truncate">{post.excerpt}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{post.author}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(post.date)}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {post.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="flex space-x-4">
                      <span>❤️ {post.likeCount || 0}</span>
                      <span>💬 {post.commentCount || 0}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      on:click={() => handleTogglePublished(post)}
                      class="text-blue-600 hover:text-blue-900"
                    >
                      {post.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      on:click={() => handleDeletePost(post.id)}
                      class="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>

          {#if posts.length === 0}
            <div class="text-center py-8 text-gray-500">
              No blog posts found. Create your first post using the CLI tools.
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}