'use client'

import { useState } from 'react'
import { Check, FileDown, Link2, MessageSquare, Play, Radio, Save, Settings2, UploadCloud } from 'lucide-react'

type Config = { token: string; channels: string; webhookName: string; webhookAvatar: string; concurrency: string; splitSize: string }

const initial: Config = { token: '', channels: '', webhookName: 'Archive Courier', webhookAvatar: '', concurrency: '8', splitSize: '10' }

export default function Page() {
  const [config, setConfig] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [test, setTest] = useState<'idle' | 'working' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [source, setSource] = useState('https://bunkr.cr/a/ZRRy6S9v')

  const update = (key: keyof Config, value: string) => setConfig((current) => ({ ...current, [key]: value }))

  async function saveConfig() {
    setSaved(false); setMessage('')
    const response = await fetch('/api/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config) })
    const data = await response.json()
    setSaved(response.ok); setMessage(data.message || data.error || '')
  }

  async function testConnection() {
    setTest('working'); setMessage('')
    const response = await fetch('/api/discord/test', { method: 'POST' })
    const data = await response.json()
    setTest(response.ok ? 'success' : 'error'); setMessage(data.message || data.error || '')
  }

  return <main className="min-h-screen bg-background text-foreground paper-grain"><header className="border-b border-border/80"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6"><div className="flex items-center gap-4"><div className="flex size-11 items-center justify-center rounded-sm border-2 border-primary bg-primary/10"><FileDown className="size-5" /></div><div><p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Private transfer desk</p><h1 className="font-serif text-2xl font-semibold tracking-tight">Courier Ledger</h1></div></div><div className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><span className="size-2 rounded-full bg-primary" /> local session</div></div></header>
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.1fr_.9fr]"><section><p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Bunkr → Discord</p><h2 className="mt-3 max-w-xl font-serif text-5xl leading-[1.05] tracking-tight">A quiet handoff for a noisy archive.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">Download, verify, split oversized videos, and post them as ordinary Discord video attachments. The queue keeps a durable done list so a stopped run resumes where it left off.</p><div className="mt-8 grid gap-3 sm:grid-cols-3"><Metric icon={Link2} title="Source" value="2,528 files" /><Metric icon={UploadCloud} title="Delivery" value="3 channels" /><Metric icon={Radio} title="Queue" value="Resumable" /></div><div className="mt-8 border-y border-border py-5"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Workflow status</p><p className="mt-1 font-serif text-xl">Ready to configure</p></div><span className="border border-primary px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">Idle</span></div><div className="mt-5 h-2 bg-muted"><div className="h-full w-[3%] bg-primary" /></div><div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground"><span>0 complete</span><span>0 active</span><span>2,528 total</span></div></div></section>
      <section className="border border-border bg-card p-6 shadow-[5px_5px_0_var(--color-border)]"><div className="flex items-center justify-between border-b border-border pb-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Operator settings</p><h3 className="mt-1 font-serif text-2xl">Configure the desk</h3></div><Settings2 className="size-5 text-muted-foreground" /></div><div className="flex flex-col gap-5 pt-5"><Field label="Bot token" value={config.token} placeholder="Paste token — stored server-side" type="password" onChange={(v) => update('token', v)} /><Field label="Source collection" value={source} placeholder="Album URL" onChange={setSource} /><Field label="Destination channel IDs" value={config.channels} placeholder="One or more IDs, comma separated" onChange={(v) => update('channels', v)} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Parallel downloads" value={config.concurrency} onChange={(v) => update('concurrency', v)} type="number" /><Field label="Split size (MB)" value={config.splitSize} onChange={(v) => update('splitSize', v)} type="number" /></div><div className="border-t border-border pt-5"><p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Webhook appearance</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Name" value={config.webhookName} onChange={(v) => update('webhookName', v)} /><Field label="Avatar URL" value={config.webhookAvatar} placeholder="Optional" onChange={(v) => update('webhookAvatar', v)} /></div></div><div className="flex flex-wrap gap-3 pt-2"><button onClick={saveConfig} className="inline-flex items-center gap-2 border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"><Save className="size-4" /> {saved ? 'Saved' : 'Save securely'}</button><button onClick={testConnection} disabled={test === 'working'} className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-sm font-medium disabled:opacity-50"><Play className="size-4" /> {test === 'working' ? 'Testing…' : 'Test Discord message'}</button></div>{message && <p className={`border px-3 py-2 text-sm ${test === 'error' ? 'border-destructive text-destructive' : 'border-primary text-primary'}`}>{message}</p>}</div></section></div><footer className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 border-t border-border px-6 py-5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"><span>Tokens never enter client storage</span><span>Normal video attachments</span><span>ffmpeg split + dedupe</span></footer></main>
}
function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) { return <label className="flex flex-col gap-2"><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span><input className="border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label> }
function Metric({ icon: Icon, title, value }: { icon: typeof Link2; title: string; value: string }) { return <div className="border border-border bg-card p-4"><Icon className="size-4 text-primary" /><p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p><p className="mt-1 font-serif text-lg">{value}</p></div> }
