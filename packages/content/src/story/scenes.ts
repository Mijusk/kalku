import type { PortraitId } from '@kalku/art';
import type { Localized } from '@kalku/exercises';

/**
 * Diálogos de la historia de Pradera Uno, como datos (guion en docs/HISTORIA.md).
 * Cada escena es una lista de globos: quién habla y qué dice, en castellano y
 * catalán. `{apodo}` se cambia por el apodo del niño (nunca su nombre real).
 * Frases cortas: se leen en voz alta.
 */
export type CharacterId = 'narrator' | 'uni' | 'tecla' | 'bruno' | 'lina' | 'pedrolo' | 'borron' | 'borroncito' | 'olma' | 'cuco' | 'enredo' | 'ovillo';

export interface CharacterDefinition {
  id: CharacterId;
  name: Localized;
}

export const CHARACTERS: readonly CharacterDefinition[] = [
  { id: 'narrator', name: { es: '', ca: '' } },
  { id: 'uni', name: { es: 'Uni', ca: 'Uni' } },
  { id: 'tecla', name: { es: 'Abuela Tecla', ca: 'Àvia Tecla' } },
  { id: 'bruno', name: { es: 'Bruno', ca: 'Bruno' } },
  { id: 'lina', name: { es: 'Lina', ca: 'Lina' } },
  { id: 'pedrolo', name: { es: 'Pedrolo', ca: 'Pedrolo' } },
  { id: 'borron', name: { es: 'Gran Borrón', ca: 'Gran Borrón' } },
  { id: 'borroncito', name: { es: 'Borroncito', ca: 'Borronet' } },
  { id: 'olma', name: { es: 'Olma', ca: 'Olma' } },
  { id: 'cuco', name: { es: 'Cuco', ca: 'Cuco' } },
  { id: 'enredo', name: { es: 'Gran Enredo', ca: 'Gran Embolic' } },
  { id: 'ovillo', name: { es: 'Ovillo', ca: 'Cabdell' } },
];

export interface DialogLine {
  who: CharacterId;
  text: Localized;
}

export type SceneId =
  | 'prologue'
  | 'uni-hello'
  | 'tecla-training'
  | 'tecla-training-done'
  | 'first-battle-tip'
  | 'first-battle-hit'
  | 'first-battle-rescue'
  | 'first-rescue-done'
  | 'bruno-planks'
  | 'bruno-fixes'
  | 'lina-cave'
  | 'lina-light'
  | 'pedrolo-riddles'
  | 'pedrolo-opens'
  | 'borron-appears'
  | 'borron-shrinks'
  | 'finale'
  | 'defeat'
  | 'idle-uni'
  | 'idle-tecla'
  | 'idle-bruno'
  | 'idle-lina'
  | 'idle-pedrolo'
  | 'idle-borroncito'
  | 'after-ending'
  // Bosque de las Decenas
  | 'forest-arrive'
  | 'olma-hello'
  | 'olma-path'
  | 'olma-lanterns'
  | 'cuco-riddles'
  | 'cuco-opens'
  | 'enredo-appears'
  | 'enredo-shrinks'
  | 'forest-finale'
  | 'forest-after-ending'
  | 'idle-olma'
  | 'idle-cuco'
  | 'idle-ovillo';

const l = (who: CharacterId, es: string, ca: string): DialogLine => ({ who, text: { es, ca } });

