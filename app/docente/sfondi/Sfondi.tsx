'use client';
/* Gli sfondi delle feste, per il docente: caricarne uno nuovo, accenderli e spegnerli quando
 * vuole, toglierli. Quelli accesi compaiono nelle pagine senza esercizio (ingresso, ingresso del
 * Giro, attese della gara, accesso ed elenco dell'Officina), uno a caso per visita. Prima di
 * caricarla, il browser riduce l'immagine (lato lungo 1920 px, WebP) così sta sotto il peso
 * massimo. Sono separati da quelli del sito di Tecnologie Web. */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LATO_MASSIMO, PESO_MASSIMO } from '@/lib/sfondi/formato';
import { Accesso } from '../Accesso';
import { chiamaDocente } from '../api';
import { useDocente } from '../useDocente';

type Sfondo = { id: string; nome: string; acceso: boolean; peso: number; caricatoAt: number };

const testo = (e: unknown) => (e instanceof Error && e.message ? e.message : String(e));

/** L'immagine ridotta e compressa, come data URL: WebP se il browser lo sa scrivere, se no JPEG. */
async function riduci(file: File): Promise<{ dataUrl: string; peso: number }> {
  const bitmap = await createImageBitmap(file);
  const scala = Math.min(1, LATO_MASSIMO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scala);
  canvas.height = Math.round(bitmap.height * scala);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const comeBlob = (tipo: string, qualita: number) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, qualita));
  for (const qualita of [0.85, 0.75, 0.65, 0.5]) {
    let blob = await comeBlob('image/webp', qualita);
    if (blob && blob.type !== 'image/webp') blob = await comeBlob('image/jpeg', qualita);
    if (blob && blob.size <= PESO_MASSIMO) {
      const dataUrl = await new Promise<string>((ok, ko) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result));
        r.onerror = () => ko(new Error('Lettura del file non riuscita'));
        r.readAsDataURL(blob);
      });
      return { dataUrl, peso: blob.size };
    }
  }
  throw new Error('L’immagine resta troppo pesante anche compressa: prova con un’altra');
}

const kB = (byte: number) => `${Math.round(byte / 1000)} kB`;

