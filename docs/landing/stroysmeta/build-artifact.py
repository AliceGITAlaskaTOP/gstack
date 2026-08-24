#!/usr/bin/env python3
"""Собирает одностраничную версию лендинга для публикации артефактом.

CSP артефактов режет любые внешние хосты, кроме Google Fonts, поэтому CSS, JS
и картинки инлайнятся: стили и скрипт — как есть, изображения — в data: URI.
Результат кладётся в dist/artifact.html без обёрток <!doctype>/<html>/<body>.

    python3 build-artifact.py
"""
import base64, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'index.html')
OUT_DIR = os.path.join(ROOT, 'dist')
OUT = os.path.join(OUT_DIR, 'artifact.html')

MIME = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml'}


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def main():
    html = read('index.html')
    css = read('assets/css/style.css')
    js = read('assets/js/app.js')

    title = re.search(r'<title>(.*?)</title>', html, re.S).group(1).strip()
    fonts = re.search(r'<link href="https://fonts\.googleapis[^>]+>', html).group(0)

    body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
    body = body.replace('<script src="assets/js/app.js"></script>', '')

    missing, inlined = [], 0
    for rel in sorted(set(re.findall(r'assets/img/[\w.-]+', body))):
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path) or os.path.getsize(path) < 1024:
            missing.append(rel)
            continue
        mime = MIME.get(os.path.splitext(rel)[1].lower(), 'application/octet-stream')
        with open(path, 'rb') as f:
            data = base64.b64encode(f.read()).decode('ascii')
        body = body.replace('"%s"' % rel, '"data:%s;base64,%s"' % (mime, data))
        inlined += 1

    out = '<title>%s</title>\n%s\n<style>\n%s\n</style>\n%s\n<script>\n%s\n</script>\n' % (
        title, fonts, css, body, js)

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(out)

    size = len(out.encode('utf-8'))
    print('dist/artifact.html: %.2f MB, картинок вшито: %d' % (size / 1048576.0, inlined))
    if missing:
        print('НЕ НАЙДЕНЫ (останутся ссылками и не отрисуются в артефакте):')
        for m in missing:
            print('  ' + m)
    if size > 16 * 1048576:
        print('ВНИМАНИЕ: больше 16 МБ — артефакт не опубликуется')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