export const SCENES: Readonly<Record<SceneId, readonly DialogLine[]>> = {
  prologue: [
    l(
      'narrator',
      'Esto es Kalku, un mundo que funciona con números. El puente se sostiene con sumas y el reloj de la plaza cuenta las horas.',
      "Això és Kalku, un món que funciona amb números. El pont s'aguanta amb sumes i el rellotge de la plaça compta les hores.",
    ),
    l(
      'narrator',
      'Una noche llegó el Gran Borrón, una nube de goma de borrar con muchísima hambre… ¡de números!',
      'Una nit va arribar el Gran Borrón, un núvol de goma d’esborrar amb moltíssima gana… de números!',
    ),
    l(
      'narrator',
      'Se comió los números del puente, de la cueva y de la Puerta de Piedra. El pueblo se quedó gris y las criaturas, sin su chispa, se escondieron asustadas.',
      "Es va menjar els números del pont, de la cova i de la Porta de Pedra. El poble es va quedar gris i les criatures, sense la seva espurna, es van amagar espantades.",
    ),
    l(
      'narrator',
      'Pero en una casita del pueblo, alguien se está despertando… ¡Eres tú!',
      "Però en una caseta del poble, algú s'està despertant… Ets tu!",
    ),
  ],
  'uni-hello': [
    l('uni', '¡Hola! Soy Uni, una chispa de número. ¡Por fin te despiertas!', 'Hola! Soc la Uni, una espurna de número. Per fi et despertes!'),
    l('uni', 'Con tanto gris casi no te veo. ¿Cómo eres?', 'Amb tant de gris gairebé no et veig. Com ets?'),
  ],
  'tecla-training': [
    l('tecla', '¡{apodo}! Qué alegría verte. Soy la abuela Tecla, la última Calculista del pueblo.', "{apodo}! Quina alegria veure't. Soc l'àvia Tecla, l'última Calculista del poble."),
    l('tecla', 'Para devolver los números necesitamos chispas. Y las chispas salen de las cuentas bien hechas.', 'Per tornar els números necessitem espurnes. I les espurnes surten dels comptes ben fets.'),
    l('tecla', 'Vamos a entrenar un poco. Resuelve mis cuentas sin prisa: aquí no se puede fallar.', 'Entrenem una mica. Resol els meus comptes sense pressa: aquí no es pot fallar.'),
  ],
  'tecla-training-done': [
    l('tecla', '¡Qué buena puntería! Ya sé por dónde tienes que empezar.', 'Quina bona punteria! Ja sé per on has de començar.'),
    l('tecla', 'Escucha… En la hierba alta hay un Sumus Brote asustado. ¿Le ayudas?', 'Escolta… A l’herba alta hi ha un Sumus Brot espantat. L’ajudes?'),
    l('uni', '¡Vamos! Yo te enseño cómo se hace.', 'Som-hi! Jo t’ensenyo com es fa.'),
  ],
  'first-battle-tip': [
    l('uni', '¡Está gris: ha perdido su chispa! Toca «Chispa» y resuelve la cuenta.', 'Està gris: ha perdut la seva espurna! Toca «Espurna» i resol el compte.'),
  ],
  'first-battle-hit': [
    l('uni', '¡Mira, ya recupera el color! Sigue así.', 'Mira, ja recupera el color! Continua així.'),
  ],
  'first-battle-rescue': [
    l('uni', '¡Ya casi brilla! Toca «Rescatar», resuelve la cuenta y se vendrá con nosotros.', 'Ja gairebé brilla! Toca «Rescatar», resol el compte i vindrà amb nosaltres.'),
  ],
  'first-rescue-done': [
    l('uni', '¡Lo has conseguido! Ya tenemos un amigo más.', 'Ho has aconseguit! Ja tenim un amic més.'),
    l('tecla', '¿Lo ves? Ya ha vuelto un poco de color al pueblo.', 'Ho veus? Ja ha tornat una mica de color al poble.'),
    l('tecla', 'Bruno, el carpintero, está muy triste junto al río. Ve a verle, por favor.', 'En Bruno, el fuster, està molt trist vora el riu. Ves a veure’l, si us plau.'),
  ],
  'bruno-planks': [
    l('bruno', '¡Ay, ay, ay! El Borrón se comió los números del puente y se ha caído.', 'Ai, ai, ai! El Borrón es va menjar els números del pont i ha caigut.'),
    l('bruno', 'Y unas criaturas traviesas se han llevado mis tres tablones.', "I unes criatures entremaliades s'han endut els meus tres taulons."),
    l('bruno', 'Si les devuelves la chispa, seguro que te los dan. ¡Busca en la hierba alta!', 'Si els tornes l’espurna, segur que te’ls donen. Busca a l’herba alta!'),
  ],
  'bruno-fixes': [
    l('bruno', '¡Mis tres tablones! Gracias, {apodo}.', 'Els meus tres taulons! Gràcies, {apodo}.'),
    l('bruno', 'Uno, más otro, más otro… ¡tres! El puente vuelve a sostenerse.', 'Un, més un altre, més un altre… tres! El pont torna a aguantar-se.'),
    l('uni', '¡Al otro lado hay un cofre! Y mira… vuelve el color.', 'A l’altre costat hi ha un cofre! I mira… torna el color.'),
    l('uni', 'Lina, la exploradora, nos espera en la cueva.', 'La Lina, l’exploradora, ens espera a la cova.'),
  ],
  'lina-cave': [
    l('lina', '¡Hola! Soy Lina. Quiero explorar la cueva, pero está oscurísima.', 'Hola! Soc la Lina. Vull explorar la cova, però està foscíssima.'),
    l('lina', 'El Borrón apagó los tres cristales que la iluminan. Unas criaturas grises los vigilan.', 'El Borrón va apagar els tres cristalls que la il·luminen. Unes criatures grises els vigilen.'),
    l('lina', 'Toca cada cristal y devuelve la chispa a quien lo vigila. ¡Se encenderán!', "Toca cada cristall i torna l'espurna a qui el vigila. S'encendran!"),
  ],
  'lina-light': [
    l('lina', '¡Qué brillo! Ahora la cueva es preciosa.', 'Quina brillantor! Ara la cova és preciosa.'),
    l('lina', 'He visto huellas grises que van a la Puerta de Piedra. ¡El Borrón está cerca!', 'He vist petjades grises que van a la Porta de Pedra. El Borrón és a prop!'),
  ],
  'pedrolo-riddles': [
    l('pedrolo', 'Grrr… Soy Pedrolo, guardián de la Puerta de Piedra.', 'Grrr… Soc en Pedrolo, guardià de la Porta de Pedra.'),
    l('pedrolo', 'Nadie pasa sin resolver mis tres acertijos. Piensa con calma: aquí no hay prisa.', 'Ningú no passa sense resoldre les meves tres endevinalles. Pensa amb calma: aquí no hi ha pressa.'),
  ],
  'pedrolo-opens': [
    l('pedrolo', 'Tres de tres. Eres Calculista de verdad.', 'Tres de tres. Ets Calculista de debò.'),
    l('pedrolo', 'El Borrón se esconde en el claro del este. ¡Ve con cuidado!', "El Borrón s'amaga a la clariana de l'est. Vés amb compte!"),
    l('uni', '¡Vamos, {apodo}! Las criaturas que has rescatado vienen con nosotros.', 'Som-hi, {apodo}! Les criatures que has rescatat vénen amb nosaltres.'),
  ],
  'borron-appears': [
    l('borron', '¡ÑAM! ¿Quién se atreve a molestarme mientras ceno números?', 'ÑAM! Qui s’atreveix a molestar-me mentre sopo números?'),
    l('uni', '¡Devuelve los números a Kalku!', 'Torna els números a Kalku!'),
    l('borron', '¡Nunca! ¡Están riquísimos!', 'Mai! Són boníssims!'),
  ],
  'borron-shrinks': [l('borron', '¡Uf! Me estoy haciendo pequeño…', 'Uf! M’estic fent petit…')],
  finale: [
    l('borroncito', 'Snif… Solo tenía hambre. Y estaba muy solo.', 'Snif… Només tenia gana. I estava molt sol.'),
    l('tecla', 'Pequeño, los números no se comen. Pero tengo algo mejor: ¡tachones de cuadernos viejos!', 'Petit, els números no es mengen. Però tinc una cosa millor: ratllades de quaderns vells!'),
    l('borroncito', '¡Ñam! ¡Buenísimos! ¿Me puedo quedar en el pueblo?', 'Ñam! Boníssimes! Em puc quedar al poble?'),
    l('uni', '¡Claro! Y mira, {apodo}: ¡Kalku vuelve a tener todos sus colores!', 'És clar! I mira, {apodo}: Kalku torna a tenir tots els colors!'),
    l('tecla', 'Gracias, Calculista. Pero al otro lado del río está el Bosque de las Decenas… Continuará.', "Gràcies, Calculista. Però a l'altra banda del riu hi ha el Bosc de les Desenes… Continuarà."),
  ],
  defeat: [
    l('uni', '¡Uf! Vamos a descansar un poco. No has perdido nada: todo lo que tenías sigue aquí.', 'Uf! Descansem una mica. No has perdut res: tot el que tenies continua aquí.'),
  ],
  'idle-uni': [l('uni', '¿Seguimos? Mira la tarjeta de arriba: ahí pone qué toca.', 'Continuem? Mira la targeta de dalt: hi diu què toca.')],
  'idle-tecla': [l('tecla', 'Cada cuenta bien hecha es una chispa, {apodo}. ¡Ánimo!', 'Cada compte ben fet és una espurna, {apodo}. Ànim!')],
  'idle-bruno': [l('bruno', '¡Hola, {apodo}! Este puente aguantará cien años.', 'Hola, {apodo}! Aquest pont aguantarà cent anys.')],
  'idle-lina': [l('lina', 'Algún día exploraré todas las cuevas de Kalku.', 'Algun dia exploraré totes les coves de Kalku.')],
  'idle-pedrolo': [l('pedrolo', 'Grrr… Una puerta abierta también hay que vigilarla.', 'Grrr… Una porta oberta també s’ha de vigilar.')],
  'idle-borroncito': [l('borroncito', '¡Ñam, tachones! ¿Tienes algún cuaderno viejo?', 'Ñam, ratllades! Tens algun quadern vell?')],
  'after-ending': [
    l('uni', '¡Hemos salvado Pradera Uno! Aún quedan criaturas por rescatar y gemas por ganar.', 'Hem salvat Pradera Un! Encara queden criatures per rescatar i gemmes per guanyar.'),
    l('uni', 'Y mira el cartel del camino: ¡ya se puede ir al Bosque de las Decenas!', 'I mira el cartell del camí: ja es pot anar al Bosc de les Desenes!'),
  ],

  // Bosque de las Decenas (docs/HISTORIA.md): números hasta 100.
  'forest-arrive': [
    l('uni', '¡Qué árboles tan altos! Aquí todo va de diez en diez: diez hojas, diez ramas, diez bellotas…', 'Quins arbres tan alts! Aquí tot va de deu en deu: deu fulles, deu branques, deu glans…'),
    l('uni', 'Pero algo lo ha enredado todo. Mira, ¡las lianas lo tapan todo de gris!', 'Però alguna cosa ho ha embolicat tot. Mira, les lianes ho tapen tot de gris!'),
  ],
  'olma-hello': [
    l('olma', '¡Hola! Soy Olma, la guardabosques. ¡Qué bien que hayas venido, {apodo}!', 'Hola! Soc l’Olma, la guardaboscos. Quina sort que hagis vingut, {apodo}!'),
    l('olma', 'El Gran Enredo ha mezclado las decenas con las unidades. Las criaturas ya no saben contar sus bellotas.', 'El Gran Embolic ha barrejat les desenes amb les unitats. Les criatures ja no saben comptar els glans.'),
    l('olma', '¿Les devuelves la chispa? Cada una te dará una bellota. Necesito tres.', 'Els tornes l’espurna? Cadascuna et donarà un gla. En necessito tres.'),
  ],
  'olma-path': [
    l('olma', '¡Tres bellotas! Con ellas abro el camino del claro de los farolillos.', 'Tres glans! Amb ells obro el camí de la clariana dels fanalets.'),
    l('olma', 'Pero los farolillos se han apagado. Cada uno se enciende con una buena cuenta.', 'Però els fanalets s’han apagat. Cadascun s’encén amb un bon compte.'),
  ],
  'olma-lanterns': [
    l('olma', '¡Mira qué luz! Ya se ve el camino al Árbol Hueco.', 'Mira quina llum! Ja es veu el camí de l’Arbre Buit.'),
    l('olma', 'Allí vive Cuco, el búho. Solo deja pasar a quien resuelve sus acertijos.', 'Allà hi viu en Cuco, el mussol. Només deixa passar qui resol les seves endevinalles.'),
  ],
  'cuco-riddles': [
    l('cuco', '¡Uh-uh! ¿Quién viene? ¿Alguien que sabe calcular?', 'Uh-uh! Qui ve? Algú que sap calcular?'),
    l('cuco', 'Si resuelves tres acertijos, te abro el Árbol Hueco. Piensa despacio, que no hay prisa.', 'Si resols tres endevinalles, t’obro l’Arbre Buit. Pensa a poc a poc, que no hi ha pressa.'),
  ],
  'cuco-opens': [
    l('cuco', '¡Uh-uh! ¡Tres de tres! Pasa, pasa.', 'Uh-uh! Tres de tres! Passa, passa.'),
    l('cuco', 'El Gran Enredo está en el corazón del bosque. No es malo… solo está muy liado.', 'El Gran Embolic és al cor del bosc. No és dolent… només està molt embolicat.'),
  ],
  'enredo-appears': [
    l('enredo', '¡Grrr! ¡Cuarenta y siete, setenta y cuatro, todo es lo mismo!', 'Grrr! Quaranta-set, setanta-quatre, tot és el mateix!'),
    l('uni', '¡No es lo mismo! Las decenas van delante y las unidades detrás. ¡Te lo enseñamos!', 'No és el mateix! Les desenes van davant i les unitats darrere. T’ho ensenyem!'),
  ],
  'enredo-shrinks': [l('enredo', '¡Eh! Cada cuenta bien hecha me deshace un nudo…', 'Eh! Cada compte ben fet em desfà un nus…')],
  'forest-finale': [
    l('ovillo', '¡Qué ligero me siento! Era un ovillo de lana y me enredé con todos los números.', 'Que lleuger que em sento! Era un cabdell de llana i em vaig embolicar amb tots els números.'),
    l('olma', 'Pues aquí te quedas, Ovillo. Nos ayudarás a contar bellotas de diez en diez.', 'Doncs aquí et quedes, Cabdell. Ens ajudaràs a comptar glans de deu en deu.'),
    l('uni', '¡El bosque vuelve a tener color, {apodo}! ¿Qué habrá más allá de los árboles?', 'El bosc torna a tenir color, {apodo}! Què hi haurà més enllà dels arbres?'),
  ],
  'forest-after-ending': [
    l('uni', '¡Hemos salvado el Bosque de las Decenas! Pronto se abrirán más caminos. Mientras, Olma, Cuco y Ovillo tienen encargos para ti.', 'Hem salvat el Bosc de les Desenes! Aviat s’obriran més camins. Mentrestant, l’Olma, en Cuco i en Cabdell tenen encàrrecs per a tu.'),
  ],
  'idle-olma': [l('olma', 'Diez bellotas hacen una decena. ¡Así se cuenta en el bosque!', 'Deu glans fan una desena. Així es compta al bosc!')],
  'idle-cuco': [l('cuco', 'Uh-uh… Pensar despacio también es pensar bien.', 'Uh-uh… Pensar a poc a poc també és pensar bé.')],
  'idle-ovillo': [l('ovillo', '¡Ya no me enredo! Mira: cuatro decenas y siete unidades, cuarenta y siete.', 'Ja no m’embolico! Mira: quatre desenes i set unitats, quaranta-set.')],
};

