// MEDIDOR DE DESEMPENHO: o jogo corre sozinho (piloto automático) passando por trechos, noite e todos os poderes e
// registra o tempo de cada quadro (update + draw) e o que foi criado nele (cópias coloridas/desfocadas/noite).
// Meta: nenhum quadro acima de 33 ms durante a corrida (o 1º quadro depois de JOGAR não conta).
// uso: node medir-desempenho.js <playwright-core> <headless_shell> [segundos=60] [distância inicial=38000]
const { chromium } = require(process.argv[2]); const SECS = +process.argv[4] || 60, D0 = +process.argv[5] || 38000, LIMITE = 33;
(async () => {
  const b = await chromium.launch({ executablePath: process.argv[3] });
  const c = await b.newContext({ viewport: { width: 960, height: 360 } });
  await c.addInitScript(() => { localStorage.setItem('jabotiRunTutorial', '1');
    localStorage.setItem('jabotiRunLoja', JSON.stringify({ carteira: 0, tem: ['chapeu'], cor: 'classico', acc: 'chapeu', loc: 'pe', rastro: '' })); });
  const p = await c.newPage(); p.on('pageerror', e => console.log('ERRO:', e.message));
  await p.goto('http://localhost:8765/arcade/_perf.html?app');
  await p.waitForFunction(() => window.__g && __g.ready, null, { timeout: 20000 }); await p.waitForTimeout(4000);   // tempo normal no menu
  console.log('tarefas pendentes ao começar:', await p.evaluate(() => __g.jobs));
  await p.evaluate(D0 => { window.__nodie = true; __g.start(); __g.setDist(D0); window.__log = []; window.__ctx = [];
    let release = 0, trick = 0, n = 0;
    setInterval(() => { const g = __g, pl = g.player, PX = g.PX; let duck = false; n++;
      if (release && --release === 0) g.setHold(false);
      for (const o of g.obstacles) { const d = o.x - PX;
        if ((o.kind === 'hang' || o.kind === 'drone') && d < 190 && d + o.w > -40) duck = true;
        if ((o.kind === 'crate' || o.kind === 'bin' || o.kind === 'prop') && d > 30 && d < 125 && pl.ground && !trick) { g.setHold(true); g.pressJump(); release = 7; trick = 8; } }
      if (trick && --trick === 0 && !pl.ground) g.pressJump();
      g.setDuck(duck);
      if (n % 300 === 40) g.activate(['escudo', 'turbo', 'ima', 'lento', 'dobro', 'pulo'][(n / 300 | 0) % 6], 300, 200);
      if (n % 700 === 350) g.activate('lata', 300, 200);
      if (n % 30 === 0) __ctx.push([__log.length, Math.round(g.dist), +g.dark.toFixed(2), Object.entries(g.bw).filter(e => e[1] > .01).map(e => e[0]).join('+')]);
    }, 33); }, D0);
  await p.waitForTimeout(SECS * 1000);
  const r = await p.evaluate(() => ({ log: __log.slice(1), ctx: __ctx }));
  const tot = r.log.map(x => x[0] + x[1]).sort((a, b) => a - b), q = f => tot[Math.min(tot.length - 1, Math.floor(tot.length * f))].toFixed(1);
  console.log(`quadros ${tot.length} | mediana ${q(.5)} ms | 95% ${q(.95)} ms | 99% ${q(.99)} ms | pior ${tot[tot.length - 1].toFixed(1)} ms`);
  const at = i => { let best = r.ctx[0] || []; for (const x of r.ctx) if (x[0] <= i) best = x; return best; };
  const lentos = r.log.map((x, i) => [i, x]).filter(([, x]) => x[0] + x[1] > LIMITE);
  lentos.forEach(([i, x]) => console.log(`  LENTO ${(x[0] + x[1]).toFixed(1)} ms (quadro ${i}) ${x[2] || '-'} | dist ${at(i)[1]} noite ${at(i)[2]} ${at(i)[3]}`));
  console.log(lentos.length ? `✗ ${lentos.length} quadro(s) acima de ${LIMITE} ms` : `✓ nenhum quadro acima de ${LIMITE} ms`);
  await b.close(); process.exit(lentos.length ? 1 : 0);
})();
