'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { slugify } from '@/lib/utils'

type RecurrenceType = 'none' | 'weekly' | 'monthly'

type UpdateScope = 'single' | 'series'

interface EventFormInitial {
  id?: string
  title: string
  slug: string
  summary: string
  startDate: string
  endDate: string
  location: string
  image: string
  status: 'draft' | 'published'
  body: string
  updateScope?: UpdateScope

  recurrence?: {
    type: RecurrenceType
    interval?: number | null
    weekdays?: number[]
    occurrences?: string[]
    count?: number | null
    until?: string | null
  } | null
}

interface EventFormProps {
  initial?: EventFormInitial
}

const defaultValues: EventFormInitial = {
  title: '',
  slug: '',
  summary: '',
  startDate: '',
  endDate: '',
  location: '',
  image: '',
  status: 'draft',
  body: '',
  updateScope: 'single',
  recurrence: {
    type: 'none',
    interval: 1,
    weekdays: [],
    occurrences: [],
    count: null,
    until: null,
  },
}

const inputClassName =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

const labelClassName =
  'mb-1 block text-sm font-medium text-gray-700'

export function EventForm({ initial }: EventFormProps) {
  const router = useRouter()
  const isEdit = Boolean(initial?.id)
  const isRecurringEvent =
    Boolean(
      initial?.recurrence &&
      initial.recurrence.type !== 'none'
    )

  const [form, setForm] = useState<EventFormInitial>(
    initial
      ? {
        ...initial,
        updateScope: 'single',
      }
      : defaultValues
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const setField = (
    field: keyof EventFormInitial,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'title' && !isEdit
        ? { slug: slugify(value) }
        : {}),
    }))
  }

  const setRecurrence = (
    field: string,
    value: string | number | null | string[] | number[]
  ) => {
    setForm((prev) => ({
      ...prev,
      recurrence: {
        type: prev.recurrence?.type || 'none',
        interval: prev.recurrence?.interval ?? 1,
        weekdays: prev.recurrence?.weekdays ?? [],
        occurrences: prev.recurrence?.occurrences ?? [],
        count: prev.recurrence?.count ?? null,
        until: prev.recurrence?.until ?? null,
        [field]: value,
      },
    }))
  }

  const toggleWeekday = (day: number) => {
    const current = form.recurrence?.weekdays ?? []

    const weekdays = current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day].sort((a, b) => a - b)

    setRecurrence('weekdays', weekdays)
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }

    if (!form.startDate) {
      setError('Start date and time are required.')
      return
    }

    if (!form.endDate) {
      setError('End date and time are required.')
      return
    }

    const start = new Date(form.startDate)
    const end = new Date(form.endDate)

    if (Number.isNaN(start.getTime())) {
      setError('Please enter a valid start date and time.')
      return
    }

    if (Number.isNaN(end.getTime())) {
      setError('Please enter a valid end date and time.')
      return
    }

    if (end <= start) {
      setError('End date and time must be after the start.')
      return
    }

    if (
      form.recurrence?.type === 'weekly' &&
      (!form.recurrence.weekdays ||
        form.recurrence.weekdays.length === 0)
    ) {
      setError(
        'Please select at least one weekday for a weekly recurrence.'
      )
      return
    }

    if (
      form.recurrence?.type === 'weekly' &&
      !form.recurrence.count &&
      !form.recurrence.until
    ) {
      setError(
        'Weekly recurrence needs either a number of occurrences or an end date.'
      )
      return
    }

    if (
      form.recurrence?.type === 'monthly' &&
      (!form.recurrence.occurrences ||
        form.recurrence.occurrences.length === 0)
    ) {
      setError(
        'Please select at least one monthly occurrence.'
      )
      return
    }

    if (
      form.recurrence?.type === 'monthly' &&
      !form.recurrence.count &&
      !form.recurrence.until
    ) {
      setError(
        'Monthly recurrence needs either a number of occurrences or an end date.'
      )
      return
    }

    setSaving(true)

    try {
      const payload = {
        ...(isEdit && form.id
          ? {
            id: form.id,
          }
          : {}),
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        summary: form.summary.trim(),
        description: form.body,
        startDate: form.startDate,
        endDate: form.endDate,
        location: form.location.trim(),
        image: form.image.trim() || null,
        published: form.status === 'published',
        updateScope:
          isEdit && isRecurringEvent
            ? updateScope
            : 'single',
        recurrence:
          form.recurrence?.type === 'none'
            ? null
            : form.recurrence,
      }

      const response = await fetch('/api/admin/events', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to save event.'
        )
      }

      setSuccess(
        isEdit
          ? 'Event updated successfully.'
          : 'Event created successfully.'
      )

      setTimeout(() => {
        router.push('/admin/events')
        router.refresh()
      }, 800)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save event.'
      )
    } finally {
      setSaving(false)
    }
  }

  const recurrenceType =
    form.recurrence?.type || 'none'

  const updateScope =
    form.updateScope || 'single'

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl space-y-8"
    >
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Basic information */}
      <section className="space-y-5 rounded-xl border border-black/[0.06] bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Event information
          </h2>

          <p className="mt-1 text-sm text-text-secondary">
            Basic information about the event.
          </p>
        </div>

        <div>
          <label className={labelClassName}>
            Title *
          </label>

          <input
            type="text"
            value={form.title}
            onChange={(event) =>
              setField('title', event.target.value)
            }
            className={inputClassName}
            required
          />
        </div>

        <div>
          <label className={labelClassName}>
            Slug
          </label>

          <input
            type="text"
            value={form.slug}
            onChange={(event) =>
              setField('slug', event.target.value)
            }
            className={`${inputClassName} bg-gray-50`}
          />

          <p className="mt-1 text-xs text-gray-500">
            Used for the public event URL.
          </p>
        </div>

        <div>
          <label className={labelClassName}>
            Summary
          </label>

          <textarea
            value={form.summary}
            onChange={(event) =>
              setField('summary', event.target.value)
            }
            rows={3}
            className={inputClassName}
            placeholder="A short summary of the event."
          />
        </div>

        <div>
          <label className={labelClassName}>
            Description
          </label>

          <textarea
            value={form.body}
            onChange={(event) =>
              setField('body', event.target.value)
            }
            rows={14}
            className={`${inputClassName} font-mono`}
            placeholder="Event description. HTML is supported."
          />

          <p className="mt-1 text-xs text-gray-500">
            Use paragraphs, headings, lists, links, and basic HTML
            formatting.
          </p>
        </div>
      </section>

      {/* Date and location */}
      <section className="space-y-5 rounded-xl border border-black/[0.06] bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Date and location
          </h2>

          <p className="mt-1 text-sm text-text-secondary">
            Times are interpreted in Bangkok time
            (Asia/Bangkok).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className={labelClassName}>
              Start *
            </label>

            <input
              type="datetime-local"
              value={form.startDate.slice(0, 16)}
              onChange={(event) =>
                setField('startDate', event.target.value)
              }
              className={inputClassName}
              required
            />
          </div>

          <div>
            <label className={labelClassName}>
              End *
            </label>

            <input
              type="datetime-local"
              value={form.endDate.slice(0, 16)}
              onChange={(event) =>
                setField('endDate', event.target.value)
              }
              className={inputClassName}
              required
            />
          </div>
        </div>

        <div>
          <label className={labelClassName}>
            Location
          </label>

          <input
            type="text"
            value={form.location}
            onChange={(event) =>
              setField('location', event.target.value)
            }
            className={inputClassName}
            placeholder="Bangkok Shambhala Meditation Center"
          />
        </div>
      </section>

      {isEdit && isRecurringEvent && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Apply changes to
          </h3>

          <div className="mt-3 space-y-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="updateScope"
                value="single"
                checked={updateScope === 'single'}
                onChange={() =>
                  setForm((prev) => ({
                    ...prev,
                    updateScope: 'single',
                  }))
                }
                className="mt-1"
              />

              <span>
                <span className="block text-sm font-medium text-gray-900">
                  This event only
                </span>

                <span className="block text-sm text-gray-600">
                  Change only this occurrence. Other events
                  in the series will remain unchanged.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="updateScope"
                value="series"
                checked={updateScope === 'series'}
                onChange={() =>
                  setForm((prev) => ({
                    ...prev,
                    updateScope: 'series',
                  }))
                }
                className="mt-1"
              />

              <span>
                <span className="block text-sm font-medium text-gray-900">
                  Entire series
                </span>

                <span className="block text-sm text-gray-600">
                  Apply the changes to the recurring event series.
                </span>
              </span>
            </label>
          </div>
        </div>
      )}
      {/* Recurrence */}
      <section className="space-y-5 rounded-xl border border-black/[0.06] bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Recurrence
          </h2>

          <p className="mt-1 text-sm text-text-secondary">
            Create a single event or generate a recurring series.
          </p>
        </div>

        <div>
          <label className={labelClassName}>
            Repeats
          </label>

          <select
            value={recurrenceType}
            onChange={(event) =>
              setRecurrence(
                'type',
                event.target.value as RecurrenceType
              )
            }
            className={inputClassName}
          >
            <option value="none">Does not repeat</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {recurrenceType === 'weekly' && (
          <div className="space-y-5 rounded-lg bg-gray-50 p-4">
            <div>
              <label className={labelClassName}>
                Repeat every
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={form.recurrence?.interval ?? 1}
                  onChange={(event) =>
                    setRecurrence(
                      'interval',
                      Math.max(
                        1,
                        Number(event.target.value) || 1
                      )
                    )
                  }
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />

                <span className="text-sm text-gray-600">
                  week(s)
                </span>
              </div>
            </div>

            <div>
              <label className={labelClassName}>
                Weekdays
              </label>

              <div className="flex flex-wrap gap-2">
                {[
                  [1, 'Mon'],
                  [2, 'Tue'],
                  [3, 'Wed'],
                  [4, 'Thu'],
                  [5, 'Fri'],
                  [6, 'Sat'],
                  [0, 'Sun'],
                ].map(([day, label]) => {
                  const selected =
                    form.recurrence?.weekdays?.includes(
                      day as number
                    ) ?? false

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        toggleWeekday(day as number)
                      }
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${selected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClassName}>
                  Number of occurrences
                </label>

                <input
                  type="number"
                  min={1}
                  max={500}
                  value={
                    form.recurrence?.count ?? ''
                  }
                  onChange={(event) =>
                    setRecurrence(
                      'count',
                      event.target.value
                        ? Number(event.target.value)
                        : null
                    )
                  }
                  className={inputClassName}
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <label className={labelClassName}>
                  Or repeat until
                </label>

                <input
                  type="date"
                  value={
                    form.recurrence?.until ?? ''
                  }
                  onChange={(event) =>
                    setRecurrence(
                      'until',
                      event.target.value || null
                    )
                  }
                  className={inputClassName}
                />
              </div>
            </div>
          </div>
        )}

        {recurrenceType === 'monthly' && (
          <div className="space-y-5 rounded-lg bg-gray-50 p-4">
            <div>
              <label className={labelClassName}>
                Repeat every
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={form.recurrence?.interval ?? 1}
                  onChange={(event) =>
                    setRecurrence(
                      'interval',
                      Math.max(
                        1,
                        Number(event.target.value) || 1
                      )
                    )
                  }
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />

                <span className="text-sm text-gray-600">
                  month(s)
                </span>
              </div>
            </div>

            <div>
              <label className={labelClassName}>
                Weekday
              </label>

              <div className="flex flex-wrap gap-2">
                {[
                  [1, 'Mon'],
                  [2, 'Tue'],
                  [3, 'Wed'],
                  [4, 'Thu'],
                  [5, 'Fri'],
                  [6, 'Sat'],
                  [0, 'Sun'],
                ].map(([day, label]) => {
                  const selected =
                    form.recurrence?.weekdays?.includes(
                      day as number
                    ) ?? false

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        toggleWeekday(day as number)
                      }
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${selected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className={labelClassName}>
                Occurrence in the month
              </label>

              <div className="flex flex-wrap gap-2">
                {[
                  ['first', 'First'],
                  ['second', 'Second'],
                  ['third', 'Third'],
                  ['fourth', 'Fourth'],
                  ['last', 'Last'],
                ].map(([value, label]) => {
                  const selected =
                    form.recurrence?.occurrences?.includes(
                      value
                    ) ?? false

                  const current =
                    form.recurrence?.occurrences ?? []

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        const occurrences = selected
                          ? current.filter(
                            (item) => item !== value
                          )
                          : [...current, value]

                        setRecurrence(
                          'occurrences',
                          occurrences
                        )
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${selected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClassName}>
                  Number of occurrences
                </label>

                <input
                  type="number"
                  min={1}
                  max={500}
                  value={
                    form.recurrence?.count ?? ''
                  }
                  onChange={(event) =>
                    setRecurrence(
                      'count',
                      event.target.value
                        ? Number(event.target.value)
                        : null
                    )
                  }
                  className={inputClassName}
                  placeholder="e.g. 6"
                />
              </div>

              <div>
                <label className={labelClassName}>
                  Or repeat until
                </label>

                <input
                  type="date"
                  value={
                    form.recurrence?.until ?? ''
                  }
                  onChange={(event) =>
                    setRecurrence(
                      'until',
                      event.target.value || null
                    )
                  }
                  className={inputClassName}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Image and publishing */}
      <section className="space-y-5 rounded-xl border border-black/[0.06] bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Image and publishing
          </h2>
        </div>

        <div>
          <label className={labelClassName}>
            Image path
          </label>

          <input
            type="text"
            value={form.image}
            onChange={(event) =>
              setField('image', event.target.value)
            }
            className={inputClassName}
            placeholder="events/.../image.jpg"
          />

          <p className="mt-1 text-xs text-gray-500">
            This uses the existing Supabase Storage image path.
            We'll add direct image upload to the admin form next.
          </p>
        </div>

        <div>
          <label className={labelClassName}>
            Status
          </label>

          <select
            value={form.status}
            onChange={(event) =>
              setField(
                'status',
                event.target.value as 'draft' | 'published'
              )
            }
            className={inputClassName}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? 'Saving...'
            : isEdit
              ? 'Update Event'
              : 'Create Event'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/admin/events')}
          disabled={saving}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}