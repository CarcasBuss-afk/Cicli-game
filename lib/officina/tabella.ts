/* La tabella della classe per la dashboard dell'Officina: allievi × compiti, con fasi,
 * domande al tutor e voto; e il CSV per il registro. Funzioni pure, girano nel browser
 * del docente sui dati che arrivano da Firestore in tempo reale. */
import { FASI_PER_COMPITO, votoLavoro } from './regole';

export type LavoroVisto = {
  fasi: number;
  consigli: number;
  errori: number;
  votoDocente: number | null;
  finitoAt: Date | null;
  ultimoAt: Date | null;
  codice: Record<string, string>;
  bozza: string;
  tutor: Array<{ fase: number; domanda: string; risposta: string; at: Date | null }>;
};

export type AllievoVisto = {
  uid: string;
  nome: string;
  email: string;
  lavori: Record<string, LavoroVisto>;
};

export type CompitoVisto = {
  id: string;
  progetto: string;
  titolo: string;
  scadenzaAt: Date | null;
  ritirato: boolean;
};

export type CellaTabella = {
  compitoId: string;
  /** null se l'allievo non ha mai aperto il compito. */
  lavoro: LavoroVisto | null;
  fasi: number;
  consigli: number;
  finito: boolean;
  scaduto: boolean;
  /** Il voto da mostrare: fissato (finito/scaduto) o proposto in corso d'opera; null se non ha cominciato e non è scaduto. */
  voto: number | null;
  /** Vero se il voto è quello scritto dal docente. */
  aMano: boolean;
};

export type RigaTabella = { uid: string; nome: string; email: string; celle: CellaTabella[] };

function cella(compito: CompitoVisto, lavoro: LavoroVisto | undefined, ora: Date): CellaTabella {
  const fasi = lavoro?.fasi ?? 0;
  const consigli = lavoro?.consigli ?? 0;
  const finito = fasi >= FASI_PER_COMPITO;
  const scaduto = compito.scadenzaAt !== null && ora >= compito.scadenzaAt;
  const aMano = typeof lavoro?.votoDocente === 'number';
  const voto =
    aMano || finito || scaduto || fasi > 0 ? votoLavoro({ fasi, consigli, finito, votoDocente: lavoro?.votoDocente ?? null }) : null;
  return { compitoId: compito.id, lavoro: lavoro ?? null, fasi, consigli, finito, scaduto, voto, aMano };
}

/** Una riga per allievo, in ordine alfabetico, con una cella per compito non ritirato. */
export function tabellaClasse(allievi: AllievoVisto[], compiti: CompitoVisto[], ora = new Date()): RigaTabella[] {
  const attivi = compiti.filter((c) => !c.ritirato);
  return [...allievi]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
    .map((a) => ({ uid: a.uid, nome: a.nome, email: a.email, celle: attivi.map((c) => cella(c, a.lavori?.[c.id], ora)) }));
}

/** Il CSV della classe: una colonna per compito con fasi, domande e voto. Punto e virgola per Excel in italiano. */
export function csvClasse(righe: RigaTabella[], compiti: CompitoVisto[]): string {
  const attivi = compiti.filter((c) => !c.ritirato);
  const pulisci = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const testa = ['Nome', 'Email', ...attivi.flatMap((c) => [`${c.titolo} · fasi`, `${c.titolo} · domande`, `${c.titolo} · voto`])];
  const corpo = righe.map((r) =>
    [pulisci(r.nome), r.email, ...r.celle.flatMap((x) => [x.fasi, x.consigli, x.voto ?? ''])].join(';'),
  );
  return [testa.join(';'), ...corpo].join('\n') + '\n';
}
