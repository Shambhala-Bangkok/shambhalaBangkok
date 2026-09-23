import type { Metadata } from 'next';
import { EventCard } from '@/components/ui/EventCard';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getActiveUpcomingEvents, getActivePastEvents } from '@/lib/events';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Events',
  description:
    'Upcoming meditation events, workshops and community gatherings at Bangkok Shambhala.',
};

export default async function EventsPage() {
  const upcoming = await getActiveUpcomingEvents();
  const past = await getActivePastEvents(6);


  return (
    <div className="container-content py-8">
      <Breadcrumbs items={[{ label: 'Events', href: '/events' }]} />

      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Events</h1>
        <p className="text-text-secondary text-lg">
          Meditation sessions, workshops, and community gatherings.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href={process.env.NEXT_PUBLIC_ICS_FEED!}
            className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark transition-colors"
          >
            📅 Subscribe to Calendar (ICS)
          </Link>
        </div>
      </div>

      {/* Upcoming */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold mb-6">Upcoming</h2>
        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((event) => (
              <EventCard key={event.slug} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-text-secondary py-8">
            No upcoming events at the moment. Join our community to stay updated!
          </p>
        )}
      </section>

      {/* Past Events */}
      {past.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-6 text-text-secondary">Past Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.map((event) => (
              <EventCard key={event.slug} event={event} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
