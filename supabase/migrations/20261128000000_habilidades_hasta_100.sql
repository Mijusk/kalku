-- Bosque de las Decenas (#99): habilidades nuevas hasta 100.
-- Mismos ids que SkillId en packages/exercises/src/types.ts.
alter table public.progress drop constraint progress_skill_check;
alter table public.progress add constraint progress_skill_check check (skill in (
  'add-within-10',
  'sub-within-10',
  'add-within-20-no-carry',
  'sub-within-20-no-borrow',
  'add-within-20-carry',
  'sub-within-20-borrow',
  'word-problems-within-10',
  'tens-units',
  'add-within-100-no-carry',
  'sub-within-100-no-borrow',
  'add-within-100-carry',
  'sub-within-100-borrow',
  'word-problems-within-100'
));

alter table public.answers drop constraint answers_skill_check;
alter table public.answers add constraint answers_skill_check check (skill in (
  'add-within-10',
  'sub-within-10',
  'add-within-20-no-carry',
  'sub-within-20-no-borrow',
  'add-within-20-carry',
  'sub-within-20-borrow',
  'word-problems-within-10',
  'tens-units',
  'add-within-100-no-carry',
  'sub-within-100-no-borrow',
  'add-within-100-carry',
  'sub-within-100-borrow',
  'word-problems-within-100'
));
