import { SKILLS, type Locale, type SkillId } from '@kalku/exercises';
import { buildClassProgress, cellLabel, classSkills, masteryLevel, skillsInProgress, type StudentProgress } from '@kalku/content';
import { tr } from '../i18n';
import type { ClassProgressBackend } from '../classProgress';
import { toTeacherError } from '../teacher';
import { button, say, show, status, text } from './dom';
import { ERROR_TEXT } from './teacherErrors';

export interface ClassProgressPanelOptions {
  backend: ClassProgressBackend;
  classId: string;
  className: string;
  onClose(): void;
}

function skillName(id: SkillId, locale: Locale): string {
  return SKILLS.find((s) => s.id === id)?.name[locale] ?? id;
}

/**
 * Dominio de la clase (#55): tabla alumnos × habilidades y detalle por alumno. Cada casilla lleva
 * color, icono y número (nunca solo color); el orden es alfabético, sin rankings.
 */
export class ClassProgressPanel {
  constructor(private readonly root: HTMLElement, private readonly locale: Locale, private readonly options: ClassProgressPanelOptions) {
    void this.showTable();
  }

  private async load(feedback: HTMLElement): Promise<StudentProgress[]> {
    const { backend, classId } = this.options;
    try {
      const [mastery, days] = await Promise.all([backend.mastery(classId), backend.days(classId)]);
      return buildClassProgress(mastery, days, this.locale);
    } catch (e) {
      say(feedback, tr(ERROR_TEXT[toTeacherError(e).code], this.locale), 'bad');
      return [];
    }
  }

  private async showTable(): Promise<void> {
    const { locale } = this;
    const feedback = status('', 'info');
    show(this.root, text('panel-title', `${tr('progressTitle', locale)} · ${this.options.className}`), feedback);
    const students = await this.load(feedback);
    const back = button('btn btn-small', tr('progressBackToClass', locale), () => this.options.onClose());
    const nodes: HTMLElement[] = [text('panel-title', `${tr('progressTitle', locale)} · ${this.options.className}`), feedback];
    if (students.length === 0) {
      nodes.push(text('panel-feedback', tr('progressEmpty', locale)), back);
      show(this.root, ...nodes);
      return;
    }
    nodes.push(text('panel-feedback', tr('progressIntro', locale)));

    const skills = classSkills(students);
    const table = document.createElement('table');
    table.className = 'progress-table';
    const head = table.createTHead().insertRow();
    for (const label of [tr('progressStudent', locale), ...skills.map((k) => skillName(k, locale))]) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      head.append(th);
    }
    const body = table.createTBody();
    for (const s of students) {
      const row = body.insertRow();
      const name = document.createElement('th');
      name.scope = 'row';
      const open = button('btn btn-small', s.flagged ? `⚑ ${s.nickname}` : s.nickname, () => void this.showStudent(s));
      if (s.flagged) open.title = tr('progressFlag', locale);
      name.append(open);
      if (s.flagged) name.append(text('progress-flag', tr('progressFlagShort', locale)));
      row.append(name);
      for (const k of skills) {
        const cell = row.insertCell();
        const mastery = s.cells.get(k)?.mastery ?? null;
        cell.className = `progress-cell level-${masteryLevel(mastery).id}`;
        cell.textContent = cellLabel(mastery, locale);
      }
    }
    const wrap = document.createElement('div');
    wrap.className = 'progress-scroll';
    wrap.append(table);
    nodes.push(wrap, back);
    show(this.root, ...nodes);
  }

  private showStudent(s: StudentProgress): void {
    const { locale } = this;
    const nodes: HTMLElement[] = [text('panel-title', s.nickname)];
    if (s.flagged) nodes.push(text('panel-feedback', tr('progressFlag', locale)));
    if (s.cells.size === 0 && s.days.length === 0) nodes.push(text('panel-feedback', tr('progressNotStarted', locale)));

    nodes.push(text('panel-feedback', tr('progressInProgress', locale)));
    const current = skillsInProgress(s);
    if (current.length === 0) nodes.push(text('panel-feedback', tr('progressNoneInProgress', locale)));
    for (const c of current) nodes.push(text('panel-feedback', `${skillName(c.skill, locale)}: ${cellLabel(c.mastery, locale)}`));

    nodes.push(text('panel-feedback', tr('progressSessions', locale)));
    if (s.days.length === 0) nodes.push(text('panel-feedback', tr('progressNoSessions', locale)));
    for (const d of s.days.slice(0, 7)) {
      nodes.push(text('panel-feedback', `${d.day}: ${d.correct}/${d.attempts} ${tr('progressSessionLine', locale)}`));
    }
    nodes.push(button('btn btn-small', tr('progressBackToTable', locale), () => void this.showTable()));
    show(this.root, ...nodes);
  }
}
