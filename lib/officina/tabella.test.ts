import { describe, expect, it } from 'vitest';
import { csvClasse, tabellaClasse, type AllievoVisto, type CompitoVisto, type LavoroVisto } from './tabella';

const lavoro = (fasi: number, consigli: number, votoDocente: number | null = null): LavoroVisto => ({
  fasi,
  consigli,
  errori: 0,
  votoDocente,
  finitoAt: null,
  ultimoAt: null,
  codice: {},
  bozza: '',
  tutor: [],
});

const compiti: CompitoVisto[] = [
  { id: 'c1', progetto: 'salvadanaio', titolo: 'Il salvadanaio', scadenzaAt: null, ritirato: false },
  { id: 'c2', progetto: 'allenamento', titolo: "La tabella d'allenamento", scadenzaAt: new Date(2020, 0, 1), ritirato: false },
  { id: 'c3', progetto: 'salvadanaio', titolo: 'Ritirato', scadenzaAt: null, ritirato: true },
];

const classe: AllievoVisto[] = [
  { uid: 'u2', nome: 'Marco', email: 'marco@scuola.it', lavori: { c1: lavoro(5, 2), c2: lavoro(2, 0) } },
  { uid: 'u1', nome: 'Anna', email: 'anna@scuola.it', lavori: { c1: lavoro(3, 1, 7) } },
  { uid: 'u3', nome: 'Zoe', email: 'zoe@scuola.it', lavori: {} },
];

describe('la tabella della classe', () => {
  const righe = tabellaClasse(classe, compiti, new Date(2026, 9, 21));

  it('allievi in ordine, una cella per compito non ritirato', () => {
    expect(righe.map((r) => r.nome)).toEqual(['Anna', 'Marco', 'Zoe']);
    expect(righe[0].celle.map((c) => c.compitoId)).toEqual(['c1', 'c2']);
  });

  it('il voto: finito, in corso, a mano, scaduto, mai cominciato', () => {
    const [anna, marco, zoe] = righe;
    expect(marco.celle[0]).toMatchObject({ fasi: 5, consigli: 2, finito: true, voto: 8, aMano: false });
    expect(marco.celle[1]).toMatchObject({ fasi: 2, scaduto: true, voto: 4 });
    expect(anna.celle[0]).toMatchObject({ fasi: 3, voto: 7, aMano: true });
    // Non cominciato e non scaduto: niente voto. Non cominciato e scaduto: il pavimento.
    expect(zoe.celle[0]).toMatchObject({ lavoro: null, voto: null });
    expect(zoe.celle[1]).toMatchObject({ lavoro: null, scaduto: true, voto: 2 });
  });

  it('il CSV ha tre colonne per compito', () => {
    const csv = csvClasse(righe, compiti);
    const [testa, anna] = csv.trim().split('\n');
    expect(testa).toBe("Nome;Email;Il salvadanaio · fasi;Il salvadanaio · domande;Il salvadanaio · voto;La tabella d'allenamento · fasi;La tabella d'allenamento · domande;La tabella d'allenamento · voto");
    expect(anna).toBe('Anna;anna@scuola.it;3;1;7;0;0;2');
  });
});
