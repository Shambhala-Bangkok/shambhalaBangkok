import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { getPostBySlugAdmin } from '@/lib/blog';
import { PostForm } from '@/components/admin/PostForm';

interface Params {
  params: Promise<{ slug: string }>;
}

export default async function EditPostPage({ params }: Params) {
  await requireAuth();
  const { slug } = await params;
  const post = await getPostBySlugAdmin(slug);
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Post</h1>
        <p className="text-sm text-gray-500">Editing: {post.title}</p>
      </div>
      <PostForm
        initial={{
          id: post.id,
          title: post.title || '',
          slug,
          date: post.date?.slice(0, 10) || '',
          author: post.author || 'Bangkok Shambhala',
          tags: post.tags?.join(', ') || '',
          excerpt: post.excerpt || '',
          image: post.image || '',
          section: post.section || '',
          published: post.published ?? false,
          body: post.content,
        }}
      />
    </div>
  );
}
