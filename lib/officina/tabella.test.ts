import { describe, expect, it } from 'vitest';
import { PERCORSO } from './regole';
import { csvClasse, tabellaClasse, TITOLI_PERCORSO, type AllievoVisto, type LavoroVisto } from './tabella';

const lavoro = (fasi: number, consigli: number): LavoroVisto => ({
  fasi,
  consigli,
  errori: 0,
  finitoAt: null,
  ultimoAt: null,
  codice: {},
  bozza: '',
  tutor: [],
});

const [primo, secondo] = PERCORSO;

const classe: AllievoVisto[] = [
  { uid: 'u2', nome: 'Marco', email: 'marco@scuola.it', lavori: { [primo]: lavoro(5, 2), [secondo]: lavoro(2, 0) } },
  { uid: 'u1', nome: 'Anna', email: 'anna@scuola.it', lavori: { [primo]: lavoro(5, 0), [secondo]: lavoro(5, 3) } },
  { uid: 'u3', nome: 'Zoe', email: 'zoe@scuola.it', lavori: {} },
];

describe('la tabella della classe', () => {
  const righe = tabellaClasse(classe);

  it('allievi in ordine, una voce per compito del percorso, con la media', () => {
    expect(righe.map((r) => r.nome)).toEqual(['Anna', 'Marco', 'Zoe']);
    expect(righe[0].voci).toHaveLength(PERCORSO.length);
    expect(righe[0].media).toBe(8.5); // 10 e 7
    expect(righe[1].media).toBe(8); // solo il primo è finito
    expect(righe[2].media).toBeNull();
  });

  it('gli stati: finito, in corso, bloccato, da cominciare', () => {
    const [anna, marco, zoe] = righe;
    expect(marco.voci[0]).toMatchObject({ stato: 'finito', voto: 8 });
    expect(marco.voci[1]).toMatchObject({ stato: 'in-corso', fasi: 2, voto: null });
    expect(anna.voci[2]?.stato ?? 'da-cominciare').toBe('da-cominciare');
    expect(zoe.voci[0].stato).toBe('da-cominciare');
    expect(zoe.voci[1].stato).toBe('bloccato');
  });

  it('il CSV ha tre colonne per compito e la media in fondo', () => {
    const csv = csvClasse(righe);
    const [testa, anna] = csv.trim().split('\n');
    expect(testa.startsWith(`Nome;Email;${TITOLI_PERCORSO[0].titolo} · fasi;${TITOLI_PERCORSO[0].titolo} · domande;${TITOLI_PERCORSO[0].titolo} · voto;`)).toBe(true);
    expect(testa.endsWith(';Media')).toBe(true);
    expect(anna.startsWith('Anna;anna@scuola.it;5;0;10;5;3;7;')).toBe(true);
    expect(anna.endsWith(';8.5')).toBe(true);
  });
});
