#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import inquirer from 'inquirer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Blog post template
const BLOG_TEMPLATE = `---
title: "Your Blog Post Title"
excerpt: "A brief summary of your blog post (2-3 sentences)"
author: "Author Name"
date: "${new Date().toISOString().split('T')[0]}"
imageUrl: "/images/your-image.jpg"
imageHint: "Brief description of the image for accessibility"
published: false
tags: []
---

Start writing your blog post content here. This is the introduction paragraph.

## First Section Heading

Your content goes here...

## Second Section Heading

More content here...

## Conclusion

Concluding thoughts here...
`;

export interface BlogManagerOptions {
  contentDir?: string;
  templatePath?: string;
}

export class BlogManager {
  private contentDir: string;
  private templatePath: string;

  constructor(options: BlogManagerOptions = {}) {
    this.contentDir = options.contentDir || path.join(process.cwd(), 'src/content/blog');
    this.templatePath = options.templatePath || path.join(process.cwd(), 'blog-template.md');
    
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.contentDir)) {
      fs.mkdirSync(this.contentDir, { recursive: true });
      console.log(`✅ Created content directory: ${this.contentDir}`);
    }

    if (!fs.existsSync(this.templatePath)) {
      fs.writeFileSync(this.templatePath, BLOG_TEMPLATE, 'utf8');
      console.log(`✅ Created blog template at: ${this.templatePath}`);
    }
  }

  async createNewBlogPost(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Enter the blog post title:',
        validate: (input: string) => input.trim() !== '' ? true : 'Title is required'
      },
      {
        type: 'input',
        name: 'slug',
        message: 'Enter the blog post slug (used in URL):',
        default: (answers: any) => this.generateSlug(answers.title),
        validate: (input: string) => /^[a-z0-9-]+$/.test(input) ? true : 'Slug must contain only lowercase letters, numbers, and hyphens'
      },
      {
        type: 'input',
        name: 'excerpt',
        message: 'Enter a brief excerpt (2-3 sentences):',
        validate: (input: string) => input.trim() !== '' ? true : 'Excerpt is required'
      },
      {
        type: 'input',
        name: 'author',
        message: 'Enter the author name:',
        default: 'Author'
      },
      {
        type: 'input',
        name: 'imageUrl',
        message: 'Enter the image URL (optional):',
        default: '/images/default-blog-image.jpg'
      },
      {
        type: 'input',
        name: 'imageHint',
        message: 'Enter image description for accessibility:',
        default: 'Blog post featured image'
      },
      {
        type: 'input',
        name: 'tags',
        message: 'Enter tags (comma-separated, optional):',
        filter: (input: string) => input ? input.split(',').map((tag: string) => tag.trim()).filter(Boolean) : []
      }
    ]);

    const today = new Date().toISOString().split('T')[0];
    
    const frontmatter = {
      title: answers.title,
      excerpt: answers.excerpt,
      author: answers.author,
      date: today,
      imageUrl: answers.imageUrl,
      imageHint: answers.imageHint,
      published: false,
      tags: answers.tags
    };
    
    const template = fs.readFileSync(this.templatePath, 'utf8');
    const { content } = matter(template);
    
    const newPost = matter.stringify(content, frontmatter);
    const outputPath = path.join(this.contentDir, `${answers.slug}.md`);
    
    if (fs.existsSync(outputPath)) {
      const overwrite = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: `File ${answers.slug}.md already exists. Overwrite?`,
        default: false
      }]);
      
      if (!overwrite.overwrite) {
        console.log('❌ Operation cancelled.');
        return;
      }
    }
    
    fs.writeFileSync(outputPath, newPost, 'utf8');
    console.log(`✅ Created new blog post at: ${outputPath}`);
    console.log(`Next steps:`);
    console.log(`1. Edit the content in your favorite markdown editor`);
    console.log(`2. Set published: true when ready to publish`);
    console.log(`3. Run your blog migration script if using a CMS`);
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  listBlogPosts(): void {
    if (!fs.existsSync(this.contentDir)) {
      console.log('❌ Content directory does not exist.');
      return;
    }

    const files = fs.readdirSync(this.contentDir).filter(file => file.endsWith('.md'));
    
    if (files.length === 0) {
      console.log('📝 No blog posts found.');
      return;
    }

    console.log(`📚 Found ${files.length} blog post(s):`);
    
    files.forEach(file => {
      const filePath = path.join(this.contentDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContent);
      
      console.log(`\n📄 ${file}`);
      console.log(`   Title: ${data.title || 'Untitled'}`);
      console.log(`   Author: ${data.author || 'Unknown'}`);
      console.log(`   Date: ${data.date || 'Unknown'}`);
      console.log(`   Published: ${data.published ? '✅' : '❌'}`);
      if (data.tags && data.tags.length > 0) {
        console.log(`   Tags: ${data.tags.join(', ')}`);
      }
    });
  }
}

// CLI interface
async function main() {
  const blogManager = new BlogManager();
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Create a new blog post', value: 'create' },
        { name: 'List existing blog posts', value: 'list' },
        { name: 'Exit', value: 'exit' }
      ]
    }
  ]);
  
  switch (action) {
    case 'create':
      await blogManager.createNewBlogPost();
      break;
    case 'list':
      blogManager.listBlogPosts();
      break;
    case 'exit':
      console.log('👋 Goodbye!');
      break;
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
