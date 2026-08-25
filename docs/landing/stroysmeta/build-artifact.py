#!/usr/bin/env python3
"""Собирает одностраничные версии лендинга.

CSS, JS и картинки инлайнятся: стили и скрипт — как есть, изображения — в
data: URI. Два режима:

    python3 build-artifact.py              -> dist/artifact.html
    python3 build-artifact.py --standalone -> dist/stroysmeta.html

Артефакт публикуется без обёрток <!doctype>/<html>/<body> — их добавляет
платформа, а её CSP режет любые внешние хосты, кроме Google Fonts.
Standalone — полноценный документ: один файл, открывается двойным кликом.
"""
import base64, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'index.html')
OUT_DIR = os.path.join(ROOT, 'dist')
OUT_ARTIFACT = os.path.join(OUT_DIR, 'artifact.html')
OUT_STANDALONE = os.path.join(OUT_DIR, 'stroysmeta.html')

MIME = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml'}


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def main():
    standalone = '--standalone' in sys.argv
    html = read('index.html')
    css = read('assets/css/style.css')
    js = read('assets/js/app.js')

    # в артефакте заголовок — имя в галерее, поэтому берём только имя продукта,
    # а поисковый хвост после тире оставляем странице
    full_title = re.search(r'<title>(.*?)</title>', html, re.S).group(1).strip()
    # в артефакте заголовок — имя в галерее, поэтому берём только имя продукта
    title = full_title if standalone else full_title.split(' — ')[0].strip()
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

    if standalone:
        head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
        head = head.replace('<link rel="stylesheet" href="assets/css/style.css">', '')
        head = head.replace('<title>%s</title>' % full_title, '<title>%s</title>' % title)
        head = re.sub(r'<meta property="og:image"[^>]*>', '', head)
        out = ('<!doctype html>\n<html lang="ru">\n<head>\n%s\n<style>\n%s\n</style>\n</head>\n'
               '<body>%s\n<script>\n%s\n</script>\n</body>\n</html>\n') % (head.strip(), css, body, js)
        target = OUT_STANDALONE
    else:
        out = '<title>%s</title>\n%s\n<style>\n%s\n</style>\n%s\n<script>\n%s\n</script>\n' % (
            title, fonts, css, body, js)
        target = OUT_ARTIFACT

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(target, 'w', encoding='utf-8') as f:
        f.write(out)

    size = len(out.encode('utf-8'))
    print('%s: %.2f MB, картинок вшито: %d' % (os.path.basename(target), size / 1048576.0, inlined))
    if missing:
        print('НЕ НАЙДЕНЫ (останутся ссылками и не отрисуются в артефакте):')
        for m in missing:
            print('  ' + m)
    if not standalone and size > 16 * 1048576:
        print('ВНИМАНИЕ: больше 16 МБ — артефакт не опубликуется')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
