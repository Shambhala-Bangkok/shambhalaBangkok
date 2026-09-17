import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getActiveEventBySlug, getAllEvents } from '@/lib/events';
import {
  generatePageMeta,
} from '@/lib/schema';
import { formatDate, formatTime } from '@/lib/utils';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AddToCalendarButton } from '@/components/ui/AddToCalendarButton';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ExternalLink,
} from 'lucide-react';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const events = await getAllEvents();

  return events.map((event) => ({
    slug: event.slug,
  }));
}

export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const { slug } = await params;
  const event = await getActiveEventBySlug(slug);

  if (!event) {
    return {};
  }

  return generatePageMeta({
    title: event.title,
    description: event.summary,
    ogImage: event.image ?? undefined,
  });
}

export default async function EventDetailPage({ params }: Params) {
  const { slug } = await params;
  const event = await getActiveEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const isPast = new Date(event.startDate) < new Date();
  const isCancelled = event.status === 'cancelled';

  return (
    <article className="container-content py-8 md:py-12">
        <Breadcrumbs
          items={[
            {
              label: 'Events',
              href: '/events',
            },
            {
              label: event.title,
              href: `/events/${event.slug}`,
            },
          ]}
        />

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mt-8 mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {event.modality && (
                <span
                  className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                    event.modality === 'in-person'
                      ? 'bg-green-50 text-green-700'
                      : event.modality === 'online'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  {event.modality === 'in-person'
                    ? 'In person'
                    : event.modality === 'online'
                      ? 'Online'
                      : event.modality}
                </span>
              )}

              {isCancelled && (
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700">
                  Cancelled
                </span>
              )}

              {isPast && (
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                  Past event
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-text-primary leading-tight">
              {event.title}
            </h1>

            {event.summary && (
              <p className="mt-5 text-lg md:text-xl leading-relaxed text-text-secondary max-w-3xl">
                {event.summary}
              </p>
            )}
          </header>

          {/* Event image */}
          {event.image && (
            <div className="mb-10 flex justify-center">
              <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-surface-soft shadow-sm">
                <Image
                  src={event.image}
                  alt={event.title}
                  width={1200}
                  height={800}
                  className="w-full max-h-[420px] object-contain"
                  priority
                />
              </div>
            </div>
          )}

          {/* Event information */}
          <section className="mb-12 rounded-2xl border border-black/[0.08] bg-surface-soft p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              {/* Date */}
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10">
                  <Calendar className="h-5 w-5 text-brand-blue" />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                    Date
                  </p>
                  <p className="mt-1 font-medium text-text-primary">
                    {formatDate(event.startDate)}
                  </p>
                </div>
              </div>

              {/* Time */}
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10">
                  <Clock className="h-5 w-5 text-brand-blue" />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                    Time
                  </p>
                  <p className="mt-1 font-medium text-text-primary">
                    {formatTime(event.startDate)} –{' '}
                    {formatTime(event.endDate)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    Bangkok time (GMT+7)
                  </p>
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10">
                    <MapPin className="h-5 w-5 text-brand-blue" />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                      Location
                    </p>
                    <p className="mt-1 font-medium text-text-primary">
                      {event.location}
                    </p>
                  </div>
                </div>
              )}

              {/* Capacity */}
              {event.capacity && (
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.04]">
                    <Users className="h-5 w-5 text-text-tertiary" />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                      Availability
                    </p>
                    <p className="mt-1 font-medium text-text-primary">
                      {event.capacity} spots available
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {!isPast && !isCancelled && (
              <div className="mt-7 flex flex-wrap gap-3 border-t border-black/[0.08] pt-6">
                {event.registrationUrl && (
                  <a
                    href={event.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark"
                  >
                    Register
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                <AddToCalendarButton event={event} />
              </div>
            )}
          </section>

          {/* Description */}
          {event.description && (
            <section className="mb-16">
              <div
                className="
                  text-text-primary
                  text-base
                  leading-7

                  [&_p]:mb-5
                  [&_p:last-child]:mb-0

                  [&_h2]:mt-10
                  [&_h2]:mb-4
                  [&_h2]:text-2xl
                  [&_h2]:font-bold
                  [&_h2]:leading-tight

                  [&_h3]:mt-8
                  [&_h3]:mb-3
                  [&_h3]:text-xl
                  [&_h3]:font-semibold
                  [&_h3]:leading-tight

                  [&_h4]:mt-6
                  [&_h4]:mb-2
                  [&_h4]:font-semibold

                  [&_ul]:mb-5
                  [&_ul]:list-disc
                  [&_ul]:pl-6

                  [&_ol]:mb-5
                  [&_ol]:list-decimal
                  [&_ol]:pl-6

                  [&_li]:mb-2

                  [&_a]:font-medium
                  [&_a]:text-brand-blue
                  [&_a]:underline
                  [&_a]:underline-offset-2
                  [&_a:hover]:no-underline

                  [&_strong]:font-semibold

                  [&_blockquote]:my-6
                  [&_blockquote]:border-l-4
                  [&_blockquote]:border-brand-blue
                  [&_blockquote]:pl-5
                  [&_blockquote]:italic
                  [&_blockquote]:text-text-secondary

                  [&_img]:my-6
                  [&_img]:max-w-full
                  [&_img]:rounded-xl

                  [&_hr]:my-8
                  [&_hr]:border-black/[0.08]
                "
                dangerouslySetInnerHTML={{
                  __html: event.description,
                }}
              />
            </section>
          )}
        </div>
    </article>
  );
}
