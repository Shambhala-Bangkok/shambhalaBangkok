import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { BlogCard } from '@/components/ui/BlogCard';
import { SectionTabs } from '@/components/ui/SectionTabs';
import { getBlogPosts, getPostsBySection } from '@/lib/blog';
import type { BlogSection } from '@/lib/types';

const SECTION_META: Record<BlogSection, { title: string; description: string }> = {
  'shambhala-vision': {
    title: 'Shambhala Vision',
    description: 'The vision of enlightened society rooted in basic goodness.',
  },
  'what-we-offer': {
    title: 'What We Offer',
    description: 'Meditation instruction, programs, and contemplative arts.',
  },
  bibliography: {
    title: 'Bibliography',
    description: 'Essential books on Shambhala Buddhism and meditation.',
  },
  resources: {
    title: 'Resources',
    description: 'Links and resources for the Shambhala community.',
  },
  membership: {
    title: 'Membership',
    description: 'Get involved with the Bangkok Shambhala community.',
  },
};

const VALID_SECTIONS = new Set<string>(Object.keys(SECTION_META));

export const metadata: Metadata = {
  title: 'Blog',
  description: 'News, updates, and reflections from the Bangkok Shambhala community.',
};

interface Props {
  searchParams: Promise<{ section?: string }>;
}

export default async function BlogPage({ searchParams }: Props) {
  const { section } = await searchParams;
  const activeSection = section && VALID_SECTIONS.has(section) ? (section as BlogSection) : null;

  const posts = activeSection ? getPostsBySection(activeSection) : getBlogPosts();
  const meta = activeSection ? SECTION_META[activeSection] : null;

  return (
    <div className="container-content py-8">
      <Breadcrumbs
        items={[
          { label: 'Blog', href: '/blog' },
          ...(meta ? [{ label: meta.title, href: `/blog?section=${activeSection}` }] : []),
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <h1 className="text-3xl md:text-4xl font-bold">{meta ? meta.title : 'Blog & News'}</h1>
      </div>

      <Suspense fallback={null}>
        <SectionTabs />
      </Suspense>

      <p className="text-lg text-text-secondary mt-4 mb-12">
        {meta ? meta.description : 'Updates, reflections, and news from our community.'}
      </p>

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="text-text-secondary py-12 text-center">No posts yet. Check back soon!</p>
      )}
    </div>
  );
}
