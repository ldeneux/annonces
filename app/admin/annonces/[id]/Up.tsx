'use client'
import { createBrowserClient } from '@supabase/ssr'
export default function Up({ id, save }: { id: string; save: (paths: string[]) => Promise<void> }) {
  async function go(e: React.ChangeEvent<HTMLInputElement>) {
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const paths: string[] = []
    for (const f of Array.from(e.target.files || [])) {
      const p = `${id}/${Date.now()}-${f.name.replace(/[^\w.]/g, '_')}`
      const { error } = await sb.storage.from('annonces').upload(p, f)
      if (!error) paths.push(p)
    }
    await save(paths); location.reload()
  }
  return <input type="file" accept="image/*" multiple onChange={go} />
}
