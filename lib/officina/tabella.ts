/* La tabella della classe per la dashboard dell'Officina: allievi × compiti del percorso,
 * con fasi, domande al tutor, voto e media; e il CSV per il registro. Funzioni pure,
 * girano nel browser del docente sui dati che arrivano da Firestore in tempo reale. */
import { schedaCompito, SEZIONI } from './compiti';
import { mediaVoti, PERCORSO, percorsoDi, type VoceCompito } from './regole';

export type LavoroVisto = {
  fasi: number;
  consigli: number;
  errori: number;
  finitoAt: Date | null;
  ultimoAt: Date | null;
  codice: Record<string, string>;
  bozza: string;
  tutor: Array<{ fase: number; domanda: string; risposta: string; at: Date | null }>;
  /** Il registro del giudice (fase da 1), se c'è. */
  giudizi?: Array<{ fase: number; verdetto: 'OK' | 'NO' | 'GUASTO'; motivo: string | null; at: Date | null }>;
};

export type AllievoVisto = {
  uid: string;
  nome: string;
  email: string;
  lavori: Record<string, LavoroVisto>;
};

export type RigaTabella = { uid: string; nome: string; email: string; voci: VoceCompito[]; media: number | null };

/** I titoli dei compiti del percorso, nell'ordine. */
export const TITOLI_PERCORSO = PERCORSO.map((id) => ({ id, titolo: schedaCompito(id, 1).titolo }));

/** Le sezioni del percorso con quanti compiti hanno: per raggruppare le colonne della tabella. */
export const SEZIONI_PERCORSO = SEZIONI.filter((s) => s.compiti.length > 0).map((s) => ({ id: s.id, titolo: s.titolo, compiti: s.compiti.length }));

/** Una riga per allievo, in ordine alfabetico, con il percorso e la media. */
export function tabellaClasse(allievi: AllievoVisto[]): RigaTabella[] {
  return [...allievi]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
    .map((a) => {
      const voci = percorsoDi(a.lavori ?? {});
      return { uid: a.uid, nome: a.nome, email: a.email, voci, media: mediaVoti(voci) };
    });
}

/** Il CSV della classe: tre colonne per compito più la media. Punto e virgola per Excel in italiano. */
export function csvClasse(righe: RigaTabella[]): string {
  const pulisci = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const testa = ['Nome', 'Email', ...TITOLI_PERCORSO.flatMap((c) => [`${c.titolo} · fasi`, `${c.titolo} · domande`, `${c.titolo} · voto`]), 'Media'];
  const corpo = righe.map((r) =>
    [pulisci(r.nome), r.email, ...r.voci.flatMap((v) => [v.fasi, v.consigli, v.voto ?? '']), r.media ?? ''].join(';'),
  );
  return [testa.join(';'), ...corpo].join('\n') + '\n';
}
