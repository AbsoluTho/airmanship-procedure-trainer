#!/usr/bin/env python3
"""Chart-to-data generator: fix positions from chart geometry, procedures typed from the charts.

Each airport file in tools/navdb/charts/ describes its fixes and procedures with the helpers below.
Fix positions are worked out from published geometry (VOR radial/DME, distance on the extended
centreline, track and distance from another fix), anchored on OurAirports thresholds and VORs.
Not for navigation: training data only. Output: js/data/procgen.js
"""
import json, math, os, re, sys, importlib.util
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
R_NM = 3440.065

def _load_js_obj(path, name):
    s = open(path).read()
    m = re.search(r'const ' + name + r'=(\{.*?\});\n', s, re.S)
    return json.loads(m.group(1))

OA_APT = _load_js_obj(os.path.join(ROOT, 'js/data/world.js'), 'OA_APT')
OA_NAV = _load_js_obj(os.path.join(ROOT, 'js/data/world.js'), 'OA_NAV')
DBJ = json.loads(re.search(r'const DB=(\{.*\});', open(os.path.join(ROOT, 'js/data/navdb.js')).read(), re.S).group(1))

def dst(p, brg, nm):
    la, lo = map(math.radians, p); b = math.radians(brg); d = nm / R_NM
    la2 = math.asin(math.sin(la)*math.cos(d) + math.cos(la)*math.sin(d)*math.cos(b))
    lo2 = lo + math.atan2(math.sin(b)*math.sin(d)*math.cos(la), math.cos(d) - math.sin(la)*math.sin(la2))
    return [round(math.degrees(la2), 5), round(math.degrees(lo2), 5)]
