import { createClient } from '@/lib/supabase/server'

export default async function TestSupabasePage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')

  if (error) {
    return <pre>{JSON.stringify(error, null, 2)}</pre>
  }

  return (
    <pre>
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}