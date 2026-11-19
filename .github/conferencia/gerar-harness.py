# gera arcade/_perf.html: cópia do jogo com ganchos de teste (window.__g) — APAGAR depois de usar.
#   sem morte (window.__nodie), escolher veículo/acessório/distância/estado, ler câmera/poderes/botões dos menus,
#   e registro do tempo de cada quadro (window.__log = [update ms, draw ms, eventos de cache]) para medir desempenho.
# uso: python3 ferramentas/gerar-harness.py nerdGG094/arcade/index.html nerdGG094/arcade/_perf.html
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()

def rep(a, b):
    global s
    assert a in s, 'gancho não encontrado: ' + a[:70]
    s = s.replace(a, b, 1)

rep("  function die() {", "  function die() { if (window.__nodie) return;")
rep("const CYCLE_OFFSET =", "let CYCLE_OFFSET =")
rep("  requestAnimationFrame(frame);\n})();", """  requestAnimationFrame(frame);
  window.__g = { start, activate, die, pressJump, PX, W, H, GROUND,
    setBest(v) { best = v; }, setHold(v) { hold = v; }, setDuck(v) { duckHeld = v; },
    setLoc(l) { loja.loc = l; }, setAcc(a) { loja.acc = a; }, setDist(d) { dist = d; },
    setScore(v) { pts = v; bonus = 0; }, setState(v) { state = v; }, setTab(v) { shopTab = v; },
    setCiclo(v) { CYCLE_OFFSET = v - (dist || 0) * .025 / 1800; },   // força a hora do dia (0 = manhã, .3 = tarde, .66 = noite)
    get obstacles() { return obstacles; }, get player() { return player; }, get skills() { return skills; },
    get loja() { return loja; }, get state() { return state; }, get camY() { return camY; }, get dist() { return dist; },
    get dark() { return dark; }, get bw() { return biomeWeights(); }, get scale() { return renderScale; },
    get menuButtons() { return menuButtons; }, get menuOY() { return menuOY; }, get ready() { return loadState.ready; },
    get jobs() { return tintJobs.length; }, get toasts() { return toasts; } };
})();""")
# tempo de cada quadro + o que foi criado nele (cópias coloridas/desfocadas/noite)
import re
m = re.search(r"(\n    if \(state !== 'paused'[^\n]*update\(dt\);[^\n]*\n)(    draw\(\);)", s)
assert m, 'gancho não encontrado: linha do update(dt) + draw() no frame()'
s = s[:m.start()] + "\n    const __t0 = performance.now(); window.__ev = [];" + m.group(1).replace('\n', '', 1) + "    const __t1 = performance.now();\n    draw();\n    if (window.__log) __log.push([__t1 - __t0, performance.now() - __t1, __ev.join(',')]);" + s[m.end():]
rep("    c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;\n    const g = c.getContext('2d'); g.drawImage(img, 0, 0);\n    try {",
    "    window.__ev && __ev.push('cor:' + key + ':' + img.src.split('?')[0].split('/').slice(-2).join('/'));\n    c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;\n    const g = c.getContext('2d'); g.drawImage(img, 0, 0);\n    try {")
rep("      c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;\n      const g = c.getContext('2d'); g.filter = f;",
    "      window.__ev && __ev.push('suave:' + String(im.src).split('?')[0].split('/').pop());\n      c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;\n      const g = c.getContext('2d'); g.filter = f;")
rep("      nightBudget--;", "      nightBudget--; window.__ev && __ev.push('noite:' + lvl + ':' + String(im.src).split('?')[0].split('/').pop());")
open(dst, 'w').write(s)
