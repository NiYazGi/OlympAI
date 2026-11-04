"""Turns the Kazakhstan mathematics olympiad archive (olympiads.bc-pf.org, as
exported to tasks.zip with manifest.csv) into
supabase/migrations/202608190033_kz_math_archive.sql.

    python -I scripts/import-kz-math.py <unpacked archive>/tasks <project root>

Re-running regenerates the migration from scratch. It must not be re-run after
the migration has been applied anywhere: applied migrations are never edited,
so a changed import goes in a new migration instead.

Unzip the archive with a tool that decodes its cp866 file names (Python's
zipfile does, given the flag check in the importer that shipped with it).
Writes import-report.json and import-samples.txt next to the archive folder.
"""
import collections
import csv
import html
import json
import os
import re
import shutil
import sys

SRC, ROOT = sys.argv[1], sys.argv[2]
os.chdir(SRC)

SECTIONS = {
    # section: (id prefix, name in titles, grade range for papers without a class, base difficulty)
    'Азиатская-Тихоокеанская': ('apmo', 'Азиатско-Тихоокеанская олимпиада', (10, 11), 5),
    'Балканская': ('bmo', 'Балканская олимпиада', (10, 11), 5),
    'Шелковый путь': ('silk-road', 'Олимпиада «Шёлковый путь»', (10, 11), 4),
    'Юниорская Балканская': ('jbmo', 'Юниорская Балканская олимпиада', (8, 9), 4),
    'ГЖО': ('gzho', 'Олимпиада ГЖО', None, None),
    'Областная': ('oblast', 'Областная олимпиада', None, 3),
    'Республиканская': ('national', 'Республиканская олимпиада', None, 4),
}

# Statements that stop before saying what is asked, in the source itself.
TRUNCATED = {'Областная/2003/10/problem2.html', 'Республиканская/2005/11/problem4.html'}

MINUTES = {1: 10, 2: 15, 3: 25, 4: 40, 5: 60}

# Keyword stems per topic, matched against the lower-cased statement (LaTeX included).
TOPICS = {
    'geometry': [r'треугольник', r'окружност', r'\bугол', r'\bугл', r'угла\b', r'четыр[её]хугольник', r'биссектрис', r'медиан',
                 r'касательн', r'касает', r'вписан', r'описан', r'параллелограмм', r'трапеци', r'ромб', r'хорд', r'перпендикуляр',
                 r'отрезк', r'отрезок', r'многоугольник', r'\\angle', r'\\triangle', r'\\parallel', r'\\perp', r'тетраэдр',
                 r'пирамид', r'сфер', r'радиус', r'диаметр', r'центр опис', r'ортоцентр', r'вершин[аыу] [a-z]', r'шестиугольник',
                 r'пятиугольник', r'площад[ьи] треуг', r'точк[аиу] [a-z]', r'прям(ая|ой|ую|ые|ых) [a-z]{1,3}\b', r'\\omega'],
    'number-theory': [r'прост(ое|ых|ым|ые|ого) чис', r'простое', r'делит(ся|ель|ели|елей)', r'делим', r'кратн', r'остат',
                      r'\\gcd', r'нод\b', r'нок\b', r'\\pmod', r'\\mod', r'\\equiv', r'взаимно прост', r'цифр', r'в целых числах',
                      r'целых чисел', r'целые числа', r'натуральн(ые|ых) решени', r'точн(ый|ым|ыми|ого) квадрат', r'полн(ый|ым|ыми|ого) квадрат', r'остатк', r'остаток',
                      r'десятичн', r'\\mid', r'\bp\^', r'степен[ьи] двойки'],
    'algebra': [r'неравенств', r'многочлен', r'полином', r'функци', r'уравнени', r'систем[ауы] уравн', r'последовательност',
                r'\\sum', r'\\sqrt', r'действительн', r'вещественн', r'корн(и|ей|ем)', r'\\sin', r'\\cos', r'\\tan', r'\\log',
                r'\\ln', r'\\geq', r'\\leq', r'\\ge\b', r'\\le\b', r'наименьшее значение', r'наибольшее значение', r'\\prod',
                r'x\^', r'\\infty', r'предел', r'прогресси'],
    'combinatorics': [r'доск', r'клет', r'раскра', r'покра', r'игр', r'ход(ом|а|ы)?\b', r'сколькими способами', r'граф',
                      r'турнир', r'команд', r'монет', r'карточ', r'перестанов', r'подмнож', r'множеств', r'шахмат', r'ладь',
                      r'фигур(к|ы)', r'разреза', r'замост', r'выигрыш', r'стратеги', r'знаком', r'участник', r'город', r'дорог',
                      r'кружоч', r'сколько (существует|можно|различных)', r'таблиц'],
}
TIE_ORDER = ['geometry', 'number-theory', 'algebra', 'combinatorics']


