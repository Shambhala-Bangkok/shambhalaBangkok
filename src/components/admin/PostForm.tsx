'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarkdownEditor } from './MarkdownEditor';
import { slugify } from '@/lib/utils';

interface PostFormProps {
  initial?: {
    title: string;
    slug: string;
    date: string;
    author: string;
    tags: string;
    excerpt: string;
    image: string;
    published: boolean;
    body: string;
  };
}

const defaultValues = {
  title: '',
  slug: '',
  date: new Date().toISOString().slice(0, 10),
  author: 'Bangkok Shambhala',
  tags: '',
  excerpt: '',
  image: '',
  published: false,
  body: '',
};

export function PostForm({ initial }: PostFormProps) {
  const router = useRouter();
  const isEdit = !!initial;
  const [form, setForm] = useState(initial || defaultValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'title' && !isEdit ? { slug: slugify(value as string) } : {}),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError('');

    const frontmatter: Record<string, unknown> = {
      title: form.title,
      date: form.date,
      author: form.author || 'Bangkok Shambhala',
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      excerpt: form.excerpt,
      published: form.published,
    };
    if (form.image) frontmatter.image = form.image;

    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'blog',
          slug: form.slug,
          frontmatter,
          content: form.body,
          message: `${isEdit ? 'Update' : 'Create'} post: ${form.title}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save');
      } else {
        setSuccess('Post saved! The site will rebuild in ~30 seconds.');
        setTimeout(() => router.push('/admin/posts'), 2000);
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-3">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input type="text" value={form.slug} onChange={(e) => set('slug', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Author</label>
          <input type="text" value={form.author} onChange={(e) => set('author', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Excerpt</label>
          <textarea value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
          <input type="text" value={form.tags} onChange={(e) => set('tags', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Image URL</label>
          <input type="text" value={form.image} onChange={(e) => set('image', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)}
              className="rounded border-gray-300" />
            Published
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
        <MarkdownEditor value={form.body} onChange={(val) => set('body', val)} />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : isEdit ? 'Update Post' : 'Create Post'}
        </button>
        <button type="button" onClick={() => router.push('/admin/posts')}
          className="px-6 py-2.5 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
