#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import type { BlogPost } from '../types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface MigrationOptions {
  contentDir?: string;
  dryRun?: boolean;
  verbose?: boolean;
  createBlogPost?: (post: Omit<BlogPost, 'id'>) => Promise<string>;
  updateBlogPost?: (id: string, post: Partial<BlogPost>) => Promise<void>;
  getBlogPost?: (id: string) => Promise<BlogPost | null>;
}

export class BlogMigrator {
  private contentDir: string;
  private options: MigrationOptions;

  constructor(options: MigrationOptions = {}) {
    this.contentDir = options.contentDir || path.join(process.cwd(), 'src/content/blog');
    this.options = options;
  }

  async migrateAllPosts(): Promise<void> {
    if (!fs.existsSync(this.contentDir)) {
      console.log('❌ Content directory does not exist:', this.contentDir);
      console.log('💡 Run the blog manager first to create some posts.');
      return;
    }

    const files = fs.readdirSync(this.contentDir).filter((file) => file.endsWith('.md'));
    
    if (files.length === 0) {
      console.log('📝 No markdown files found to migrate.');
      console.log('💡 Add some .md files to your content directory first.');
      return;
    }

    console.log(`🚀 ${this.options.dryRun ? 'DRY RUN: ' : ''}Migrating ${files.length} blog post(s)...`);
    
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    for (const file of files) {
      try {
        const result = await this.migratePost(file);
        results[result]++;
        
        if (this.options.verbose) {
          console.log(`  ${this.getResultIcon(result)} ${file} - ${result}`);
        }
      } catch (error) {
        results.errors++;
        console.error(`❌ Error migrating ${file}:`, error);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Created: ${results.created}`);
    console.log(`  🔄 Updated: ${results.updated}`);
    console.log(`  ⏭️  Skipped: ${results.skipped}`);
    console.log(`  ❌ Errors: ${results.errors}`);
    
    if (this.options.dryRun) {
      console.log('\n💡 This was a dry run. Use --no-dry-run to actually migrate the posts.');
    }
  }

  private async migratePost(filename: string): Promise<'created' | 'updated' | 'skipped'> {
    const filePath = path.join(this.contentDir, filename);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    // Extract ID from filename (without .md extension)
    const id = path.basename(filename, '.md');
    
    // Validate required fields
    if (!data.title) {
      throw new Error('Missing required field: title');
    }

    // Build blog post object
    const blogPost: Omit<BlogPost, 'id'> = {
      title: data.title,
      content: content,
      excerpt: data.excerpt || '',
      author: data.author || 'Unknown Author',
      date: data.date || new Date().toISOString().split('T')[0],
      imageUrl: data.imageUrl || '/images/default-blog-image.jpg',
      imageHint: data.imageHint || 'Blog post image',
      published: data.published || false,
      tags: Array.isArray(data.tags) ? data.tags : [],
      commentCount: 0,
      likeCount: 0
    };

    if (this.options.dryRun) {
      console.log(`📋 Would migrate: ${filename}`);
      console.log(`   Title: ${blogPost.title}`);
      console.log(`   Published: ${blogPost.published}`);
      return 'created';
    }

    // Check if post already exists
    if (this.options.getBlogPost) {
      const existingPost = await this.options.getBlogPost(id);
      
      if (existingPost) {
        // Update existing post
        if (this.options.updateBlogPost) {
          await this.options.updateBlogPost(id, blogPost);
          return 'updated';
        } else {
          return 'skipped';
        }
      }
    }

    // Create new post
    if (this.options.createBlogPost) {
      await this.options.createBlogPost(blogPost);
      return 'created';
    }

    return 'skipped';
  }

  private getResultIcon(result: string): string {
    switch (result) {
      case 'created': return '✅';
      case 'updated': return '🔄';
      case 'skipped': return '⏭️';
      default: return '❓';
    }
  }

  async validatePosts(): Promise<void> {
    if (!fs.existsSync(this.contentDir)) {
      console.log('❌ Content directory does not exist:', this.contentDir);
      return;
    }

    const files = fs.readdirSync(this.contentDir).filter((file) => file.endsWith('.md'));
    
    console.log(`🔍 Validating ${files.length} blog post(s)...`);
    
    const issues: string[] = [];

    for (const file of files) {
      const filePath = path.join(this.contentDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      try {
        const { data, content } = matter(fileContent);
        
        // Check required fields
        if (!data.title) issues.push(`${file}: Missing title`);
        if (!data.excerpt) issues.push(`${file}: Missing excerpt`);
        if (!data.author) issues.push(`${file}: Missing author`);
        if (!data.date) issues.push(`${file}: Missing date`);
        
        // Check content length
        if (content.trim().length < 100) {
          issues.push(`${file}: Content too short (${content.trim().length} chars)`);
        }
        
        // Check slug format
        const slug = path.basename(file, '.md');
        if (!/^[a-z0-9-]+$/.test(slug)) {
          issues.push(`${file}: Invalid slug format (use lowercase letters, numbers, and hyphens only)`);
        }
        
      } catch (error) {
        issues.push(`${file}: Invalid frontmatter format`);
      }
    }

    if (issues.length === 0) {
      console.log('✅ All blog posts are valid!');
    } else {
      console.log(`❌ Found ${issues.length} issue(s):`);
      issues.forEach(issue => console.log(`  • ${issue}`));
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--no-dry-run');
  const verbose = args.includes('--verbose');
  const validate = args.includes('--validate');

  const migrator = new BlogMigrator({
    dryRun,
    verbose
  });

  if (validate) {
    await migrator.validatePosts();
  } else {
    await migrator.migrateAllPosts();
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
