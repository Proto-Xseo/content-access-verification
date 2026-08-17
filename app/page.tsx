'use client'

import { useMemo, useState } from 'react'
import {
  Archive,
  ArrowDownToLine,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  FileVideo,
  Filter,
  FolderOpen,
  Grid2X2,
  LayoutList,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'

const videos = [
  { id: '001', title: 'Archive_001 — 2024-06-18', size: '842 MB', duration: '38:42', resolution: '1080p', status: 'Ready', color: 'from-cyan-500/80 to-blue-700/80' },
  { id: '002', title: 'Archive_002 — 2024-06-18', size: '1.2 GB', duration: '52:16', resolution: '1080p', status: 'Ready', color: 'from-indigo-500/80 to-violet-700/80' },
  { id: '003', title: 'Archive_003 — 2024-06-19', size: '634 MB', duration: '29:08', resolution: '720p', status: 'Ready', color: 'from-emerald-500/80 to-teal-700/80' },
  { id: '004', title: 'Archive_004 — 2024-06-19', size: '2.1 GB', duration: '1:14:33', resolution: '1080p', status: 'Ready', color: 'from-amber-500/80 to-orange-700/80' },
  { id: '005', title: 'Archive_005 — 2024-06-20', size: '918 MB', duration: '44:51', resolution: '1080p', status: 'Queued', color: 'from-fuchsia-500/80 to-rose-700/80' },
  { id: '006', title: 'Archive_006 — 2024-06-20', size: '477 MB', duration: '21:04', resolution: '720p', status: 'Ready', color: 'from-sky-500/80 to-cyan-700/80' },
  { id: '007', title: 'Archive_007 — 2024-06-21', size: '1.8 GB', duration: '1:02:18', resolution: '1080p', status: 'Ready', color: 'from-purple-500/80 to-indigo-700/80' },
  { id: '008', title: 'Archive_008 — 2024-06-21', size: '756 MB', duration: '35:27', resolution: '720p', status: 'Ready', color: 'from-lime-500/80 to-emerald-700/80' },
]

export default function Page() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [active, setActive] = useState<typeof videos[number] | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [notice, setNotice] = useState('')

  const filtered = useMemo(() => videos.filter((video) => video.title.toLowerCase().includes(query.toLowerCase())), [query])
  const allSelected = filtered.length > 0 && filtered.every((video) => selected.includes(video.id))

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function selectAll() {
    setSelected(allSelected ? [] : filtered.map((video) => video.id))
  }

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2800)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/15"><Archive className="size-4" /></div>
            <div><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Personal recovery</p><h1 className="font-sans text-lg font-semibold tracking-tight">Vaultline</h1></div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-emerald-500" /> Local-first workspace <button className="ml-3 rounded-lg border border-border p-2 hover:bg-muted" aria-label="Settings"><Settings2 className="size-4" /></button></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-8 px-6 py-8 lg:grid-cols-[220px_1fr] lg:px-10">
        <aside className="hidden lg:block">
          <div className="sticky top-8 flex flex-col gap-8">
            <div><p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Workspace</p><nav className="flex flex-col gap-1 text-sm"><button className="flex items-center gap-3 rounded-xl bg-primary px-3 py-2.5 text-left text-primary-foreground"><Archive className="size-4" /> All media <span className="ml-auto font-mono text-[10px] opacity-70">2.3k</span></button><button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-muted-foreground hover:bg-muted"><Download className="size-4" /> Recovery queue <span className="ml-auto font-mono text-[10px]">12</span></button><button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-muted-foreground hover:bg-muted"><Check className="size-4" /> Completed <span className="ml-auto font-mono text-[10px]">0</span></button></nav></div>
            <div><p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Storage</p><div className="rounded-2xl border border-border bg-card p-4"><div className="mb-3 flex items-center justify-between text-xs"><span className="text-muted-foreground">Local disk</span><span className="font-mono">0 / 2 TB</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-[3%] rounded-full bg-primary" /></div><p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Downloads stay on this device until you move them.</p></div></div>
            <div className="rounded-2xl border border-dashed border-border p-4"><Sparkles className="mb-3 size-4 text-primary" /><p className="text-xs font-medium">Clean playback</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">A focused library view without distractions.</p></div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Collection / imported source</p><h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Your video archive</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Browse, verify, and recover your collection from one quiet workspace.</p></div><button onClick={() => showNotice('Source scanner is ready for an authorized page capture.')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/10 hover:opacity-90"><RefreshCw className="size-4" /> Scan source</button></div>

          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-3 md:flex-row md:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, dates, or metadata..." className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" /></div><button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm text-muted-foreground hover:bg-muted"><Filter className="size-4" /> Filters <ChevronDown className="size-3" /></button><div className="flex items-center gap-1 rounded-xl border border-border p-1"><button onClick={() => setView('grid')} className={`rounded-lg p-2 ${view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`} aria-label="Grid view"><Grid2X2 className="size-4" /></button><button onClick={() => setView('list')} className={`rounded-lg p-2 ${view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`} aria-label="List view"><LayoutList className="size-4" /></button></div></div>

          <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><button onClick={selectAll} className="flex size-5 items-center justify-center rounded-md border border-border bg-card" aria-label="Select all">{allSelected && <Check className="size-3 text-primary" />}</button><span className="text-xs text-muted-foreground">{selected.length ? `${selected.length} selected` : 'Showing 1–8 of 2,347 videos'}</span></div><button onClick={() => showNotice(selected.length ? `Added ${selected.length} video${selected.length === 1 ? '' : 's'} to the recovery queue.` : 'Select videos to queue them.')} className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"><Plus className="size-3.5" /> Add to queue</button></div>

          <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'flex flex-col gap-2'}>{filtered.map((video) => <article key={video.id} className={`group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 ${view === 'list' ? 'flex items-center gap-4 p-3' : ''}`}><div className={`relative overflow-hidden bg-gradient-to-br ${video.color} ${view === 'list' ? 'h-16 w-28 shrink-0 rounded-xl' : 'aspect-[16/10]'}`}><div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,.16),transparent_80%)] opacity-50" /><span className="absolute left-3 top-3 rounded-md bg-black/25 px-2 py-1 font-mono text-[10px] text-white backdrop-blur-sm">{video.resolution}</span><button onClick={() => setActive(video)} className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 opacity-0 shadow-xl transition group-hover:opacity-100" aria-label={`Play ${video.title}`}><Play className="ml-0.5 size-4 fill-current" /></button><span className="absolute bottom-3 right-3 rounded-md bg-black/50 px-2 py-1 font-mono text-[10px] text-white">{video.duration}</span></div><div className={`p-4 ${view === 'list' ? 'flex flex-1 items-center justify-between gap-4 p-0' : ''}`}><div className="min-w-0"><div className="mb-2 flex items-center gap-2"><button onClick={() => toggle(video.id)} className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border bg-background" aria-label={`Select ${video.title}`}>{selected.includes(video.id) && <Check className="size-3 text-primary" />}</button><h3 className="truncate text-sm font-medium">{video.title}</h3></div><div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"><span>{video.size}</span><span className="text-border">/</span><span>{video.status}</span></div></div><button onClick={() => showNotice(`Download prepared for ${video.title}.`)} className="rounded-lg p-2 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100" aria-label={`Download ${video.title}`}><ArrowDownToLine className="size-4" /></button></div></article>)}</div>
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5"><p className="text-xs text-muted-foreground">Last indexed just now <span className="mx-2 text-border">·</span> Source is local to this workspace</p><button className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><SlidersHorizontal className="size-3.5" /> View settings</button></div>
        </section>
      </div>

      {active && <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Video preview"><div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"><div className={`relative aspect-video bg-gradient-to-br ${active.color}`}><div className="absolute inset-0 flex items-center justify-center"><div className="flex size-16 items-center justify-center rounded-full bg-white/90 text-slate-900"><Play className="ml-1 size-6 fill-current" /></div></div><button onClick={() => setActive(null)} className="absolute right-4 top-4 rounded-lg bg-black/30 p-2 text-white hover:bg-black/50" aria-label="Close preview"><X className="size-4" /></button></div><div className="flex items-center justify-between gap-4 p-5"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Preview</p><h2 className="mt-1 text-lg font-semibold">{active.title}</h2><p className="mt-1 text-xs text-muted-foreground">{active.resolution} · {active.duration} · {active.size}</p></div><button onClick={() => showNotice(`Download prepared for ${active.title}.`)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"><Download className="size-4" /> Recover</button></div></div></div>}
      {notice && <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-2xl"><CircleHelp className="size-4 text-primary" /> {notice}</div>}
    </main>
  )
}
