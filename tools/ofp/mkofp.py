#!/usr/bin/env python3
"""OFP PDFs to js/data/ofp.js: the planning data shown on the FLIGHT PLANS tab and the winds applied to the flight.

Usage (from the repository root):  python3 tools/ofp/mkofp.py DIR_WITH_OFP_PDFS
Needs pdftotext (poppler). Reads flyadeal PPS computer flight plans.
Only routes, levels, masses, fuel figures, distances and winds are kept: no crew or dispatcher names, no registration.
The OFP PDFs themselves are not part of the repository."""
import re, sys, os, glob, json, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WV = re.compile(r'(\d{3})/(\d{3})')
def ll(s):
    m = re.search(r'([NS])(\d+):([\d.]+) ([EW])(\d+):([\d.]+)', s)
    if not m: return None
    return [round((int(m[2]) + float(m[3])/60)*(1 if m[1] == 'N' else -1), 5), round((int(m[5]) + float(m[6])/60)*(1 if m[4] == 'E' else -1), 5)]
def hm(s):
    h, m = s.split(':'); return int(h)*60 + int(m)
def rows(L):
    """navigation log rows: two text lines per waypoint"""
    out = []
    for i, l in enumerate(L[:-1]):
        if '___/___' not in l: continue
        pos = ll(L[i+1])
        if not pos: continue
        a, b = l.split('___/___'); t = a.split(); u = b.split()
        awy = t.pop(0) if not l.startswith(' ') else ''
        if not t or not t[0].isdigit(): continue
        t.pop(0); name = t.pop(0)
        if t and re.match(r'^\d+ft$', t[0]): t.pop(0)
        if t and re.match(r'^\d+\.\d+$', t[0]): t.pop(0)
        if t and t[0] in ('H', 'T'): t = t[2:]
        if len(t) < 2: continue
        w = WV.search(L[i+1].split(pos and re.search(r'[EW]\d+:[\d.]+', L[i+1]).group(0))[1])
        fl = u[1] if len(u) > 2 else ''
        out.append({'awy': awy, 'id': name, 'pos': pos, 'mt': int(t[0]), 'dst': int(t[1]), 'fl': fl, 'wind': [int(w[1]), int(w[2])] if w else None})
    return out
def table(L, start):
    """FL header line and one data line: [[fl, dir, spd, oat]]"""
    fls = [int(x) for x in re.findall(r'FL\s*(\d+)', L[start])]
    d = L[start+1]; w = WV.findall(d); o = re.findall(r'/\d{3}\s+(-?\d+)', d)
    return [[fls[k], int(w[k][0]), int(w[k][1]), int(o[k]) if k < len(o) else None] for k in range(min(len(fls), len(w)))]
