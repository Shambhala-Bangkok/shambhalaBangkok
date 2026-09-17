import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEventBySlug, getEventSeriesForEvent } from '@/lib/events'
import { EventForm } from '@/components/admin/EventForm'

interface Params {
  params: Promise<{ slug: string }>
}

export default async function EditEventPage({ params }: Params) {
  await requireAuth()

  const { slug } = await params

  const event = await getEventBySlug(slug)

  if (!event) {
    notFound()
  }

  const series = await getEventSeriesForEvent(
    event.id
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Edit Event
        </h1>

        <p className="mt-1 text-sm text-text-secondary">
          Editing: {event.title}
        </p>
      </div>
      <EventForm
        initial={{
          id: event.id,
          title: event.title || '',
          slug: event.slug || '',
          summary: event.summary || '',
          startDate: event.startDate
            ? event.startDate.slice(0, 16)
            : '',
          endDate: event.endDate
            ? event.endDate.slice(0, 16)
            : '',
          location: event.location || '',
          image: event.image || '',
          status: event.published
            ? 'published'
            : 'draft',
          body: event.description || '',
          recurrence: series
            ? {
              type:
                series.recurrence_type,
              interval: series.interval,
              weekdays:
                series.weekdays,
              occurrences:
                series.occurrences as (
                  | 'first'
                  | 'second'
                  | 'third'
                  | 'fourth'
                  | 'last'
                )[],
              count: series.count,
              until: series.until,
            }
            : {
              type: 'none',
              interval: 1,
              weekdays: [],
              occurrences: [],
              count: null,
              until: null,
            },
        }}
      />
    </div>
  )
}