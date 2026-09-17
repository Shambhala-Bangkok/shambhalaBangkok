import { getAllContent, getContentBySlug } from './content';
import { markdownToHtml } from './markdown';
import type { BlogPost, BlogSection } from './types';

export function getAllPosts(): (BlogPost & { slug: string })[] {
  const items = getAllContent<BlogPost>('blog');
  return items
    .map((item) => ({
      ...item.data,
      slug: item.slug,
      content: markdownToHtml(item.content),
    }))
    .filter((p) => p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostsBySection(section: BlogSection): (BlogPost & { slug: string })[] {
  return getAllPosts().filter((p) => p.section === section);
}

export function getBlogPosts(): (BlogPost & { slug: string })[] {
  return getAllPosts().filter((p) => !p.section);
}

export function getPostBySlug(slug: string): (BlogPost & { slug: string }) | null {
  const result = getContentBySlug<BlogPost>('blog', slug);
  if (!result) return null;
  return { ...result.data, slug, content: markdownToHtml(result.content) };
}

export function getRecentPosts(limit = 3): (BlogPost & { slug: string })[] {
  return getBlogPosts().slice(0, limit);
}
