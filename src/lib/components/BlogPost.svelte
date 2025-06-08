<script lang="ts">
  import type { BlogPost } from '../types/index.js';
  import { marked } from 'marked';

  export let post: BlogPost;
  export let showComments = true;
  export let showLikes = true;

  let formattedContent = '';
  let isContentLoading = true;

  // Process markdown content
  async function processMarkdown(content: string): Promise<string> {
    try {
      const result = await marked.parse(content);
      return result.toString();
    } catch (error) {
      console.error('Error processing markdown:', error);
      return content;
    }
  }

  // Initialize content processing
  async function initContent() {
    if (post) {
      isContentLoading = true;
      formattedContent = await processMarkdown(post.content);
      isContentLoading = false;
    }
  }

  $: if (post) {
    initContent();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

{#if post}
  <article class="max-w-4xl mx-auto">
    <header class="mb-8">
      <h1 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
      
      {#if post.excerpt}
        <p class="mb-4 text-base lg:text-lg text-gray-600">{post.excerpt}</p>
      {/if}
      
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-500">By {post.author}</span>
          <time class="text-sm text-gray-500" datetime={post.date}>
            {formatDate(post.date)}
          </time>
        </div>
        
        {#if showLikes && post.likeCount !== undefined}
          <div class="flex items-center space-x-2 text-sm text-gray-500">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
            </svg>
            <span>{post.likeCount} likes</span>
          </div>
        {/if}
      </div>
    </header>

    {#if post.imageUrl}
      <div class="relative mb-8 aspect-video w-full overflow-hidden rounded-lg">
        <img
          src={post.imageUrl}
          alt={post.imageHint || post.title}
          class="w-full h-full object-cover"
          loading="eager"
        />
      </div>
    {/if}

    <div class="prose prose-lg prose-gray max-w-none mb-8">
      {#if isContentLoading}
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      {:else}
        {@html formattedContent}
      {/if}
    </div>

    {#if post.tags && post.tags.length > 0}
      <div class="mb-8">
        <h3 class="text-sm font-medium text-gray-700 mb-2">Tags:</h3>
        <div class="flex flex-wrap gap-2">
          {#each post.tags as tag}
            <span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {tag}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    {#if showComments}
      <div class="mt-12 border-t pt-8">
        <slot name="comments">
          <!-- Comments component will be inserted here -->
        </slot>
      </div>
    {/if}
  </article>
{/if}