def classify(text):
    low = text.lower()
    scores = {topic: sum(len(re.findall(p, low)) for p in pats) for topic, pats in TOPICS.items()}
    best = max(TIE_ORDER, key=lambda t: (scores[t], -TIE_ORDER.index(t)))
    return best if scores[best] > 0 else 'combinatorics'


def to_text(body):
    """Statement HTML -> plain text with \\( \\) and \\[ \\] kept for the renderer."""
    s = body
    s = re.sub(r'<span class="katex-display">\s*(\\\[.*?\\\])\s*</span>', lambda m: '\n\n' + m.group(1) + '\n\n', s, flags=re.S)

    def ol(m):
        items = re.findall(r'<li[^>]*>(.*?)</li>', m.group(1), flags=re.S)
        return '\n' + '\n'.join(f'{i}) {item}' for i, item in enumerate(items, 1)) + '\n'

    def ul(m):
        items = re.findall(r'<li[^>]*>(.*?)</li>', m.group(1), flags=re.S)
        return '\n' + '\n'.join(f'• {item}' for item in items) + '\n'

    s = re.sub(r'<ol[^>]*>(.*?)</ol>', ol, s, flags=re.S)
    s = re.sub(r'<ul[^>]*>(.*?)</ul>', ul, s, flags=re.S)
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'</p>\s*', '\n\n', s)
    s = re.sub(r'<img[^>]*>', '(см. рисунок)', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s).replace('\xa0', ' ')
    # Newlines inside a paragraph are source formatting, not breaks, except
    # inside display math and list lines; join them into spaces.
    paragraphs = []
    for para in re.split(r'\n\s*\n', s):
        lines = [line.strip() for line in para.split('\n') if line.strip()]
        if not lines:
            continue
        joined = []
        for line in lines:
            if joined and not re.match(r'^(\d+\)|•)\s', line) and not line.startswith('\\['):
                if joined[-1].startswith('\\[') and not joined[-1].endswith('\\]'):
                    joined[-1] += ' ' + line
                else:
                    joined[-1] += ' ' + line
            else:
                joined.append(line)
        paragraphs.append('\n'.join(re.sub(r'[ \t]{2,}', ' ', l) for l in joined))
    return '\n\n'.join(paragraphs).strip()


rows = list(csv.DictReader(open('manifest.csv', encoding='utf-8-sig')))
html_rows = [r for r in rows if r['item_type'] == 'html_task' and r['status'] == 'ok']

# Problems per paper, to place each one within its paper for difficulty.
paper_size = collections.Counter((r['section'], r['year'], r['class']) for r in html_rows)

tasks, skipped = [], collections.Counter()
skipped_list = []
copied_images = []
for r in html_rows:
    section = r['section']
    if section not in SECTIONS:
        skipped[f'unknown section {section}'] += 1
        continue
    prefix, name, common_grades, base = SECTIONS[section]
    page = open(r['local_path'], encoding='utf-8').read()
    m = re.search(r'<article[^>]*>(.*)</article>', page, re.S)
    body = m.group(1) if m else ''
    if 'Изображение недоступно' in body:
        skipped['picture missing in the source'] += 1
        skipped_list.append(r['local_path'])
        continue
    text = to_text(body)
    # One statement lost its first letter to an encoding slip in the source.
    text = text.replace('–ешите', 'Решите')
    if r['local_path'].replace(os.sep, '/') in TRUNCATED:
        skipped['statement cut off in the source'] += 1
        skipped_list.append(r['local_path'])
        continue
    if len(text) < 20:
        skipped['empty statement'] += 1
        skipped_list.append(r['local_path'])
        continue

    number = int(re.search(r'problem(\d+)', r['local_path']).group(1))
    year = int(r['year'])
    cls = r['class']
    if cls == 'common':
        gmin, gmax = common_grades
        tid = f'{prefix}-{year}-{number}'
        title = f'{name} {year} — задача {number}'
        source = f'{name}, {year}'
    else:
        gmin = gmax = int(cls)
        tid = f'{prefix}-{year}-{cls}-{number}'
        title = f'{name} {year}, {cls} класс — задача {number}'
        source = f'{name}, {year}, {cls} класс'

    if base is None:  # ГЖО: junior grades start easier
        base = 2 if gmin <= 7 else 3
    size = paper_size[(section, r['year'], cls)]
    later_half = size > 1 and number > (size + 1) // 2
    difficulty = max(1, min(5, base + (1 if later_half else 0)))

    diagram = None
    img = re.search(r'<img[^>]*src=["\']([^"\']+)', body)
    if img and not img.group(1).startswith('http'):
        src_path = os.path.join(os.path.dirname(r['local_path']), img.group(1))
        dest_name = f'{tid}-{os.path.basename(img.group(1))}'
        dest_dir = os.path.join(ROOT, 'public', 'tasks')
        os.makedirs(dest_dir, exist_ok=True)
        shutil.copyfile(src_path, os.path.join(dest_dir, dest_name))
        diagram = f'/tasks/{dest_name}'
        copied_images.append(diagram)

    tasks.append({
        'id': tid, 'topic': classify(text), 'title': title, 'problem': text, 'difficulty': difficulty,
        'minutes': MINUTES[difficulty], 'source': source, 'source_url': r['source_url'], 'gmin': gmin, 'gmax': gmax,
        'diagram': diagram,
    })