export function characterName(id: CharacterId): Localized {
  return CHARACTERS.find((c) => c.id === id)?.name ?? { es: '', ca: '' };
}

/** Pone el apodo en `{apodo}`. Si no hay apodo, «Calculista». */
export function fillText(text: string, nickname: string | undefined, locale: 'es' | 'ca'): string {
  // «Calculista» se dice igual en los dos idiomas.
  const name = nickname && nickname.trim() !== '' ? nickname.trim() : locale === 'ca' ? 'Calculista' : 'Calculista';
  return text.split('{apodo}').join(name);
}

/** Retrato (de `@kalku/art`) de cada personaje. El narrador no tiene. */
export const PORTRAITS_BY_CHARACTER: Readonly<Record<CharacterId, PortraitId | undefined>> = {
  narrator: undefined,
  uni: 'uni',
  tecla: 'tecla',
  bruno: 'bruno',
  lina: 'lina',
  pedrolo: 'pedrolo',
  borron: 'borron',
  borroncito: 'borroncito',
  olma: 'olma',
  cuco: 'cuco',
  enredo: 'enredo',
  ovillo: 'ovillo',
};

/**
 * Tramo de la historia (docs/JUEGO-SIN-FIN.md §1): `young` = «Brote» (5–8
 * años), `older` = «Aventura» (8–12). Solo cambia el tono, nunca las mates.
 */
export type Band = 'young' | 'older';

export const BANDS: readonly Band[] = ['young', 'older'];

/** Curso escolar: 0 = Infantil 5 años, 1–6 = Primaria. */
export const GRADES: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

/** Tramo que le toca a un curso: hasta 2.º, «Brote»; desde 3.º, «Aventura». */
export function bandForGrade(grade: number): Band {
  return grade >= 3 ? 'older' : 'young';
}
