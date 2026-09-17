import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function uploadEventImage(
  emailId: string
): Promise<string | null> {
  // Get attachments belonging to this email.
  const { data, error } =
    await resend.emails.receiving.attachments.list({
      emailId,
    })

  if (error) {
    throw new Error(
      `Failed to retrieve attachments: ${error.message}`
    )
  }

  if (!data?.data?.length) {
    return null
  }

  // Find the first image attachment.
  const attachment = data.data.find((item) =>
    item.content_type?.startsWith('image/')
  )

  if (!attachment) {
    return null
  }

  // Get the actual attachment and its download URL.
  const {
    data: attachmentDetails,
    error: attachmentError,
  } = await resend.emails.receiving.attachments.get({
    id: attachment.id,
    emailId,
  })

  if (attachmentError || !attachmentDetails) {
    throw new Error(
      `Failed to retrieve attachment: ${
        attachmentError?.message ?? 'Unknown error'
      }`
    )
  }

  if (!attachmentDetails.download_url) {
    throw new Error('Attachment has no download URL')
  }

  // Download the image from Resend.
  const response = await fetch(
    attachmentDetails.download_url
  )

  if (!response.ok) {
    throw new Error(
      `Failed to download image: ${response.status} ${response.statusText}`
    )
  }

  const imageBuffer = await response.arrayBuffer()

  const filename = attachment.filename ?? 'image'
  const contentType =
    attachment.content_type ?? 'application/octet-stream'

  const extension = getExtension(
    filename,
    contentType
  )

  // One image belongs to the entire imported email/series.
  const path = `events/${emailId}/image${extension}`

  // Upload to Supabase Storage.
  const supabase = createAdminClient()

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(path, imageBuffer, {
      contentType,
      upsert: true,
    })

  if (uploadError) {
    throw new Error(
      `Failed to upload event image: ${uploadError.message}`
    )
  }

  return path
}

function getExtension(
  filename: string,
  contentType: string
): string {
  const filenameExtension =
    filename.match(/\.[^.]+$/)?.[0]

  if (filenameExtension) {
    return filenameExtension.toLowerCase()
  }

  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  }

  return extensions[contentType] ?? ''
}