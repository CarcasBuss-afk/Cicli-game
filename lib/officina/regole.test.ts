import { describe, expect, it } from 'vitest';
import { SEZIONI } from './compiti';
import { dominiAmmessi, emailAmmessa, mediaVoti, PERCORSO, percorsoDi, semeDa, votoLavoro } from './regole';

describe('il seme per allievo', () => {
  it('è stabile e cambia con uid e compito', () => {
    expect(semeDa('uid1|c1')).toBe(semeDa('uid1|c1'));
    expect(semeDa('uid1|c1')).not.toBe(semeDa('uid2|c1'));
    expect(semeDa('uid1|c1')).not.toBe(semeDa('uid1|c2'));
    expect(semeDa('')).toBeGreaterThan(0);
  });
});

describe('il voto del compito', () => {
  it('solo a compito finito: 10 meno mezzo punto a domanda, mai sotto 5', () => {
    expect(votoLavoro({ fasi: 5, consigli: 0 })).toBe(10);
    expect(votoLavoro({ fasi: 5, consigli: 7 })).toBe(6.5);
    expect(votoLavoro({ fasi: 5, consigli: 30 })).toBe(5);
    expect(votoLavoro({ fasi: 3, consigli: 1 })).toBeNull();
  });
});

describe('il percorso', () => {
  it('il primo compito di ogni sezione è aperto, gli altri si sbloccano uno alla volta', () => {
    const vuoto = percorsoDi({});
    const primi = SEZIONI.map((s) => s.compiti[0]);
    expect(vuoto.filter((v) => v.stato === 'da-cominciare').map((v) => v.id)).toEqual(primi);
    expect(vuoto.filter((v) => !primi.includes(v.id)).every((v) => v.stato === 'bloccato')).toBe(true);

    expect(percorsoDi({}, 5, true).every((v) => v.stato === 'da-cominciare')).toBe(true);
    const aMeta = percorsoDi({ [PERCORSO[0]]: { fasi: 5, consigli: 2 }, [PERCORSO[1]]: { fasi: 2, consigli: 0 } });
    expect(aMeta[0]).toMatchObject({ stato: 'finito', voto: 9 });
    expect(aMeta[1]).toMatchObject({ stato: 'in-corso', fasi: 2, voto: null });
    expect(aMeta[2].stato).toBe('bloccato');
  });

  it('un compito finito sblocca il seguente anche se quello dopo ancora è vuoto', () => {
    const p = percorsoDi({ [PERCORSO[0]]: { fasi: 5, consigli: 0 } });
    expect(p[1].stato).toBe('da-cominciare');
  });

  it('il while si apre senza i for, e dentro la sezione resta uno alla volta', () => {
    const [timer, secondo, terzo] = SEZIONI[1].compiti;
    const stato = (p: ReturnType<typeof percorsoDi>, id: string) => p.find((v) => v.id === id)?.stato;

    const senzaFor = percorsoDi({});
    expect(stato(senzaFor, timer)).toBe('da-cominciare');
    expect(stato(senzaFor, secondo)).toBe('bloccato');

    const timerFinito = percorsoDi({ [timer]: { fasi: 5, consigli: 0 } });
    expect(stato(timerFinito, secondo)).toBe('da-cominciare');
    expect(stato(timerFinito, terzo)).toBe('bloccato');
    // I for restano in ordine anche per chi è andato avanti sul while.
    expect(stato(timerFinito, PERCORSO[1])).toBe('bloccato');
  });
});

describe('la media', () => {
  it('conta solo i compiti finiti, con un decimale', () => {
    expect(mediaVoti([{ voto: 10 }, { voto: 7 }, { voto: null }])).toBe(8.5);
    expect(mediaVoti([{ voto: 10 }, { voto: 9 }, { voto: 9 }])).toBe(9.3);
    expect(mediaVoti([{ voto: null }])).toBeNull();
  });
});

describe('il dominio della scuola', () => {
  it('senza dominio configurato entrano tutti', () => {
    expect(dominiAmmessi(undefined)).toEqual([]);
    expect(emailAmmessa('chiunque@gmail.com', [])).toBe(true);
  });
  it('con il dominio entra solo la scuola, anche con più domini e la chiocciola', () => {
    const domini = dominiAmmessi(' @ciacdidattica.it, Alunni.Scuola.it ');
    expect(domini).toEqual(['ciacdidattica.it', 'alunni.scuola.it']);
    expect(emailAmmessa('Luca.Rossi@CiacDidattica.it', domini)).toBe(true);
    expect(emailAmmessa('luca@gmail.com', domini)).toBe(false);
  });
});
