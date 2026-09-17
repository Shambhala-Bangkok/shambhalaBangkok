import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required');

const directory = path.join(process.cwd(), 'content', 'blog');
const filenames = (await fs.readdir(directory)).filter((name) => name.endsWith('.md'));
const posts = await Promise.all(filenames.map(async (filename) => {
  const source = await fs.readFile(path.join(directory, filename), 'utf8');
  const { data, content } = matter(source);
  return {
    slug: filename.replace(/\.md$/, ''),
    title: data.title,
    excerpt: data.excerpt || '',
    content,
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date,
    author: data.author || 'Bangkok Shambhala',
    tags: data.tags || [],
    image: data.image || null,
    published: data.published ?? false,
    section: data.section || null,
  };
}));

const { error } = await createClient(url, key).from('posts').upsert(posts, { onConflict: 'slug' });
if (error) throw error;
console.log(`Migrated ${posts.length} blog posts.`);
