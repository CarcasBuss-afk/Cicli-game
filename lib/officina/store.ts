/* Modello dati dell'Officina su Firestore (collezioni con prefisso `officina`, separate
 * dal Giro). Scritto solo dal server; il docente lo legge in tempo reale con il claim
 * `teacher`, gli allievi passano dalle API.
 *
 *   officinaClassi/{classeId}                 una classe (serve solo a raggruppare gli allievi)
 *   officinaClassi/{classeId}/allievi/{uid}   l'allievo nella classe, con i suoi lavori (chiave = progetto)
 *   officinaAllievi/{uid}                     a quali classi appartiene (per ritrovarle senza query di gruppo)
 */
import 'server-only';
import type { DocumentReference, Timestamp } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebaseAdmin';

export type ClasseDoc = {
  nome: string;
  docenteUid: string;
  docenteEmail: string;
  createdAt: Timestamp;
  chiusa: boolean;
};

/** Una domanda al tutor e la sua risposta. */
export type ScambioDoc = {
  /** Fase (0-based) in cui è stata fatta. */
  fase: number;
  domanda: string;
  risposta: string;
  at: Timestamp;
};

/** Il lavoro di un allievo su un compito (chiave = id del progetto). */
export type LavoroDoc = {
  /** Fasi completate. */
  fasi: number;
  fasiAt: Record<string, Timestamp>;
  /** Il codice promosso a ogni fase (chiave = indice). */
  codice: Record<string, string>;
  /** L'ultimo codice consegnato, giusto o no: alla riapertura l'editor riparte da qui. */
  bozza: string;
  errori: number;
  erroriFase: Record<string, number>;
  consigli: number;
  tutor: ScambioDoc[];
  finitoAt: Timestamp | null;
  ultimoAt: Timestamp | null;
};

export type AllievoOfficinaDoc = {
  uid: string;
  nome: string;
  email: string;
  entratoAt: Timestamp;
  lavori: Record<string, LavoroDoc>;
};

export type AppartenenzaDoc = {
  nome: string;
  email: string;
  classi: string[];
};

export const CLASSI = 'officinaClassi';
export const ALLIEVI = 'allievi';
export const APPARTENENZE = 'officinaAllievi';

export const classiRef = () => getDb().collection(CLASSI);
export const allieviRef = (classeId: string) => classiRef().doc(classeId).collection(ALLIEVI);
export const appartenenzeRef = () => getDb().collection(APPARTENENZE);

export type ClasseLetta = { id: string; ref: DocumentReference; dati: ClasseDoc };

export const ms = (t: Timestamp | null | undefined): number | null => (t ? t.toMillis() : null);

export function lavoroVuoto(): LavoroDoc {
  return {
    fasi: 0,
    fasiAt: {},
    codice: {},
    bozza: '',
    errori: 0,
    erroriFase: {},
    consigli: 0,
    tutor: [],
    finitoAt: null,
    ultimoAt: null,
  };
}
