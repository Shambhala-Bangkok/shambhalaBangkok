import 'server-only';

import { createAdminClient } from './supabase/admin';
import { markdownToHtml } from './markdown';
import type { BlogPost, BlogSection } from './types';

export type StoredBlogPost = BlogPost & { id: string };
export type PostInput = Omit<StoredBlogPost, 'id'>;

function mapPost(post: StoredBlogPost): StoredBlogPost {
  return { ...post, content: markdownToHtml(post.content || '') };
}

export async function getAllPosts(): Promise<StoredBlogPost[]> {
  const { data, error } = await createAdminClient().from('posts').select('*').order('date', { ascending: false });
  if (error) throw new Error(`Failed to get posts: ${error.message}`);
  return (data ?? []).map(mapPost);
}

async function getPublishedPosts(): Promise<StoredBlogPost[]> {
  const { data, error } = await createAdminClient().from('posts').select('*').eq('published', true).order('date', { ascending: false });
  if (error) throw new Error(`Failed to get published posts: ${error.message}`);
  return (data ?? []).map(mapPost);
}

export async function getPostsBySection(section: BlogSection) {
  return (await getPublishedPosts()).filter((post) => post.section === section);
}

export async function getBlogPosts() {
  return (await getPublishedPosts()).filter((post) => !post.section);
}

export async function getPostBySlug(slug: string): Promise<StoredBlogPost | null> {
  const { data, error } = await createAdminClient().from('posts').select('*').eq('slug', slug).eq('published', true).maybeSingle();
  if (error) throw new Error(`Failed to get post: ${error.message}`);
  return data ? mapPost(data) : null;
}

export async function getPostBySlugAdmin(slug: string): Promise<StoredBlogPost | null> {
  const { data, error } = await createAdminClient().from('posts').select('*').eq('slug', slug).maybeSingle();
  if (error) throw new Error(`Failed to get post: ${error.message}`);
  return data ? (data as StoredBlogPost) : null;
}

export async function getRecentPosts(limit = 3) {
  return (await getBlogPosts()).slice(0, limit);
}

export async function createPost(input: PostInput) {
  const { data, error } = await createAdminClient().from('posts').insert(input).select().single();
  if (error) throw new Error(`Failed to create post: ${error.message}`);
  return data as StoredBlogPost;
}

export async function updatePost(id: string, input: PostInput) {
  const { data, error } = await createAdminClient().from('posts').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update post: ${error.message}`);
  return data as StoredBlogPost;
}

export async function deletePost(id: string) {
  const { error } = await createAdminClient().from('posts').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete post: ${error.message}`);
}