def parse(txt):
    L = txt.split('\n'); g = lambda p, d=None: (re.search(p, txt, re.M) or [None, d])[1]
    o = {'flt': g(r'FLIGHT NBR: (\S+)'), 'date': g(r'DATE OF FLIGHT: (\S+)'), 'from': g(r'^DEP\s+: (\S+)'), 'to': g(r'^DEST\s+: (\S+)'),
         'std': g(r'STD ZULU\s+: (\S+)'), 'eta': g(r'ETA: (\S+)'), 'fl': int(g(r'PLN FL\s+: (\d+)')), 'ci': int(g(r'CRZ MODE\s*: CI(\d+)')),
         'isa': int(g(r'AVERAGE ISA\s*:\s+(-?\d+)')), 'route': g(r'PLND ROUTE: (.+)').strip(), 'pax': int(g(r'TOTAL PAX\s+(\d+)', 0)),
         'wc': g(r'AVG WC\s+:\s+(\d+ KTS \w+)'), 'dist': {'ground': int(g(r'GROUND DIST:\s+(\d+)')), 'air': int(g(r'AIR DIST\s+:\s+(\d+)')), 'gc': int(g(r'GC DIST\s+:\s+(\d+)'))}}
    f = lambda p: re.search(p, txt, re.M)
    def tf(p):
        m = f(p + r'\s*:\s+(\d+:\d+)\s+(\d+)'); return {'time': hm(m[1]), 'fuel': int(m[2])} if m else None
    o['fuel'] = {'trip': tf(r'^TRIP'), 'cont': tf(r'^CONT \w+'), 'altn': tf(r'^ALT \(\w+\)'), 'altnId': g(r'^ALT \((\w+)\)'), 'final': tf(r'^FINAL RES'), 'add': tf(r'^ADD FUEL'),
                 'minTof': tf(r'^MIN TOF'), 'taxi': int(g(r'^TAXI\s+:\s+(\d+)')), 'extra': tf(r'^EXTRA'), 'block': tf(r'^TOTAL FUEL')}
    o['mass'] = {k: int(g(p)) for k, p in [('dom', r'^DOM\s+:\s+(\d+)'), ('payload', r'^PAYLOAD\s+:\s+(\d+)'), ('zfm', r'^ZFM\s+:\s+(\d+)'), ('tof', r'^T/O FUEL\s+:\s+(\d+)'),
                                              ('tom', r'^TOM\s+:\s+(\d+)'), ('ldm', r'^LDG MASS\s*:\s+(\d+)')]}
    o['climb'] = g(r'Climb\s*:\s*(\d+ NM in \S+ hrs\s+\d+ Kg)'); o['descent'] = g(r'Descent:\s*(\d+ NM in \S+ hrs\s+\d+ Kg)')
    iata = dict(re.findall(r'^ALT\s+: (\S+) (\S+)', txt, re.M))                       # ICAO -> IATA
    af = dict(re.findall(r'^DEST ALTERNATE \d (\S+)\s+:\s+(\d+)', txt, re.M))          # IATA -> fuel
    i0 = next(i for i, l in enumerate(L) if l.startswith('AWY ')); ia = next((i for i, l in enumerate(L) if l.startswith('ROUTE TO ALTERNATE')), len(L))
    iw = next((i for i, l in enumerate(L) if 'CLIMB DATA WINDS' in l), len(L))
    o['log'] = rows(L[i0:ia])
    o['proc'] = {'sid': next((r['awy'] for r in o['log'] if r['awy'] not in ('', 'DCT')), None) if o['log'] and o['log'][0]['awy'] not in ('DCT',) and not re.match(r'^[A-Z]\d+$', o['log'][0]['awy']) else None}
    en = [r['awy'] for r in o['log']]
    o['proc']['appr'] = next((r['awy'] for r in o['log'] if re.match(r'^RW\d', r['id'])), None)
    st = [a for a in en if re.match(r'^[A-Z]{4}\d[A-Z]$', a) and a != o['proc']['sid']]; o['proc']['star'] = st[-1] if st else None
    o['altn'] = []
    hs = [i for i in range(ia, iw) if L[i].startswith('Alternate ')]
    for n, i in enumerate(hs):
        t = L[i].split(); j = hs[n+1] if n+1 < len(hs) else next((k for k in range(i, iw) if L[k].startswith('ICAO ')), iw)
        r = rows(L[i:j]); fl = [x['fl'] for x in r if x['fl'].isdigit()]
        o['altn'].append({'id': t[1], 'route': ' '.join(t[2:]), 'fuel': int(af.get(iata.get(t[1], ''), 0)) or None, 'fl': max(map(int, fl)) if fl else None,
                          'dist': sum(x['dst'] for x in r), 'log': r})
    w = {'clb': [], 'des': [], 'enr': []}
    if iw < len(L):
        w['clb'] = table(L, iw+1)
        ide = next(i for i, l in enumerate(L) if 'DESCENT DATA WINDS' in l); w['des'] = table(L, ide+1)
        fls = []; pos = {r['id']: r['pos'] for r in o['log']}
        for l in L[iw+3:ide]:
            if re.match(r'^(IDENT)?\s+FL', l): fls = [int(x) for x in re.findall(r'FL\s*(\d+)', l)]; continue
            v = WV.findall(l); t = l.split()
            if len(v) >= 3 and fls and t and t[0] in pos:
                w['enr'].append({'id': t[0], 'pos': pos[t[0]], 'lv': [[fls[k], int(v[k][0]), int(v[k][1])] for k in range(min(len(fls), len(v)))]})
    o['wind'] = w
    return o
def main():
    d = sys.argv[1]; out = []
    for f in sorted(glob.glob(os.path.join(d, '**', '*.pdf'), recursive=True)):
        txt = subprocess.run(['pdftotext', '-layout', f, '-'], capture_output=True, text=True).stdout
        if 'COMPUTER FLIGHT PLAN' not in txt: continue
        o = parse(txt); out.append(o)
        print('%s %s-%s FL%d  %d waypoints, %d alternates, winds: %d climb, %d en-route, %d descent' % (o['flt'], o['from'], o['to'], o['fl'], len(o['log']), len(o['altn']), len(o['wind']['clb']), len(o['wind']['enr']), len(o['wind']['des'])))
    out.sort(key=lambda o: o['flt'])
    js = ("'use strict';\n/* Generated by tools/ofp/mkofp.py from the OFPs. Do not edit by hand.\n"
          "   Planning figures, routes and winds only (no names). Training data, never for navigation. */\n"
          "const OFPS=" + json.dumps(out, separators=(',', ':')) + ";\n")
    open(os.path.join(ROOT, 'js/data/ofp.js'), 'w').write(js); print('js/data/ofp.js', len(js)//1024, 'KB')
    # fix positions printed on the OFPs, for the navigation data generator (tools/navdb/procgen.py)
    nav = json.loads(re.search(r'const OA_NAV=(\{.*?\});\n', open(os.path.join(ROOT, 'js/data/world.js')).read(), re.S).group(1))
    skip = re.compile(r'^(-.*|RW\d.*|OE[A-Z]{2}|TH\d+|DE\d\d[LCR]?|C\d+F|\d\dDIN|D\d+N[A-Z]+|HO\d+|IF\d\d[LCR]?|I[A-Z]{3}\d)$')
    fx = {}
    for o in out:
        for r in o['log'] + [x for a in o['altn'] for x in a['log']]:
            if skip.match(r['id']) or r['id'] in nav or r['id'] == 'KSA': continue
            fx.setdefault(r['id'], r['pos'])
    open(os.path.join(ROOT, 'tools/navdb/ofpfix.py'), 'w').write('"""Fix positions printed on the flyadeal OFPs (%s), to 0.1 minute. Generated by tools/ofp/mkofp.py.\nWhere a chart fix is also on an OFP, the OFP position is used and the fixes chained from it follow.\nTraining data only, never for navigation."""\nOFP = ' % ', '.join(o['flt'] for o in out)
        + json.dumps(fx, separators=(',', ':')).replace('],"', '],\n "') + '\n')
    print('tools/navdb/ofpfix.py', len(fx), 'fixes')
if __name__ == '__main__': main()
