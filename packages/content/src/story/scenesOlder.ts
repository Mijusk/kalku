import type { DialogLine, SceneId } from './scenes.js';

/**
 * «Aventura»: los diálogos de Pradera Uno para 8–12 años (docs/JUEGO-SIN-FIN.md §1).
 * Mismos pasos y mismas mates que la versión de 5–8; cambia el tono: humor,
 * misterio y la Liga de Calculistas. Mismo número de líneas en el prólogo
 * (cada línea es una viñeta).
 */
const l = (who: DialogLine['who'], es: string, ca: string): DialogLine => ({ who, text: { es, ca } });

export const SCENES_OLDER: Readonly<Record<SceneId, readonly DialogLine[]>> = {
  prologue: [
    l(
      'narrator',
      'Kalku funciona con números: los puentes se sostienen con sumas y las puertas se abren con acertijos. Nadie se pregunta nunca qué pasaría sin ellos.',
      'Kalku funciona amb números: els ponts s’aguanten amb sumes i les portes s’obren amb endevinalles. Ningú no es pregunta mai què passaria sense ells.',
    ),
    l(
      'narrator',
      'Hasta que una noche, sin ruido, los números empiezan a desaparecer. Solo queda un rastro: virutas grises, como de goma de borrar.',
      'Fins que una nit, sense fer soroll, els números comencen a desaparèixer. Només en queda un rastre: encenalls grisos, com de goma d’esborrar.',
    ),
    l(
      'narrator',
      'Por la mañana, Pradera Uno está gris. El puente, caído. La cueva, a oscuras. Y las criaturas, sin chispa, ya no se fían de nadie.',
      'Al matí, Pradera Un és grisa. El pont, caigut. La cova, a les fosques. I les criatures, sense espurna, ja no es refien de ningú.',
    ),
    l(
      'narrator',
      'La Liga de Calculistas necesita a alguien nuevo. Alguien con buena cabeza para los números… Te acaban de despertar.',
      'La Lliga de Calculistes necessita algú de nou. Algú amb bon cap per als números… T’acaben de despertar.',
    ),
  ],
  'uni-hello': [
    l('uni', 'Por fin. Soy Uni, chispa oficial de la Liga. Y no, no soy una luciérnaga.', 'Per fi. Soc la Uni, espurna oficial de la Lliga. I no, no soc una cuca de llum.'),
    l('uni', 'Antes de investigar nada, déjame verte bien. ¿Qué pinta tienes?', 'Abans d’investigar res, deixa’m veure’t bé. Quina pinta fas?'),
  ],
  'tecla-training': [
    l('tecla', '{apodo}. Soy Tecla, antigua agente de la Liga de Calculistas. Retirada… hasta hoy.', '{apodo}. Soc la Tecla, antiga agent de la Lliga de Calculistes. Retirada… fins avui.'),
    l('tecla', 'Alguien está borrando los números de Kalku. Para seguirle la pista necesitamos chispas, y las chispas salen de cuentas bien resueltas.', 'Algú està esborrant els números de Kalku. Per seguir-li la pista necessitem espurnes, i les espurnes surten de comptes ben resolts.'),
    l('tecla', 'Primero, una prueba de acceso. Sin cronómetro y sin trampas: quiero ver cómo piensas.', 'Primer, una prova d’accés. Sense cronòmetre i sense trampes: vull veure com penses.'),
  ],
  'tecla-training-done': [
    l('tecla', 'Prueba superada. Te damos la bienvenida a la Liga, agente {apodo}.', 'Prova superada. Et donem la benvinguda a la Lliga, agent {apodo}.'),
    l('tecla', 'Primera pista: un Sumus Brote ha visto algo esta noche. Está gris y muerto de miedo en la hierba alta.', 'Primera pista: un Sumus Brot ha vist alguna cosa aquesta nit. És gris i mort de por a l’herba alta.'),
    l('uni', 'Devuélvele la chispa y quizá hable. Yo te cubro.', 'Torna-li l’espurna i potser parlarà. Jo et cobreixo.'),
  ],
  'first-battle-tip': [
    l('uni', 'Sin chispa ni te reconoce. Lanza una «Chispa» y resuelve la cuenta. Tranqui, no muerde. Mucho.', 'Sense espurna ni et reconeix. Llança una «Espurna» i resol el compte. Tranqui, no mossega. Gaire.'),
  ],
  'first-battle-hit': [l('uni', 'Recupera color. Buena señal: los testigos con color hablan más.', 'Recupera color. Bon senyal: els testimonis amb color parlen més.')],
  'first-battle-rescue': [
    l('uni', 'Ya casi brilla. «Rescatar», una cuenta más, y tenemos testigo.', 'Ja gairebé brilla. «Rescatar», un compte més, i tenim testimoni.'),
  ],
  'first-rescue-done': [
    l('uni', 'Testigo a salvo. Dice que vio una nube gris enorme… que hacía «ñam».', 'Testimoni a salvo. Diu que va veure un núvol gris enorme… que feia «nyam».'),
    l('tecla', 'Una nube que come números. No había oído nada parecido en cuarenta años de servicio.', 'Un núvol que menja números. No havia sentit res de semblant en quaranta anys de servei.'),
    l('tecla', 'Bruno, el carpintero, estaba junto al puente cuando se cayó. Interrógale… con amabilidad.', 'En Bruno, el fuster, era vora el pont quan va caure. Interroga’l… amb amabilitat.'),
  ],
  'bruno-planks': [
    l('bruno', '¡Yo no he sido! Estaba durmiendo y, ¡cataplum!, el puente sin números y al agua.', 'Jo no he estat! Dormia i, patapam!, el pont sense números i a l’aigua.'),
    l('bruno', 'Encima, unas criaturas se llevaron mis tres tablones. Van grises, así que no lo hacen por maldad.', 'A sobre, unes criatures es van endur els meus tres taulons. Van grises, així que no ho fan per maldat.'),
    l('bruno', 'Devuélveles la chispa en la hierba alta y recupera los tablones. Yo pongo el martillo.', 'Torna’ls l’espurna a l’herba alta i recupera els taulons. Jo hi poso el martell.'),
  ],
  'bruno-fixes': [
    l('bruno', 'Tres tablones. Ni uno más, ni uno menos. Eres de fiar, {apodo}.', 'Tres taulons. Ni un més, ni un menys. Ets de fiar, {apodo}.'),
    l('bruno', 'Por cierto: entre las tablas encontré esto. Virutas grises. Y huelen a… cuaderno viejo.', 'Per cert: entre les taules he trobat això. Encenalls grisos. I fan olor de… quadern vell.'),
    l('uni', 'Pista anotada. Y al otro lado del puente hay un cofre. No digo nada, solo lo digo.', 'Pista anotada. I a l’altra banda del pont hi ha un cofre. No dic res, només ho dic.'),
    l('uni', 'Siguiente parada: la cueva. Lina, la exploradora, dice que ha visto algo raro.', 'Pròxima parada: la cova. La Lina, l’exploradora, diu que ha vist una cosa estranya.'),
  ],
  'lina-cave': [
    l('lina', '¡Agente! Soy Lina. Te lo juro: anoche algo enorme salió de esta cueva flotando.', 'Agent! Soc la Lina. T’ho juro: ahir a la nit una cosa enorme va sortir flotant d’aquesta cova.'),
    l('lina', 'Se llevó la luz de los tres cristales. Unas criaturas grises los vigilan, como si les hubieran dado órdenes.', 'Es va endur la llum dels tres cristalls. Unes criatures grises els vigilen, com si els haguessin donat ordres.'),
    l('lina', 'Enciende los cristales y veremos qué escondía ahí dentro.', 'Encén els cristalls i veurem què hi amagava a dins.'),
  ],
  'lina-light': [
    l('lina', 'Mira las paredes: alguien ha escrito números… y los ha tachado uno a uno.', 'Mira les parets: algú hi ha escrit números… i els ha ratllat un per un.'),
    l('lina', 'Las huellas grises van hacia la Puerta de Piedra. Quien sea, se esconde detrás.', 'Les petjades grises van cap a la Porta de Pedra. Sigui qui sigui, s’amaga al darrere.'),
  ],
  'pedrolo-riddles': [
    l('pedrolo', 'Alto. Pedrolo, guardián de la Puerta. Llevo trescientos años sin dejar pasar a nadie y no pienso estropear la racha.', 'Alto. En Pedrolo, guardià de la Porta. Fa tres-cents anys que no deixo passar ningú i no penso espatllar la ratxa.'),
    l('pedrolo', 'Bueno, salvo a quien resuelva mis tres acertijos. Piensa con calma: las piedras no tenemos prisa.', 'Bé, llevat de qui resolgui les meves tres endevinalles. Pensa amb calma: les pedres no tenim pressa.'),
  ],
  'pedrolo-opens': [
    l('pedrolo', 'Tres de tres. Vaya. Se acabó la racha.', 'Tres de tres. Vaja. S’ha acabat la ratxa.'),
    l('pedrolo', 'Lo que buscas está en el claro del este. Anoche le oí llorar. No suena a villano.', 'El que busques és a la clariana de l’est. Ahir a la nit el vaig sentir plorar. No sona a dolent.'),
    l('uni', 'Las criaturas que has rescatado vienen con nosotros, {apodo}. Hora de resolver el caso.', 'Les criatures que has rescatat vénen amb nosaltres, {apodo}. Hora de resoldre el cas.'),
  ],
  'borron-appears': [
    l('borron', '¡ÑAM! ¿Una agente de la Liga? ¡Llegas tarde! ¡Ya casi no quedan números!', 'NYAM! Una agent de la Lliga? Arribes tard! Ja gairebé no queden números!'),
    l('uni', 'Caso cerrado, Gran Borrón. Devuelve lo que te has comido.', 'Cas tancat, Gran Borrón. Torna el que t’has menjat.'),
    l('borron', 'Si me los quitas, desapareceré… ¡como desaparecí del cuaderno donde nací!', 'Si me’ls treus, desapareixeré… com vaig desaparèixer del quadern on vaig néixer!'),
  ],
  'borron-shrinks': [l('borron', '¡Eh! ¡Sin números me encojo! Esto no estaba en el plan…', 'Eh! Sense números m’encongeixo! Això no era al pla…')],
  finale: [
    l('borroncito', 'Snif… Era un tachón de un cuaderno viejo. Alguien arrancó la hoja y me quedé sin casa.', 'Snif… Era una ratllada d’un quadern vell. Algú va arrencar el full i em vaig quedar sense casa.'),
    l('borroncito', 'Una voz me dijo que, si comía números, volvería a ser grande. No sé de quién era. Firmaba con un cero.', 'Una veu em va dir que, si menjava números, tornaria a ser gran. No sé de qui era. Signava amb un zero.'),
    l('tecla', 'Un cero… Vaya. Eso explica muchas cosas. Pequeño, aquí tendrás tachones de sobra y nadie te arrancará de ningún sitio.', 'Un zero… Vaja. Això explica moltes coses. Petit, aquí tindràs ratllades de sobres i ningú no t’arrencarà d’enlloc.'),
    l('uni', 'Pradera Uno recupera sus colores. Buen trabajo, agente {apodo}.', 'Pradera Un recupera els colors. Bona feina, agent {apodo}.'),
    l('tecla', 'Pero el caso no está cerrado. Al otro lado del río, en el Bosque de las Decenas, también faltan números… Continuará.', 'Però el cas no està tancat. A l’altra banda del riu, al Bosc de les Desenes, també hi falten números… Continuarà.'),
  ],
  defeat: [
    l('uni', 'Retirada táctica. Descansamos y volvemos. No has perdido nada: tu placa y tus cosas siguen aquí.', 'Retirada tàctica. Descansem i tornem. No has perdut res: la teva placa i les teves coses continuen aquí.'),
  ],
  'idle-uni': [l('uni', 'La tarjeta de arriba es tu expediente: ahí pone el siguiente paso.', 'La targeta de dalt és el teu expedient: hi diu el pròxim pas.')],
  'idle-tecla': [l('tecla', 'Un buen agente comprueba sus cuentas dos veces, {apodo}.', 'Un bon agent comprova els comptes dues vegades, {apodo}.')],
  'idle-bruno': [l('bruno', 'Si vuelves a ver virutas grises, avísame. Las guardo en un tarro.', 'Si tornes a veure encenalls grisos, avisa’m. Els guardo en un pot.')],
  'idle-lina': [l('lina', 'Estoy dibujando un mapa de todos los números tachados de la cueva. Algo esconden.', 'Estic dibuixant un mapa de tots els números ratllats de la cova. Alguna cosa amaguen.')],
  'idle-pedrolo': [l('pedrolo', 'Una puerta abierta también hay que vigilarla. Sobre todo de ceros.', 'Una porta oberta també s’ha de vigilar. Sobretot de zeros.')],
  'idle-borroncito': [l('borroncito', '¿Tienes algún cuaderno viejo? Prometo comerme solo los tachones.', 'Tens algun quadern vell? Prometo menjar-me només les ratllades.')],
  'after-ending': [
    l('uni', 'Caso de Pradera Uno resuelto. Aún quedan criaturas por rescatar y gemas por ganar… y un cero por encontrar.', 'Cas de Pradera Un resolt. Encara queden criatures per rescatar i gemmes per guanyar… i un zero per trobar.'),
  ],
};
