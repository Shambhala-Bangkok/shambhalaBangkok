import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { getContentBySlug } from '@/lib/content';
import { PostForm } from '@/components/admin/PostForm';
import type { BlogPost } from '@/lib/types';

interface Params {
  params: Promise<{ slug: string }>;
}

export default async function EditPostPage({ params }: Params) {
  await requireAuth();
  const { slug } = await params;
  const result = getContentBySlug<BlogPost>('blog', slug);
  if (!result) notFound();

  const { data, content } = result;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Post</h1>
        <p className="text-sm text-gray-500">Editing: {data.title}</p>
      </div>
      <PostForm
        initial={{
          title: data.title || '',
          slug,
          date: data.date?.slice(0, 10) || '',
          author: data.author || 'Bangkok Shambhala',
          tags: data.tags?.join(', ') || '',
          excerpt: data.excerpt || '',
          image: data.image || '',
          published: data.published ?? false,
          body: content,
        }}
      />
    </div>
  );
}