export function Sfondi() {
  const { stato, messaggio, accediGoogle, accediProva, esci, utente } = useDocente();
  const [sfondi, setSfondi] = useState<Sfondo[] | null>(null);
  const [nome, setNome] = useState('');
  const [anteprima, setAnteprima] = useState<{ dataUrl: string; peso: number } | null>(null);
  const [errore, setErrore] = useState('');
  const [occupato, setOccupato] = useState(false);

  const carica = useCallback(async () => {
    try {
      setSfondi((await chiamaDocente<{ sfondi: Sfondo[] }>('sfondi', { azione: 'elenco' })).sfondi);
    } catch (e) {
      setErrore(testo(e));
    }
  }, []);

  useEffect(() => {
    if (stato === 'ok') void carica();
  }, [stato, carica]);

  async function scegliFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setErrore('');
    setAnteprima(null);
    if (!file) return;
    if (!nome.trim()) setNome(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    try {
      setAnteprima(await riduci(file));
    } catch (err) {
      setErrore(err instanceof Error && err.message ? err.message : 'Questo file non si apre come immagine');
    }
  }

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!anteprima) return;
    const form = e.currentTarget;
    setOccupato(true);
    setErrore('');
    try {
      await chiamaDocente('sfondi', { azione: 'carica', nome, immagine: anteprima.dataUrl });
      setNome('');
      setAnteprima(null);
      form.reset();
      await carica();
    } catch (err) {
      setErrore(testo(err));
    } finally {
      setOccupato(false);
    }
  }

  async function azione(nomeAzione: 'accendi' | 'elimina', dati: Record<string, unknown>) {
    setErrore('');
    try {
      await chiamaDocente('sfondi', { azione: nomeAzione, ...dati });
      await carica();
    } catch (err) {
      setErrore(testo(err));
    }
  }

  if (stato !== 'ok') {
    return <Accesso stato={stato} messaggio={messaggio} accediGoogle={accediGoogle} accediProva={accediProva} />;
  }

  const accesi = sfondi?.filter((s) => s.acceso).length ?? 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-(--color-rosa)">🎄 Gli sfondi delle feste</h1>
          <p className="max-w-2xl text-sm text-(--color-testo-tenue)">
            Gli sfondi accesi compaiono dove non c&apos;è un esercizio: l&apos;ingresso, l&apos;ingresso del Giro, le attese fra una tappa e l&apos;altra, l&apos;accesso e
            l&apos;elenco dei compiti dell&apos;Officina. Uno a caso per visita. Dentro i chilometri, nei compiti e sulla LIM no. Dopo averne acceso o spento uno, il sito
            si aggiorna in un minuto circa.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-(--color-testo-tenue)">
          <Link href="/docente" className="underline">
            le gare del Giro
          </Link>
          <Link href="/docente/officina" className="underline">
            l&apos;Officina
          </Link>
          <span>{utente?.email}</span>
          <button onClick={esci} className="underline">
            esci
          </button>
        </div>
      </header>

      <form onSubmit={invia} className="flex flex-col gap-3 rounded-xl border border-(--color-bordo) bg-(--color-fondo-card) p-5">
        <p className="font-bold">Carica un nuovo sfondo</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Immagine (JPEG, PNG o WebP, orizzontale)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void scegliFile(e)}
              className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-(--color-rosa) file:px-3 file:py-2 file:font-bold file:text-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Natale sulla neve"
              maxLength={60}
              className="w-64 rounded-lg border border-(--color-bordo) bg-black/30 px-3 py-2 outline-none focus:border-(--color-rosa)"
            />
          </label>
          <button type="submit" disabled={occupato || !anteprima} className="rounded-lg bg-(--color-rosa) px-5 py-2.5 font-bold text-white hover:brightness-110 disabled:opacity-40">
            {occupato ? 'Carico…' : 'Carica e accendi'}
          </button>
        </div>
        {anteprima && (
          <figure className="flex flex-col gap-1">
            <img src={anteprima.dataUrl} alt="anteprima dello sfondo" className="aspect-video w-full max-w-md rounded-lg object-cover" />
            <figcaption className="text-xs text-(--color-testo-tenue)">Ridotta e compressa: {kB(anteprima.peso)}</figcaption>
          </figure>
        )}
      </form>

      {errore && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">
          {errore}
        </p>
      )}

      <section className="flex flex-col gap-3" aria-label="sfondi">
        <p className="text-sm text-(--color-testo-tenue)">
          {sfondi === null
            ? 'Un attimo…'
            : sfondi.length === 0
              ? 'Nessuno sfondo: caricane uno qui sopra.'
              : accesi === 0
                ? 'Tutti spenti: il sito ha l’aspetto di sempre.'
                : `${accesi} ${accesi === 1 ? 'acceso' : 'accesi'}.`}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {sfondi?.map((s) => (
            <article key={s.id} className={`flex flex-col gap-3 rounded-xl border bg-(--color-fondo-card) p-3 ${s.acceso ? 'border-(--color-verde)' : 'border-(--color-bordo)'}`}>
              <img src={`/api/sfondi/${s.id}`} alt={s.nome} loading="lazy" className={`aspect-video w-full rounded-lg object-cover ${s.acceso ? '' : 'opacity-50 grayscale'}`} />
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{s.nome}</p>
                  <p className="text-xs text-(--color-testo-tenue)">
                    {kB(s.peso)}
                    {s.caricatoAt > 0 && ` · caricato il ${new Date(s.caricatoAt).toLocaleDateString('it-IT')}`}
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={s.acceso}
                  aria-label={`${s.nome}: ${s.acceso ? 'acceso' : 'spento'}`}
                  onClick={() => void azione('accendi', { id: s.id, acceso: !s.acceso })}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold ${s.acceso ? 'bg-(--color-verde) text-black' : 'border border-(--color-bordo) text-(--color-testo-tenue) hover:border-(--color-verde)'}`}
                >
                  {s.acceso ? '● Acceso' : '○ Spento'}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Togliere per sempre lo sfondo «${s.nome}»? Per nasconderlo e basta, spegnilo.`)) void azione('elimina', { id: s.id });
                  }}
                  className="text-sm text-(--color-testo-tenue) underline hover:text-red-300"
                >
                  elimina
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
