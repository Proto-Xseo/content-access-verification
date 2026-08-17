'use client'

import { useMemo, useState } from 'react'
import { Archive, Check, Download, FileVideo, Grid2X2, LayoutList, Loader2, Play, RefreshCw, Search, ShieldCheck, X } from 'lucide-react'

type Item = { id: string; title: string; url: string; pageUrl: string; kind: 'video' | 'file' }
type Scan = { source: string; items: Item[]; pagesDiscovered: number; scannedAt: string; note?: string }

const defaultSource = 'https://bunkr.cr/a/ZRRy6S9v'

export default function Page() {
  const [source, setSource] = useState(defaultSource)
  const [scan, setScan] = useState<Scan | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [active, setActive] = useState<Item | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  async function scanSource() {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/source?url=${encodeURIComponent(source)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to scan source.')
      setScan(data); setSelected([])
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to scan source.') }
    finally { setLoading(false) }
  }

  const filtered = useMemo(() => (scan?.items ?? []).filter((item) => item.title.toLowerCase().includes(query.toLowerCase())), [scan, query])
  const allSelected = filtered.length > 0 && filtered.every((item) => selected.includes(item.id))
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border/70"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Archive className="size-4" /></div><div><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Live source recovery</p><h1 className="text-lg font-semibold">Vaultline</h1></div></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Authorized browser-visible media</div></div></header>
    <section className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10"><div className="mb-8 max-w-3xl"><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">No mock data</p><h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Scan your actual collection.</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Enter the collection URL to enumerate media links exposed by the page and browse the returned files in a cleaner workspace.</p></div>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 md:flex-row"><input value={source} onChange={(event) => setSource(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" aria-label="Collection URL" /><button onClick={scanSource} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-60">{loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} {loading ? 'Scanning source' : 'Scan collection'}</button></div>
      {error && <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      {scan && <><div className="mt-8 grid gap-3 sm:grid-cols-3"><Stat label="Items discovered" value={scan.items.length.toLocaleString()} /><Stat label="Pages detected" value={scan.pagesDiscovered.toString()} /><Stat label="Last scan" value={new Date(scan.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} /></div><div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search discovered filenames..." className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring" /></div><div className="flex items-center gap-1 rounded-xl border border-border p-1"><button onClick={() => setView('grid')} className={`rounded-lg p-2 ${view === 'grid' ? 'bg-muted' : 'text-muted-foreground'}`} aria-label="Grid view"><Grid2X2 className="size-4" /></button><button onClick={() => setView('list')} className={`rounded-lg p-2 ${view === 'list' ? 'bg-muted' : 'text-muted-foreground'}`} aria-label="List view"><LayoutList className="size-4" /></button></div></div><div className="my-4 flex items-center justify-between text-xs text-muted-foreground"><button onClick={() => setSelected(allSelected ? [] : filtered.map((item) => item.id))} className="inline-flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-md border border-border">{allSelected && <Check className="size-3 text-primary" />}</span>{selected.length ? `${selected.length} selected` : `${filtered.length} shown`}</button><span>{scan.note}</span></div>{filtered.length === 0 ? <Empty /> : <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'flex flex-col gap-2'}>{filtered.map((item) => <article key={item.id} className={`group rounded-2xl border border-border bg-card p-4 ${view === 'list' ? 'flex items-center gap-4' : ''}`}><div className={`flex items-center justify-center rounded-xl bg-accent text-primary ${view === 'list' ? 'size-14 shrink-0' : 'aspect-video'}`}><FileVideo className="size-7" /></div><div className="min-w-0 flex-1"><div className="mt-3 flex items-start gap-2"><button onClick={() => toggle(item.id)} className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border" aria-label={`Select ${item.title}`}>{selected.includes(item.id) && <Check className="size-3 text-primary" />}</button><h3 className="truncate text-sm font-medium" title={item.title}>{item.title}</h3></div><p className="mt-2 truncate font-mono text-[10px] text-muted-foreground">{item.url}</p><div className="mt-3 flex gap-2"><button onClick={() => setActive(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted"><Play className="size-3" /> Preview</button><a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs text-primary-foreground"><Download className="size-3" /> Open download</a></div></div></article>)}</div>}</>}
    </section>
    {active && <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-6 backdrop-blur-md"><div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border p-4"><h2 className="font-medium">{active.title}</h2><button onClick={() => setActive(null)} aria-label="Close preview"><X className="size-5" /></button></div><video controls autoPlay className="aspect-video w-full bg-black" src={active.url} /></div></div>}
  </main>
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-border bg-card p-4"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div> }
function Empty() { return <div className="rounded-2xl border border-dashed border-border p-12 text-center"><p className="font-medium">No media links discovered</p><p className="mt-2 text-sm text-muted-foreground">The source may require an authorized browser session, or its links are not exposed in the initial page markup.</p></div> }
