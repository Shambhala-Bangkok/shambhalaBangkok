import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createPost, deletePost, updatePost, type PostInput } from '@/lib/blog';
import type { BlogSection } from '@/lib/types';

const SECTIONS = new Set<BlogSection>([
  'shambhala-vision', 'what-we-offer', 'bibliography', 'resources', 'membership',
]);

type RequestBody = Partial<PostInput> & { id?: string };

function parseInput(body: RequestBody): PostInput {
  const title = body.title?.trim();
  const slug = body.slug?.trim();
  if (!title || !slug) throw new Error('Title and slug are required');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Slug must contain lowercase letters, numbers, and hyphens only');
  if (!body.date || Number.isNaN(Date.parse(body.date))) throw new Error('A valid date is required');
  if (body.section && !SECTIONS.has(body.section)) throw new Error('Invalid blog section');

  return {
    title,
    slug,
    date: body.date,
    author: body.author?.trim() || 'Bangkok Shambhala',
    tags: Array.isArray(body.tags) ? body.tags.map((tag) => tag.trim()).filter(Boolean) : [],
    excerpt: body.excerpt?.trim() || '',
    image: body.image?.trim() || undefined,
    section: body.section || undefined,
    published: body.published ?? false,
    content: body.content || '',
  };
}

function refresh(slug: string, previousSlug?: string) {
  revalidatePath('/');
  revalidatePath('/blog');
  revalidatePath('/admin/posts');
  revalidatePath(`/blog/${slug}`);
  if (previousSlug && previousSlug !== slug) revalidatePath(`/blog/${previousSlug}`);
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : 'Post operation failed';
  const status = message.includes('duplicate key') ? 409 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const input = parseInput(await request.json());
    const post = await createPost(input);
    refresh(post.slug);
    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/posts failed:', error);
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAuth();
    const body = (await request.json()) as RequestBody;
    if (!body.id) throw new Error('Post ID is required');
    const input = parseInput(body);
    const previousSlug = request.headers.get('x-previous-slug') || undefined;
    const post = await updatePost(body.id, input);
    refresh(post.slug, previousSlug);
    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('PATCH /api/admin/posts failed:', error);
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuth();
    const { id, slug } = (await request.json()) as { id?: string; slug?: string };
    if (!id) throw new Error('Post ID is required');
    await deletePost(id);
    refresh(slug || '');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/posts failed:', error);
    return failure(error);
  }
}
