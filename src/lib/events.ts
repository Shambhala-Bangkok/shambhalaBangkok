import { createAdminClient } from '@/lib/supabase/admin'
import type { SEvent } from '@/lib/types'
import type { EventOccurrence } from '@/lib/event-recurrence'

export type EventImport = {
  id: string
  source_email_id: string
  series_id: string | null
  created_at: string
}

export type EventSeries = {
  id: string
  recurrence_type: 'weekly' | 'monthly'
  interval: number
  weekdays: number[]
  occurrences: string[]
  count: number | null
  until: string | null
  created_at: string
  updated_at: string
}

export async function createEventSeries(
  recurrence: {
    type: 'weekly' | 'monthly'
    interval?: number | null
    weekdays?: number[]
    occurrences?: string[]
    count?: number | null
    until?: string | null
  }
): Promise<EventSeries> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('event_series')
    .insert({
      recurrence_type: recurrence.type,
      interval: recurrence.interval ?? 1,
      weekdays: recurrence.weekdays ?? [],
      occurrences: recurrence.occurrences ?? [],
      count: recurrence.count ?? null,
      until: recurrence.until ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create event series: ${error.message}`)
  }

  return data
}

export async function updateEventSeries(
  seriesId: string,
  recurrence: {
    type: 'weekly' | 'monthly'
    interval?: number | null
    weekdays?: number[]
    occurrences?: string[]
    count?: number | null
    until?: string | null
  }
): Promise<EventSeries> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('event_series')
    .update({
      recurrence_type: recurrence.type,
      interval: recurrence.interval ?? 1,
      weekdays: recurrence.weekdays ?? [],
      occurrences: recurrence.occurrences ?? [],
      count: recurrence.count ?? null,
      until: recurrence.until ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', seriesId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update event series: ${error.message}`)
  }

  return data
}

export async function getEventSeries(
  seriesId: string
): Promise<EventSeries | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('event_series')
    .select('*')
    .eq('id', seriesId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to get event series: ${error.message}`)
  }

  return data
}

export async function getEventSeriesForEvent(
  eventId: string
): Promise<EventSeries | null> {
  const supabase = createAdminClient()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('series_id')
    .eq('id', eventId)
    .maybeSingle()

  if (eventError) {
    throw new Error(
      `Failed to get event series ID: ${eventError.message}`
    )
  }

  if (!event?.series_id) {
    return null
  }

  return getEventSeries(event.series_id)
}

export async function createEventImport(
  sourceEmailId: string,
  seriesId: string | null = null
): Promise<EventImport> {
  const supabase = createAdminClient()

  const { data: existingImport, error: lookupError } =
    await supabase
      .from('event_imports')
      .select('*')
      .eq('source_email_id', sourceEmailId)
      .maybeSingle()

  if (lookupError) {
    throw new Error(
      `Failed to check event import: ${lookupError.message}`
    )
  }

  if (existingImport) {
    return existingImport
  }

  const { data, error } = await supabase
    .from('event_imports')
    .insert({
      source_email_id: sourceEmailId,
      series_id: seriesId,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      const {
        data: concurrentImport,
        error: retryError,
      } = await supabase
        .from('event_imports')
        .select('*')
        .eq('source_email_id', sourceEmailId)
        .single()

      if (retryError || !concurrentImport) {
        throw new Error(
          `Failed to retrieve existing event import: ${retryError?.message ?? 'Unknown error'
          }`
        )
      }

      return concurrentImport
    }

    throw new Error(
      `Failed to create event import: ${error.message}`
    )
  }

  return data
}

export async function updateEventImportSeries(
  importId: string,
  seriesId: string
) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('event_imports')
    .update({ series_id: seriesId })
    .eq('id', importId)
    .select()
    .single()

  if (error) {
    throw new Error(
      `Failed to update event import series: ${error.message}`
    )
  }

  return data
}

export async function getEventImportByEmailId(
  sourceEmailId: string
) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('event_imports')
    .select('*')
    .eq('source_email_id', sourceEmailId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `Failed to get event import: ${error.message}`
    )
  }

  return data
}

export async function getEventsByImportId(importId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('import_id', importId)
    .order('starts_at', { ascending: true })

  if (error) {
    throw new Error(
      `Failed to get imported events: ${error.message}`
    )
  }

  return (data ?? []).map(mapEvent)
}

export async function getEventsBySeriesId(seriesId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('series_id', seriesId)
    .order('starts_at', { ascending: true })

  if (error) {
    throw new Error(
      `Failed to get series events: ${error.message}`
    )
  }

  return (data ?? []).map(mapEvent)
}

export async function createEvent(
  event: EventOccurrence,
  options?: {
    importId?: string
    seriesId?: string | null
  }
) {
  const supabase = createAdminClient()

  const slug =
    options?.seriesId
      ? await createRecurringEventSlug(
        event.title,
        event.starts_at
      )
      : await createUniqueSlug(
        event.title,
        event.starts_at
      )

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: event.title,
      slug,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      description: event.description,
      location: event.location,
      published: false,
      import_id: options?.importId ?? null,
      series_id: options?.seriesId ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`)
  }

  return data
}

