// BATERIA DE PRINTS antes de publicar: tira prints das combinações que já deram problema (trecho × dia/noite, veículos,
// acessório, pulo alto com poderes = câmera descendo, menus) e confere sozinho se algum botão dos menus encosta em
// outro ou sai da tela. Grava os prints em <saida>/ e o relatório em <saida>/relatorio.json.
// Rodar pelo ferramentas/conferir-antes-de-publicar.sh (gera o _perf.html, sobe o servidor e monta a folha).
// uso: node bateria-prints.js <playwright-core> <headless_shell> <saida>
const { chromium } = require(process.argv[2]); const out = process.argv[4]; const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: process.argv[3] });
  const c = await b.newContext({ viewport: { width: 960, height: 360 }, deviceScaleFactor: 1 });
  await c.addInitScript(() => { localStorage.setItem('jabotiRunTutorial', '1');
    localStorage.setItem('jabotiRunLoja', JSON.stringify({ carteira: 900, tem: ['skate', 'bone', 'chapeu', 'sh_neon'], cor: 'classico', acc: '', loc: 'pe', rastro: '' })); });
  const pedidas = new Set(); c.on('request', r => { const m = r.url().match(/\/arcade\/(assets\/[^?]+)/); if (m) pedidas.add(decodeURIComponent(m[1])); });
  const p = await c.newPage(); const erros = [];
  p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await p.goto('http://localhost:8765/arcade/_perf.html?app');
  await p.waitForFunction(() => window.__g && __g.ready, null, { timeout: 20000 }); await p.waitForTimeout(3500);   // menu prepara cores/cópias
  const shots = [], rel = { erros, botoes: [] };
  const shot = async nome => { const f = `${out}/${String(shots.length).padStart(2, '0')}-${nome}.png`; await p.screenshot({ path: f }); shots.push(f); };
  const limpa = () => p.evaluate(() => { __g.obstacles.length = 0; });
  const correr = async (o) => {
    await p.evaluate(o => { window.__nodie = true; __g.setLoc(o.loc || 'pe'); __g.setAcc(o.acc || ''); __g.start(); __g.setDist(o.d); __g.setCiclo(o.ciclo); __g.obstacles.length = 0; }, o);
    for (let i = 0; i < 12; i++) { await p.waitForTimeout(100); await limpa(); }
  };
  // ---- trechos de dia e de noite ----
  const TRECHOS = [['campo', 6000], ['athenas', 26000], ['cidade', 46000], ['fabrica', 66000]];
  for (const [n, d] of TRECHOS) for (const [h, ciclo] of [['dia', .15], ['noite', .66]]) { await correr({ d, ciclo }); await shot(`${n}-${h}`); }
  // ---- veículos e acessórios ----
  for (const o of [{ n: 'skate-cidade', loc: 'skate', d: 46000, ciclo: .2 }, { n: 'skate-fabrica-noite', loc: 'skate', d: 66000, ciclo: .66 },
    { n: 'chapeu-skate', loc: 'skate', acc: 'chapeu', d: 26000, ciclo: .25 }, { n: 'bone-ape', acc: 'bone', d: 6000, ciclo: .1 }]) { await correr(o); await shot(o.n); }
  // ---- pulo alto com 4 poderes (câmera desce; ícones e barrinhas em cima da cabeça) ----
  for (const o of [{ n: 'pulo-poderes-fabrica', d: 66000, ciclo: .15 }, { n: 'pulo-poderes-skate-noite', loc: 'skate', d: 46000, ciclo: .66 }]) {
    await correr(o);
    const pod = () => p.evaluate(() => { __g.obstacles.length = 0; ['turbo', 'escudo', 'ima', 'pulo'].forEach(k => __g.skills[k] = 9); });
    await pod(); await p.waitForTimeout(500); await pod();
    await p.evaluate(() => { __g.setHold(true); __g.pressJump(); }); await p.waitForTimeout(220); await pod();
    await p.evaluate(() => __g.pressJump()); await p.waitForTimeout(200); await pod(); await p.evaluate(() => __g.pressJump());
    await p.waitForTimeout(260); await pod(); await shot(o.n);
    await p.evaluate(() => __g.setHold(false)); await p.waitForTimeout(1200);
  }
  // ---- menus (prints + conferência dos botões) ----
  const confere = async nome => {
    const r = await p.evaluate(() => ({ bs: __g.menuButtons.map(b => ({ ...b })), W: __g.W, H: __g.H }));
    const prob = [];
    r.bs.forEach((a, i) => {
      if (a.x < -1 || a.y < -1 || a.x + a.w > r.W + 1 || a.y + a.h > r.H + 1) prob.push(`${a.id} sai da tela`);
      r.bs.slice(i + 1).forEach(q => {
        const ox = Math.min(a.x + a.w, q.x + q.w) - Math.max(a.x, q.x), oy = Math.min(a.y + a.h, q.y + q.h) - Math.max(a.y, q.y);
        if (ox > 1 && oy > 1) prob.push(`${a.id} encosta em ${q.id} (${Math.round(ox)}×${Math.round(oy)} px)`);
      });
    });
    rel.botoes.push({ tela: nome, botoes: r.bs.length, problemas: prob });
  };
  const menu = async (nome, fn, espera = 900, arg) => { await p.evaluate(fn, arg); await p.waitForTimeout(espera); await shot('menu-' + nome); await confere(nome); };
  await menu('principal', () => { window.__nodie = false; __g.setState('ready'); });
  await p.evaluate(() => { window.__nodie = true; __g.setLoc('pe'); __g.setAcc(''); __g.start(); }); await p.waitForTimeout(400);
  await menu('pausa', () => __g.setState('paused'));
  for (const [nome, cart, rec] of [['fim-recorde-continuar', 900, true], ['fim-sem-tampinhas', 0, false]]) {
    await p.evaluate(([cart, rec]) => { __g.setState('running'); __g.loja.carteira = cart; __g.setScore(23663); __g.setBest(rec ? 0 : 99999); window.__nodie = false; __g.obstacles.length = 0; }, [cart, rec]);
    await p.waitForTimeout(200); await p.evaluate(() => __g.die()); await p.waitForTimeout(2700); await shot('menu-' + nome); await confere(nome);
  }
  for (const tab of ['personagem', 'acessorios', 'locomocao', 'rastros']) await menu('loja-' + tab, tab => { __g.setState('shop'); __g.setTab(tab); }, 700, tab);
  await menu('missoes', () => __g.setState('goals'), 700);
  await menu('ajustes', () => __g.setState('ajustes'), 700);
  // passa por todos os acessórios × veículos para pedir todas as imagens que o jogo usa (aviso de imagem sem uso)
  for (const acc of ['', 'bone', 'chapeu', 'coroa']) for (const loc of ['pe', 'skate']) {
    await p.evaluate(([a, l]) => { window.__nodie = true; __g.setAcc(a); __g.setLoc(l); __g.start(); __g.setDist(66000); __g.activate('lata', 300, 200); __g.activate('escudo', 300, 200); }, [acc, loc]); await p.waitForTimeout(450);
  }
  await p.waitForTimeout(1500);
  const path = require('path'), base = process.env.ARCADE_DIR || path.join(__dirname, '..', 'nerdGG094', 'arcade'), todas = [];
  const anda = d => fs.readdirSync(path.join(base, d), { withFileTypes: true }).forEach(e => e.isDirectory() ? anda(d + '/' + e.name) : todas.push(d + '/' + e.name));
  anda('assets');
  rel.semUso = todas.filter(f => !pedidas.has(f) && !f.startsWith('assets/fonts/')).sort();
  fs.writeFileSync(`${out}/relatorio.json`, JSON.stringify(rel, null, 1));
  console.log('prints:', shots.length, '| erros de JS:', erros.length);
  erros.forEach(e => console.log('  ERRO:', e));
  if (rel.semUso.length) console.log(`  aviso: ${rel.semUso.length} imagem(ns) em assets/ que o jogo não pediu (mover para ferramentas/assets-sem-uso/ se não forem usadas):\n    ` + rel.semUso.join('\n    '));
  rel.botoes.forEach(t => console.log(`  ${t.tela}: ${t.botoes} botões${t.problemas.length ? ' — ' + t.problemas.join('; ') : ' ok'}`));
  await b.close();
  process.exit(erros.length || rel.botoes.some(t => t.problemas.length) ? 1 : 0);
})();