ids = collections.Counter(t['id'] for t in tasks)
dupes = [i for i, n in ids.items() if n > 1]
assert not dupes, dupes


def q(value):
    if value is None:
        return 'null'
    if isinstance(value, int):
        return str(value)
    assert '$olymp$' not in value
    return f'$olymp${value}$olymp$'


out = [
    "-- Replaces the task library with the Kazakhstan mathematics olympiad archive",
    "-- (olympiads.bc-pf.org), and empties the olympiad list.",
    "--",
    "-- Generated from the archive's manifest.csv; do not edit by hand. Each row keeps",
    "-- its source URL. Statements are the archive's text with LaTeX left in",
    "-- \\( \\) and \\[ \\] for the renderer (components/math-text.tsx).",
    "--",
    "-- Grades: national, regional and ГЖО papers are set per grade; the",
    "-- international ones have none, so APMO, Balkan and Silk Road are filed under",
    "-- 10-11 and the Junior Balkan under 8-9. Topic is a keyword guess from the",
    "-- statement; difficulty comes from the olympiad's level and the problem's",
    "-- position in its paper. Problems whose figure is missing in the source, and",
    "-- the one empty statement, are left out. No reference solutions exist: the",
    "-- grader judges the reasoning on its own.",
    "--",
    "-- Licence: recorded as 'unknown'. The archive does not state terms; confirm",
    "-- them before publishing the library.",
    "",
    "-- Everything that hangs off the old tasks goes with them. Attempts, resources",
    "-- cascade; mock papers hold task ids in an array and are removed explicitly;",
    "-- user_progress is derived from attempts and would otherwise point at nothing.",
    "delete from public.mock_tests;",
    "delete from public.user_progress;",
    "delete from public.tasks;",
    "delete from public.competition_registrations;",
    "delete from public.competitions;",
    "",
]

cols = '(id, subject_id, topic_id, title, problem, difficulty, estimated_minutes, source, source_url, licence, attribution, grade_min, grade_max, diagram_url)'
for start in range(0, len(tasks), 100):
    chunk = tasks[start:start + 100]
    out.append(f"insert into public.tasks {cols}")
    out.append("select v.id, s.id, t.id, v.title, v.problem, v.difficulty, v.minutes, v.source, v.source_url, 'unknown',")
    out.append("       'Казахстанские олимпиады по математике, olympiads.bc-pf.org', v.gmin, v.gmax, v.diagram")
    out.append("from (values")
    vals = []
    for t in chunk:
        vals.append('  (' + ', '.join([q(t['id']), q(t['topic']), q(t['title']), q(t['problem']), q(t['difficulty']), q(t['minutes']),
                                       q(t['source']), q(t['source_url']), q(t['gmin']), q(t['gmax']), q(t['diagram'])]) + ')')
    out.append(',\n'.join(vals))
    out.append(") as v(id, topic_slug, title, problem, difficulty, minutes, source, source_url, gmin, gmax, diagram)")
    out.append("join public.subjects s on s.slug = 'mathematics'")
    out.append("join public.topics t on t.subject_id = s.id and t.slug = v.topic_slug;")
    out.append("")

path = os.path.join(ROOT, 'supabase', 'migrations', '202608190033_kz_math_archive.sql')
open(path, 'w', encoding='utf-8', newline='\n').write('\n'.join(out))

report = {
    'imported': len(tasks),
    'skipped': dict(skipped),
    'skipped_files': skipped_list,
    'by_topic': collections.Counter(t['topic'] for t in tasks),
    'by_grade_range': collections.Counter(f"{t['gmin']}-{t['gmax']}" for t in tasks),
    'by_difficulty': collections.Counter(t['difficulty'] for t in tasks),
    'images': copied_images,
    'sql_bytes': os.path.getsize(path),
}
json.dump(report, open(os.path.join(SRC, '..', 'import-report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=dict)
samples = open(os.path.join(SRC, '..', 'import-samples.txt'), 'w', encoding='utf-8')
import random
random.seed(7)
for t in random.sample(tasks, 25):
    samples.write(f"\n### {t['id']} | {t['topic']} | grades {t['gmin']}-{t['gmax']} | d{t['difficulty']}\n{t['problem']}\n")
print('ok', len(tasks))
