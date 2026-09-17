import { requireAuth } from '@/lib/auth';
import { getAllPosts } from '@/lib/blog';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default async function AdminPostsPage() {
  await requireAuth();
  const posts = getAllPosts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog Posts</h1>
          <p className="text-sm text-text-secondary">Create and manage blog posts.</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Post
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft border-b border-black/[0.06]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Title</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Date</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Tags</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {posts.map((post) => (
              <tr key={post.slug} className="hover:bg-surface-soft/50">
                <td className="px-4 py-3">
                  <Link href={`/blog/${post.slug}`} className="font-medium hover:text-brand-blue transition-colors">
                    {post.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{formatDate(post.date)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {post.tags?.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs bg-surface-muted rounded-full text-text-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Link href={`/admin/posts/${post.slug}/edit`} className="text-blue-600 hover:text-blue-800 transition-colors text-xs">
                    Edit
                  </Link>
                  <Link href={`/blog/${post.slug}`} className="text-gray-500 hover:text-gray-700 transition-colors text-xs">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 && (
          <div className="px-4 py-8 text-center text-text-tertiary">
            No posts found. Create a .md file in content/blog/ to add one.
          </div>
        )}
      </div>
    </div>
  );
}