export async function updateEventImage(
  eventId: string,
  imagePath: string
) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .update({ image: imagePath })
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    throw new Error(
      `Failed to update event image: ${error.message}`
    )
  }

  return data
}

export async function updateEventSlug(
  eventId: string,
  slug: string
) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .update({ slug })
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    throw new Error(
      `Failed to update event slug: ${error.message}`
    )
  }

  return data
}

export async function updateEventOccurrence(
  eventId: string,
  occurrence: EventOccurrence,
  options?: {
    published?: boolean
    image?: string | null
    slug?: string
  }
) {
  const supabase = createAdminClient()

  const updateData: Record<
    string,
    string | boolean | null
  > = {
    title: occurrence.title,
    starts_at: occurrence.starts_at,
    ends_at: occurrence.ends_at,
    description: occurrence.description,
    location: occurrence.location,
  }

  if (options?.published !== undefined) {
    updateData.published = options.published
  }

  if (options?.image !== undefined) {
    updateData.image = options.image?.trim() || null
  }

  if (options?.slug?.trim()) {
    updateData.slug = options.slug.trim()
  }

  const { data, error } =
    await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single()

  if (error) {
    throw new Error(
      `Failed to update event occurrence: ${error.message}`
    )
  }

  return data
}

export async function deleteEventsByIds(
  eventIds: string[]
) {
  if (eventIds.length === 0) {
    return
  }

  const supabase = createAdminClient()

  const { error } =
    await supabase
      .from('events')
      .delete()
      .in('id', eventIds)

  if (error) {
    throw new Error(
      `Failed to delete events: ${error.message}`
    )
  }
}

export async function publishEvent(eventId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .update({ published: true })
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    throw new Error(
      `Failed to publish event: ${error.message}`
    )
  }

  return data
}

export async function publishEventsByImportId(
  importId: string
) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .update({ published: true })
    .eq('import_id', importId)
    .select()

  if (error) {
    throw new Error(
      `Failed to publish imported events: ${error.message}`
    )
  }

  return data ?? []
}

function mapEvent(
  event: any
): SEvent & { id: string; slug: string } {
  const supabase = createAdminClient()

  const imageUrl = event.image
    ? supabase.storage
      .from('images')
      .getPublicUrl(event.image)
      .data.publicUrl
    : null

  return {
    ...event,
    image: imageUrl,
    startDate: event.starts_at,
    endDate: event.ends_at,
    summary: event.summary ?? '',
    location: event.location ?? '',
    status: event.status ?? 'active',
    modality: event.modality ?? undefined,
    capacity: event.capacity ?? undefined,
    registrationUrl:
      event.registration_url ?? undefined,
  }
}

