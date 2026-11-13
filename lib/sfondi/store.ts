/* Gli sfondi delle feste su Firestore, letti e scritti solo dal server (Admin SDK): nessuna
 * regola nuova nel file condiviso. Collezione propria, separata da quella del sito di
 * Tecnologie Web (webSfondi): i due siti accendono i loro sfondi indipendentemente.
 *
 *   giroSfondi/{id}   { nome, acceso, tipo, peso, dati (i byte dell'immagine), caricatoAt }
 *
 * L'immagine sta nel documento stesso: il browser del docente la riduce prima (formato.ts). */
import 'server-only';
import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';
import { ApiError } from '@/lib/giro/http';
import { idValido, nomeSfondo, PESO_MASSIMO, tipoDaiByte, type TipoImmagine } from './formato';

export const SFONDI = 'giroSfondi';

type SfondoDoc = {
  nome: string;
  acceso: boolean;
  tipo: TipoImmagine;
  peso: number;
  dati: Buffer;
  caricatoAt: Timestamp;
};

const sfondiRef = () => getDb().collection(SFONDI);

/** I campi dell'elenco: senza i byte, che restano nel documento. */
const CAMPI_ELENCO = ['nome', 'acceso', 'tipo', 'peso', 'caricatoAt'] as const;

/** Gli id degli sfondi accesi, per il sito. */
export async function sfondiAccesi(): Promise<string[]> {
  const snap = await sfondiRef().where('acceso', '==', true).select().get();
  return snap.docs.map((d) => d.id);
}

/** L'immagine di uno sfondo; null se non c'è. */
export async function immagineSfondo(id: string): Promise<{ tipo: TipoImmagine; dati: Buffer } | null> {
  if (!idValido(id)) return null;
  const d = (await sfondiRef().doc(id).get()).data() as SfondoDoc | undefined;
  return d ? { tipo: d.tipo, dati: Buffer.from(d.dati) } : null;
}

/* ------------------------------------------------------------- per il docente */

/** Tutti gli sfondi, dal più recente: per la pagina del docente. */
export async function elencoSfondi() {
  const snap = await sfondiRef()
    .select(...CAMPI_ELENCO)
    .get();
  return {
    sfondi: snap.docs
      .map((d) => {
        const s = d.data() as Omit<SfondoDoc, 'dati'>;
        return { id: d.id, nome: s.nome, acceso: Boolean(s.acceso), peso: s.peso ?? 0, caricatoAt: s.caricatoAt?.toMillis() ?? 0 };
      })
      .sort((a, b) => b.caricatoAt - a.caricatoAt),
  };
}

const refSfondo = (body: Record<string, unknown>) => {
  if (!idValido(body.id)) throw new ApiError(400, 'INVALID_BODY', 'Manca lo sfondo');
  return sfondiRef().doc(body.id);
};

/** Un'immagine nuova, in base64: si controlla dai byte che sia davvero un'immagine. Appena caricata è accesa. */
export async function caricaSfondo(body: Record<string, unknown>) {
  const base64 = typeof body.immagine === 'string' ? body.immagine.replace(/^data:[^,]*,/, '') : '';
  const dati = Buffer.from(base64, 'base64');
  if (dati.length === 0) throw new ApiError(400, 'INVALID_BODY', "Manca l'immagine");
  if (dati.length > PESO_MASSIMO) {
    throw new ApiError(413, 'TROPPO_GRANDE', `L'immagine pesa ${Math.round(dati.length / 1000)} kB: il massimo è ${PESO_MASSIMO / 1000} kB`);
  }
  const tipo = tipoDaiByte(dati);
  if (!tipo) throw new ApiError(400, 'NON_IMMAGINE', 'Il file non è un’immagine WebP, JPEG o PNG');
  const ref = await sfondiRef().add({
    nome: nomeSfondo(body.nome),
    acceso: body.acceso !== false,
    tipo,
    peso: dati.length,
    dati,
    caricatoAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

/** Accende o spegne uno sfondo. */
export async function accendiSfondo(body: Record<string, unknown>) {
  const ref = refSfondo(body);
  if (!(await ref.get()).exists) throw new ApiError(404, 'SFONDO_NON_TROVATO', 'Sfondo inesistente');
  const acceso = body.acceso === true;
  await ref.update({ acceso });
  return { ok: true, acceso };
}

/** Toglie uno sfondo per sempre. */
export async function eliminaSfondo(body: Record<string, unknown>) {
  await refSfondo(body).delete();
  return { ok: true };
}
