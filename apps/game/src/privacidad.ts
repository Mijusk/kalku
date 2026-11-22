import type { Locale } from '@kalku/exercises';
import {
  DRAFT_NOTICE,
  KIDS_SUMMARY,
  KIDS_TITLE,
  LEGAL_DRAFT,
  PAGE_TEXT,
  PRIVACY_DATE,
  PRIVACY_SECTIONS,
  PRIVACY_VERSION,
  SERVER_DATA,
  SUBPROCESSORS,
  type Localized,
} from '@kalku/content';
import { pickPrivacyLocale, readStoredProgress } from './privacyLocale';
import './privacidad.css';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function table(headers: string[], rows: string[][]): HTMLTableElement {
  const t = el('table');
  const head = el('tr');
  for (const h of headers) {
    const th = el('th', h);
    th.scope = 'col';
    head.append(th);
  }
  const thead = el('thead');
  thead.append(head);
  t.append(thead);
  const body = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    for (const cell of row) tr.append(el('td', cell));
    body.append(tr);
  }
  t.append(body);
  return t;
}

function render(root: HTMLElement, locale: Locale): void {
  const t = (text: Localized) => text[locale];
  document.documentElement.lang = locale;
  document.title = `Kalku · ${t(PAGE_TEXT.title)}`;

  const switcher = el('div', undefined, 'lang');
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', t(PAGE_TEXT.language));
  for (const [code, label] of [['es', 'Castellano'], ['ca', 'Català']] as const) {
    const b = el('button', label, 'btn');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(code === locale));
    b.addEventListener('click', () => render(root, code));
    switcher.append(b);
  }

  const back = el('a', t(PAGE_TEXT.back), 'btn');
  back.href = '/';

  const kids = el('section', undefined, 'kids');
  kids.append(el('h2', t(KIDS_TITLE)));
  const list = el('ul');
  for (const line of KIDS_SUMMARY) list.append(el('li', t(line)));
  kids.append(list);

  const children: HTMLElement[] = [el('div', undefined, 'bar')];
  children[0]?.append(back, switcher);
  if (LEGAL_DRAFT) {
    const notice = el('p', t(DRAFT_NOTICE), 'draft');
    notice.setAttribute('role', 'note');
    children.push(notice);
  }
  children.push(
    el('h1', t(PAGE_TEXT.title)),
    el('p', `${t(PAGE_TEXT.version)} ${PRIVACY_VERSION} · ${PRIVACY_DATE}`, 'meta'),
    kids,
  );

  for (const section of PRIVACY_SECTIONS) {
    const s = el('section');
    s.id = section.id;
    s.append(el('h2', t(section.heading)));
    for (const p of section.paragraphs) s.append(el('p', t(p)));
    if (section.table === 'data') {
      s.append(
        table(
          ['', t(PAGE_TEXT.tableWhat), t(PAGE_TEXT.tablePurpose), t(PAGE_TEXT.tableRetention)],
          SERVER_DATA.map((d) => [d.table, t(d.what), t(d.purpose), t(d.retention)]),
        ),
      );
    } else if (section.table === 'subprocessors') {
      s.append(
        table(
          [t(PAGE_TEXT.subName), t(PAGE_TEXT.subRole), t(PAGE_TEXT.subLocation)],
          SUBPROCESSORS.map((p) => [p.name, p.note ? `${t(p.role)}. ${t(p.note)}` : t(p.role), t(p.location)]),
        ),
      );
    }
    children.push(s);
  }
  root.replaceChildren(...children);
}

const root = document.getElementById('privacy');
if (root) render(root, pickPrivacyLocale(location.search, readStoredProgress(), navigator.languages ?? []));