def gc(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    return R_NM*2*math.asin(math.sqrt(math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2))
def brg(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    y = math.sin(lo2-lo1)*math.cos(la2); x = math.cos(la1)*math.sin(la2) - math.sin(la1)*math.cos(la2)*math.cos(lo2-lo1)
    return (math.degrees(math.atan2(y, x)) + 360) % 360

class Apt:
    def __init__(self, icao, var):
        self.id = icao; self.var = var; self.a = OA_APT[icao]
        self.fx = {}; self.sids = {}; self.stars = {}; self.apprs = {}; self.notes = []
        self.rcrs = {}
    # ---------- positions ----------
    def P(self, name):
        if name in self.fx: return self.fx[name]
        if name in OA_NAV: return OA_NAV[name]['pos']
        if name in DBJ['wpt']: return DBJ['wpt'][name]
        raise KeyError(name)
    def thr(self, rwy): return self.a['rwy'][rwy]['pos']
    def crs(self, rwy): return self.rcrs.get(rwy, self.a['rwy'][rwy]['crs'])
    def rad(self, vor, radial, dme): return dst(self.P(vor), radial + self.var, dme)
    def ext(self, rwy, nm): return dst(self.thr(rwy), self.crs(rwy) + 180 + self.var, nm)      # before the threshold, on the approach side
    def dep(self, rwy, nm):                                                                    # after the departure end, on runway heading
        r = self.a['rwy'][rwy]; return dst(self.thr(rwy), self.crs(rwy) + self.var, r['len']/1852 + nm)
    def frm(self, fix, trk, nm): return dst(self.P(fix), trk + self.var, nm)                  # from FIX on magnetic track for nm
    def to(self, fix, trk, nm): return dst(self.P(fix), trk + 180 + self.var, nm)             # the point from which trk for nm reaches FIX
    def rwyd(self, rwy, vor, dme):                                                              # runway heading until DME from VOR
        o = self.thr(rwy); b = self.crs(rwy) + self.var; best = None
        for i in range(1, 4000):
            q = dst(o, b, i*0.01)
            if abs(gc(q, self.P(vor)) - dme) < 0.006 and gc(q, o) > 0.4: return q
        raise ValueError('no D%s on rwy %s' % (dme, rwy))
    def fix(self, name, pos):
        """a fix worked out from the chart (replaces any older hand-typed position)"""
        self.fx[name] = pos
    def chk(self, name, pos):
        """a fix that also has a reference position (OFP, VOR): keep the reference, report the difference"""
        try: ref = OA_NAV[name]['pos'] if name in OA_NAV else self.fx.get(name) or DBJ['wpt'][name]
        except KeyError: self.fx[name] = pos; return
        self.notes.append('%-6s %.2f NM between chart geometry and reference' % (name, gc(ref, pos)))
        if name not in OA_NAV: self.fx[name] = ref

def A(c):
    """'+6200' at or above, '-10000' at or below, '@5000' at, 'FL150' at or above FL150 written +15000"""
    if c is None: return None
    c = str(c); t = c[0] if c[0] in '+-@' else '@'; v = int(c.lstrip('+-@'))
    return {'t': t, 'v': v}

def W(id, a=None, s=None, lbl=None, **k):
    l = {'k': 'wpt', 'id': id}
    if a: l['alt'] = A(a)
    if s: l['spd'] = s
    if lbl: l['lbl'] = lbl
    l.update(k); return l
def ARC(id, ctr, a=None, s=None): return W(id, a, s, lbl='ARC', ctr=ctr)
def CA(aal): return {'k': 'ca', 'aal': aal}
def HDG(c, a): return {'k': 'hdg', 'id': '(%d)' % a, 'lbl': 'H%03d' % c, 'alt': A('+%d' % a)}
def HOLD(crs, turn, a): return {'k': 'hold', 'id': 'HOLD ' + turn, 'lbl': 'C%03d°' % crs, 'alt': A('@%d' % a)}

def finish(ap):
    """distance and course labels from the positions"""
    def seq(legs, start=None):
        prev = start
        for l in legs:
            if l['k'] != 'wpt': prev = None; continue
            p = ap.P(l['id'])
            if prev is not None and 'dist' not in l:
                l['dist'] = round(gc(prev, p), 1)
                if 'lbl' not in l: l['lbl'] = 'C%03d°' % round((brg(prev, p) - ap.var) % 360 or 360)
            prev = p
    for rwy, rw in ap.sids.items():
        for legs in rw.values(): seq(legs, ap.dep(rwy, 0))
    for s in ap.stars.values(): seq(s['legs'])
    for x in ap.apprs.values():
        for v in x['vias'].values(): seq(v)
        seq(x['final']); seq(x['missed'])

def main():
    out = {'wpt': {}, 'sids': {}, 'stars': {}, 'apprs': {}, 'rcrs': {}}
    d = os.path.join(ROOT, 'tools/navdb/charts')
    for f in sorted(os.listdir(d)):
        if not f.endswith('.py'): continue
        spec = importlib.util.spec_from_file_location(f[:-3], os.path.join(d, f)); m = importlib.util.module_from_spec(spec)
        m.__dict__.update(dict(Apt=Apt, W=W, ARC=ARC, CA=CA, HDG=HDG, HOLD=HOLD, A=A, gc=gc, brg=brg))
        spec.loader.exec_module(m); ap = m.AP; finish(ap)
        out['wpt'].update(ap.fx); out['sids'][ap.id] = ap.sids; out['stars'][ap.id] = ap.stars; out['apprs'][ap.id] = ap.apprs
        out['rcrs'][ap.id] = ap.rcrs
        print('%s: %d fixes, %d SIDs, %d STARs, %d approaches' % (ap.id, len(ap.fx), sum(len(v) for v in ap.sids.values()), len(ap.stars), len(ap.apprs)))
        for n in ap.notes: print('   ', n)
    js = ("'use strict';\n/* Generated by tools/navdb/procgen.py from the charts. Do not edit by hand.\n"
          "   Fix positions worked out from chart geometry (radial/DME, track and distance): training only, never for navigation. */\n"
          "const PROCGEN=" + json.dumps(out, separators=(',', ':')) + ";\n"
          "(function(){const G=PROCGEN;Object.assign(DB.wpt,G.wpt);\n"
          "  for(const[a,o]of Object.entries(G.sids))SIDS[a]=o;for(const[a,o]of Object.entries(G.apprs))APPRS[a]=o;\n"
          "  for(const[a,o]of Object.entries(G.stars))STARS[a]=o;\n"
          "  for(const[a,o]of Object.entries(G.rcrs))for(const[r,c]of Object.entries(o))if(DB.apt[a]&&DB.apt[a].rwy[r])DB.apt[a].rwy[r].crs=c})();\n")
    open(os.path.join(ROOT, 'js/data/procgen.js'), 'w').write(js)
    print('js/data/procgen.js', len(js)//1024, 'KB')
if __name__ == '__main__': main()