export async function getAllEvents() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get events: ${error.message}`)
  }

  return (data ?? []).map(mapEvent)
}

export async function getUpcomingEvents() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  if (error) {
    throw new Error(
      `Failed to get upcoming events: ${error.message}`
    )
  }

  return (data ?? []).map(mapEvent)
}

export async function getEventById(id: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to get event: ${error.message}`)
  }

  return mapEvent(data)
}

export async function getEventBySlug(slug: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    throw new Error(
      `Failed to get event: ${error.message}`
    )
  }

  return mapEvent(data)
}

export async function getActiveEventBySlug(
  slug: string
) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (error) {
    throw new Error(
      `Failed to get active event: ${error.message}`
    )
  }

  if (!data) {
    return null
  }

  return mapEvent(data)
}

export async function getActiveUpcomingEvents() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('published', true)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  if (error) {
    throw new Error(
      `Failed to get upcoming events: ${error.message}`
    )
  }

  return (data ?? []).map(mapEvent)
}

export async function getActivePastEvents(
  limit = 6
) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('published', true)
    .lt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(
      `Failed to get past events: ${error.message}`
    )
  }

  return (data ?? []).map(mapEvent)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Create a unique slug for a normal/one-off event.
 *
 * If the base slug is available:
 *
 * "Workshop"
 *
 * becomes:
 *
 * /events/workshop
 *
 * If it already exists, we add the Bangkok-local date:
 *
 * /events/workshop-2026-10-19
 */
export async function createUniqueSlug(
  title: string,
  startsAt: string
): Promise<string> {
  const supabase = createAdminClient()

  const baseSlug = slugify(title)

  if (!baseSlug) {
    throw new Error(
      'Cannot create event slug from empty title'
    )
  }

  const { data: existingBase } =
    await supabase
      .from('events')
      .select('id')
      .eq('slug', baseSlug)
      .maybeSingle()

  if (!existingBase) {
    return baseSlug
  }

  const datePart = getBangkokDate(startsAt)
  const datedSlug = `${baseSlug}-${datePart}`

  const { data: existingDated } =
    await supabase
      .from('events')
      .select('id')
      .eq('slug', datedSlug)
      .maybeSingle()

  if (!existingDated) {
    return datedSlug
  }

  let counter = 2

  while (counter <= 100) {
    const candidate = `${datedSlug}-${counter}`

    const { data: existing } =
      await supabase
        .from('events')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle()

    if (!existing) {
      return candidate
    }

    counter += 1
  }

  throw new Error(
    'Could not generate a unique event slug'
  )
}

/**
 * Create a unique slug for a recurring event occurrence.
 *
 * Recurring events always include their Bangkok-local date,
 * including the first occurrence.
 *
 * Example:
 *
 * /events/sunday-meditation-2026-10-19
 * /events/sunday-meditation-2026-10-26
 * /events/sunday-meditation-2026-11-02
 */
export async function createRecurringEventSlug(
  title: string,
  startsAt: string
): Promise<string> {
  const supabase = createAdminClient()

  const baseSlug = slugify(title)

  if (!baseSlug) {
    throw new Error(
      'Cannot create event slug from empty title'
    )
  }

  const datePart = getBangkokDate(startsAt)
  const datedSlug = `${baseSlug}-${datePart}`

  const { data: existingDated } =
    await supabase
      .from('events')
      .select('id')
      .eq('slug', datedSlug)
      .maybeSingle()

  if (!existingDated) {
    return datedSlug
  }

  let counter = 2

  while (counter <= 100) {
    const candidate = `${datedSlug}-${counter}`

    const { data: existing } =
      await supabase
        .from('events')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle()

    if (!existing) {
      return candidate
    }

    counter += 1
  }

  throw new Error(
    'Could not generate a unique recurring event slug'
  )
}

/**
 * Get the calendar date of an event in Bangkok.
 *
 * This is deliberately based on the event's UTC timestamp
 * converted to Asia/Bangkok, so a value such as:
 *
 * 2026-10-18 23:30:00+00
 *
 * correctly becomes:
 *
 * 2026-10-19 in Bangkok.
 */
function getBangkokDate(startsAt: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(startsAt))
}