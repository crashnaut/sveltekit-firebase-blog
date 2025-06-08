<script lang="ts">
  import type { BlogPost } from '../types/index.js';

  export let posts: BlogPost[] = [];
  export let isLoading = false;
  export let onPostClick: (post: BlogPost) => void = () => {};
  export let showExcerpt = true;
  export let showStats = true;

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function handlePostClick(post: BlogPost) {
    onPostClick(post);
  }
</script>

<div class="space-y-6">
  {#if isLoading}
    <div class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  {:else if posts.length === 0}
    <div class="text-center py-12">
      <p class="text-gray-500 text-lg">No blog posts found.</p>
    </div>
  {:else}
    {#each posts as post (post.id)}
      <article class="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
        <!-- Image -->
        {#if post.imageUrl}
          <div class="aspect-video w-full overflow-hidden">
            <img 
              src={post.imageUrl} 
              alt={post.imageHint || post.title}
              class="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          </div>
        {/if}

        <div class="p-6">
          <!-- Title -->
          <h2 class="text-xl font-bold text-gray-900 mb-2">
            <button
              on:click={() => handlePostClick(post)}
              class="hover:text-blue-600 transition-colors duration-200 text-left"
            >
              {post.title}
            </button>
          </h2>

          <!-- Excerpt -->
          {#if showExcerpt && post.excerpt}
            <p class="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
          {/if}

          <!-- Metadata -->
          <div class="flex items-center justify-between text-sm text-gray-500">
            <div class="flex items-center space-x-4">
              <span>By {post.author}</span>
              <time datetime={post.date}>
                {formatDate(post.date)}
              </time>
            </div>

            {#if showStats}
              <div class="flex items-center space-x-4">
                {#if post.likeCount !== undefined}
                  <span class="flex items-center space-x-1">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
                    </svg>
                    <span>{post.likeCount}</span>
                  </span>
                {/if}
                {#if post.commentCount !== undefined}
                  <span class="flex items-center space-x-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{post.commentCount}</span>
                  </span>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Tags -->
          {#if post.tags && post.tags.length > 0}
            <div class="mt-4 flex flex-wrap gap-2">
              {#each post.tags as tag}
                <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {tag}
                </span>
              {/each}
            </div>
          {/if}
        </div>
      </article>
    {/each}
  {/if}
</div>

<style>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
