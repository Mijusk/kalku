import { createRng, randomSeed, type Locale } from '@kalku/exercises';
import { tr } from '../i18n';
import { addStudentWithCard, animalName, checkStudentNickname, regenerateStudentCard, STUDENT_NICKNAME_MAX, type ClassBackend, type ClassInfo, type StudentCard, type StudentInfo } from '../classes';
import { toTeacherError } from '../teacher';
import type { ClassProgressBackend } from '../classProgress';
import { ClassProgressPanel } from './ClassProgressPanel';
import { printCards } from './cards';
import { button, say, show, status, text } from './dom';
import { ERROR_TEXT } from './teacherErrors';

export interface ClassPanelOptions {
  backend: ClassBackend;
  /** Dominio de la clase (#55); sin él no sale el botón. */
  progressBackend?: ClassProgressBackend | null;
  onClose(): void;
}

function field(label: string, maxLength: number): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'nickname-input';
  input.autocomplete = 'off';
  input.maxLength = maxLength;
  input.setAttribute('aria-label', label);
  input.placeholder = label;
  return input;
}

/**
 * Clases del docente (#52): crear una clase, añadir alumnos (apodo o iniciales), regenerar el código
 * y imprimir las tarjetas. Los códigos en claro solo viven aquí, en memoria, hasta cerrar la página.
 */
export class ClassPanel {
  private busy = false;
  /** Tarjetas hechas en esta sesión (nuevas o regeneradas), por alumno, listas para imprimir. */
  private readonly pending = new Map<string, StudentCard>();
  /** Códigos ya vistos de cada clase en esta sesión, para no repetirlos al generar. */
  private readonly taken = new Map<string, Set<string>>();
  private warnedNickname = '';

  constructor(private readonly root: HTMLElement, private readonly locale: Locale, private readonly options: ClassPanelOptions) {
    void this.showClasses();
  }

  private takenFor(classId: string): Set<string> {
    let set = this.taken.get(classId);
    if (!set) this.taken.set(classId, (set = new Set()));
    return set;
  }

  private async run(feedback: HTMLElement, action: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    say(feedback, tr('teacherWorking', this.locale));
    try {
      await action();
    } catch (e) {
      say(feedback, tr(ERROR_TEXT[toTeacherError(e).code], this.locale), 'bad');
    } finally {
      this.busy = false;
    }
  }

  private async showClasses(message?: string): Promise<void> {
    const { locale } = this;
    const { backend } = this.options;
    const feedback = status(message ?? '', 'good');
    let classes: ClassInfo[] = [];
    try {
      classes = await backend.listClasses();
    } catch (e) {
      say(feedback, tr(ERROR_TEXT[toTeacherError(e).code], locale), 'bad');
    }
    const nodes: HTMLElement[] = [text('panel-title', tr('classTitle', locale)), feedback];
    if (classes.length === 0) nodes.push(text('panel-feedback', tr('classNoClasses', locale)));
    for (const c of classes) nodes.push(button('btn btn-small', c.name, () => void this.showClass(c)));
    const name = field(tr('classNewName', locale), 60);
    const create = button('btn btn-primary', tr('classCreate', locale), () =>
      void this.run(feedback, async () => {
        const created = await backend.createClass(name.value);
        await this.showClass(created, tr('classCreated', locale));
      }),
    );
    name.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') create.click();
    });
    nodes.push(name, create, button('btn btn-small', tr('teacherBack', locale), () => this.options.onClose()));
    show(this.root, ...nodes);
  }

  private progressButton(cls: ClassInfo): HTMLElement[] {
    const { progressBackend } = this.options;
    if (!progressBackend) return [];
    return [
      button('btn btn-primary', tr('progressOpen', this.locale), () => {
        new ClassProgressPanel(this.root, this.locale, {
          backend: progressBackend,
          classId: cls.id,
          className: cls.name,
          onClose: () => void this.showClass(cls),
        });
      }),
    ];
  }

  private async showClass(cls: ClassInfo, message?: string): Promise<void> {
    const { locale } = this;
    const { backend } = this.options;
    const feedback = status(message ?? '', 'good');
    let students: StudentInfo[] = [];
    try {
      students = await backend.listStudents(cls.id);
    } catch (e) {
      say(feedback, tr(ERROR_TEXT[toTeacherError(e).code], locale), 'bad');
    }
    const nodes: HTMLElement[] = [text('panel-title', cls.name), text('panel-feedback', `${tr('classStudents', locale)}: ${students.length}/30`), feedback];
    if (students.length === 0) nodes.push(text('panel-feedback', tr('classNoStudents', locale)));
    for (const s of students) {
      const row = document.createElement('div');
      row.className = 'column student-row';
      const fresh = this.pending.get(s.id);
      row.append(
        text('panel-feedback', `${s.nickname} · ${fresh ? `${fresh.code} · ${animalName(fresh.animal, locale)}` : `${tr('classHint', locale)} ${s.hint}…`}`),
        button('btn btn-small', tr('classRegenerate', locale), () =>
          void this.run(feedback, async () => {
            const card = await regenerateStudentCard(backend, cls.id, s, createRng(randomSeed()), this.takenFor(cls.id));
            this.pending.set(s.id, card);
            await this.showClass(cls, tr('classRegenerated', locale));
          }),
        ),
        button('btn btn-small', tr('classRemove', locale), () =>
          void this.run(feedback, async () => {
            await backend.removeStudent(s.id);
            this.pending.delete(s.id);
            await this.showClass(cls);
          }),
        ),
      );
      nodes.push(row);
    }

    const nickname = field(tr('classNickname', locale), STUDENT_NICKNAME_MAX);
    const add = button('btn btn-primary', tr('classAddStudent', locale), () => {
      const check = checkStudentNickname(nickname.value);
      if (check.ok && check.looksLikeName && this.warnedNickname !== check.nickname) {
        // Aviso de privacidad: se deja seguir si el docente insiste (pueden ser dos apodos, como «Ana P.»).
        this.warnedNickname = check.nickname;
        say(feedback, tr('classNicknameWarn', locale), 'bad');
        return;
      }
      void this.run(feedback, async () => {
        const card = await addStudentWithCard(backend, cls.id, nickname.value, createRng(randomSeed()), this.takenFor(cls.id));
        this.pending.set(card.id, card);
        this.warnedNickname = '';
        await this.showClass(cls, tr('classStudentAdded', locale));
      });
    });
    nickname.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') add.click();
    });

    const cards = [...this.pending.entries()].filter(([id]) => students.some((s) => s.id === id)).map(([, c]) => c);
    const print = button('btn btn-primary', `${tr('classPrint', locale)} (${cards.length})`, () => {
      if (cards.length === 0) say(feedback, tr('classNothingToPrint', locale), 'bad');
      else printCards(cards, cls.id);
    });
    nodes.push(
      students.length >= 30 ? text('panel-feedback', tr('teacherErrClassFull', locale)) : nickname,
      ...(students.length >= 30 ? [] : [add]),
      print,
      text('panel-feedback', tr('classPrintHelp', locale)),
      ...this.progressButton(cls),
      button('btn btn-small', tr('classBack', locale), () => void this.showClasses()),
    );
    show(this.root, ...nodes);
  }
}
