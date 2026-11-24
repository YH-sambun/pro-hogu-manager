# 추가 사진(위키미디어 공용, 핫링크) -> cards.json 의 img 필드. 이미 사진 있는 카드는 건드리지 않음.
# 사용: python3 tools/photos_extra.py data/photos_extra.tsv cards.json [cards.json ...]
import json, sys, urllib.parse
tsv, *files = sys.argv[1:]
M = {}
for line in open(tsv, encoding='utf-8'):
    n, b, f, l, a = line.rstrip('\n').split('\t')
    q = urllib.parse.quote(f.replace(' ', '_'))
    M[(n, int(b))] = {'f': f'https://commons.wikimedia.org/wiki/Special:FilePath/{q}?width=360',
                      'a': a, 'l': l, 'u': f'https://commons.wikimedia.org/wiki/File:{q}'}
for path in files:
    d = json.load(open(path, encoding='utf-8'))
    cards, players = 0, set()
    for c in d['cards']:
        k = (c['n'].split('#')[0], c.get('b') or 0)
        if k in M and not c.get('img'):
            c['img'] = M[k]; cards += 1; players.add(k)
    json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(path, 'players', len(players), 'cards', cards, 'missing', sorted(set(M) - players)[:20])
