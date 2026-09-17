import Link from 'next/link'
import {
  getAllEvents,
} from '@/lib/events'
import { requireAuth } from '@/lib/auth'
import { formatDate, formatTime } from '@/lib/utils'

function StatusBadge({
  published,
}: {
  published: boolean
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        published
          ? 'bg-green-50 text-green-700'
          : 'bg-yellow-50 text-yellow-700'
      }`}
    >
      {published ? 'Published' : 'Draft'}
    </span>
  )
}

export default async function AdminEventsPage() {
  await requireAuth()

  const events = await getAllEvents()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Events
          </h1>

          <p className="mt-1 text-sm text-text-secondary">
            Manage events stored in Supabase.
          </p>
        </div>

        <Link
          href="/admin/events/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          + New Event
        </Link>
      </div>

      {/* Events table */}
      <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white">
        {events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-black/[0.06] bg-surface-soft">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">
                    Event
                  </th>

                  <th className="px-4 py-3 text-left font-medium text-text-secondary">
                    Date
                  </th>

                  <th className="px-4 py-3 text-left font-medium text-text-secondary">
                    Location
                  </th>

                  <th className="px-4 py-3 text-left font-medium text-text-secondary">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right font-medium text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/[0.04]">
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="transition-colors hover:bg-surface-soft/50"
                  >
                    {/* Event */}
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        {event.series_id && (
                          <span
                            title="Recurring event"
                            className="mt-0.5 text-base"
                          >
                            ↻
                          </span>
                        )}

                        <div>
                          <Link
                            href={`/events/${event.slug}`}
                            className="font-medium text-text-primary transition-colors hover:text-brand-blue"
                          >
                            {event.title}
                          </Link>

                          {event.series_id && (
                            <p className="mt-0.5 text-xs text-text-tertiary">
                              Recurring series
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="whitespace-nowrap px-4 py-4 text-text-secondary">
                      <div>
                        {formatDate(event.startDate)}
                      </div>

                      <div className="mt-0.5 text-xs text-text-tertiary">
                        {formatTime(event.startDate)}
                        {' – '}
                        {formatTime(event.endDate)}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-4 text-text-secondary">
                      {event.location || '—'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <StatusBadge
                        published={event.published ?? false}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/admin/events/${event.slug}/edit`}
                          className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-800"
                        >
                          Edit
                        </Link>

                        <Link
                          href={`/events/${event.slug}`}
                          className="text-xs text-text-secondary transition-colors hover:text-text-primary"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="font-medium text-text-primary">
              No events yet
            </p>

            <p className="mt-1 text-sm text-text-secondary">
              Create your first event to get started.
            </p>

            <Link
              href="/admin/events/new"
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Event
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}