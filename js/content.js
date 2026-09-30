/**
 * Every word of the experience lives here. A "fragment" is an array of lines;
 * lines of one fragment appear one after another, fragments wait for the reader.
 */

export const CONTENT = {
  umbral: {
    title: 'Hay cosas que la distancia no sabe medir.',
    hint: 'toca para entrar',
    soundOn: 'con sonido',
    soundOff: 'en silencio',
  },

  distancia: {
    label: 'distancia',
    first: [['Dos puntos.', 'Un mismo universo.']],
    ruler: [
      ['Sobre un mapa, la distancia es solo un número.'],
      ['Kilómetros, pantallas, días que se acumulan.'],
    ],
    holdHint: 'mantén presionado',
    line: [
      ['Lo que ningún mapa muestra es cuántas veces al día hace el viaje el pensamiento.'],
      ['Es una línea muy fina.', 'Aun así, aguanta.'],
    ],
    dive: [['Ven. Te muestro lo que veo desde aquí.']],
  },

  explore: {
    dragHint: 'arrastra para recorrer el universo',
    tapHint: 'toca la estrella',
    compassLabel: 'ir hacia la siguiente estrella',
  },

  nodes: {
    admiracion: {
      label: 'admiración',
      hint: 'mantén presionado para enfocar',
      fragments: [
        ['Admirar no es lo mismo que mirar.', 'Mirar es rápido. Admirar es quedarse hasta que todo se vuelve nítido.'],
        ['Y cuando me quedo, lo que se vuelve nítido eres tú:', 'más firme, más serena, más dueña de tus decisiones.'],
        ['Me gusta lo que veo.', 'No pretendo cambiar nada con decírtelo. Solo quería que lo supieras.'],
      ],
    },
    crecimiento: {
      label: 'crecimiento',
      hint: 'une las estrellas con el dedo',
      fragments: [
        ['Crecer casi nunca se nota mientras ocurre.'],
        ['Se nota después, cuando te das cuenta', 'de que ya no cabes en ciertos lugares.'],
        ['Hay una versión de ti que todavía no alcanzas a ver completa.', 'Yo la veo asomarse.'],
      ],
    },
    paz: {
      label: 'paz',
      hint: 'quédate quieto un momento',
      fragments: [
        ['Te veo elegir la calma,', 'incluso cuando el ruido sería más fácil.'],
        ['Los hábitos nuevos, las rutinas pequeñas, el tiempo que te das:', 'todo eso es una manera de cuidarte bien.'],
        ['Hay quien opina de una estrella sin haberla mirado nunca de cerca.', 'La estrella sigue siendo lo que es.'],
        ['Y tú no necesitas que todos vean cómo brillas.', 'Eres más que cualquier palabra dicha desde lejos. Más que cualquiera.'],
        ['Desde acá se nota.', 'Se nota más de lo que crees.'],
      ],
    },
    familia: {
      label: 'familia',
      hint: 'acércalas',
      fragments: [
        ['Me gusta ver cómo te acercas a tu familia.', 'Cómo vuelves a ese lugar donde te conocen desde siempre.'],
        ['Nadie crece del todo solo.', 'Y tú tienes gente que te sostiene mientras lo haces.'],
        ['Eso también es parte de quién eres.'],
      ],
    },
    suenos: {
      label: 'sueños',
      hint: 'desliza el dedo, despacio',
      fragments: [
        ['A veces uno empieza a dudar del camino que se imaginó.', 'Dudar no significa haberse perdido.'],
        ['Un sueño puede cambiar de forma', 'sin dejar de significar lo mismo.'],
        ['Eso que te llevó a imaginarte psicóloga —querer entender, acompañar, escuchar sin juzgar— no vive en un diploma.', 'Vive en ti.'],
        ['Así que, siga el camino que siga,', 'mi admiración no cambia.'],
        ['Tu valor nunca dependió de una profesión.', 'Depende de quién eres mientras caminas.'],
      ],
    },
    tiempo: {
      label: 'tiempo',
      hint: 'mantén presionado para detener el tiempo',
      fragments: [
        ['Ahora mismo cada quien gira alrededor de lo suyo:', 'sus rutinas, sus metas, sus horarios.'],
        ['Pero las órbitas cambian.', 'Los caminos se cruzan, se alejan, vuelven a cruzarse.'],
        ['No sé en qué punto se cruzarán los nuestros.', 'Solo sé que me alegra que todavía puedan hacerlo.'],
      ],
    },
    vinculo: {
      label: 'nosotros',
      hint: 'toca la estrella cercana',
      hintAgain: 'otra vez',
      fragments: [
        ['Hay conexiones que no necesitan cercanía para seguir vivas.'],
        ['Tú y yo tenemos una de esas.', 'Algo especial, difícil de explicar, que sigue ahí aunque el mundo haya movido las piezas.'],
        ['No la llamo destino.', 'La llamo algo que vale la pena cuidar.'],
      ],
    },
  },

  futuro: {
    label: 'futuro',
    intro: [['Ahora déjame enseñarte algo que a veces imagino.']],
    hint: 'mueve el dedo en círculos',
    keepHint: 'sigue girando, ya casi',
    beaconHint: 'toca la luz blanca del centro',
    /** Shown automatically as the two points get closer (progress 0..1). */
    milestones: [
      { at: 0.08, lines: ['Quizá un día ya no tengamos que imaginar ciertos momentos.', 'Simplemente estarán pasando.'] },
      { at: 0.32, lines: ['Conocernos por fin sin una pantalla en medio.', 'Que una tarde cualquiera sea suficiente.'] },
      { at: 0.56, lines: ['Una casa con ruido bueno.', 'Un niño y una niña.', 'Nuestros dos frenchies, adueñados del mejor lugar del sofá.'] },
      { at: 0.8, lines: ['No lo digo como una promesa, ni como una deuda.', 'Lo digo como un sueño bonito que me gusta tener cerca.'] },
    ],
    closing: [
      ['No sé qué forma tendrá el futuro.'],
      ['Pero me gusta pensar que todavía quedan caminos por recorrer,', 'y que quizá, si la vida quiere, podamos recorrer alguno en la misma dirección.'],
    ],
  },

  finale: {
    line: 'Todavía queda camino.',
    name: 'Camila.',
    love: 'Te amo.',
    sign: '— Branner',
    footer: 'hecho con cariño por Branner',
    again: 'volver al universo',
    back: 'volver al final',
    credits: 'créditos',
  },

  /** Small thoughts scattered across the sky. Each one has to be found. */
  hidden: [
    ['hoy pensé en ti.', 'nada urgente. solo eso.'],
    ['te has vuelto buena compañía', 'para ti misma.'],
    ['el silencio también es', 'un lugar donde se está bien.'],
    ['no todo lo importante', 'avanza rápido.'],
    ['cada paso pequeño cuenta.', 'los tuyos los he visto.'],
    ['estás llegando a lugares', 'donde antes no creías caber.'],
    ['un mismo cielo,', 'desde dos ventanas distintas.'],
    ['hay días lentos.', 'esos también suman.'],
    ['te imagino riéndote de algo tonto', 'y se me arregla el día.'],
    ['me enorgullece más', 'de lo que sé decir.'],
    ['cuídate mucho.', 'en serio.'],
    ['a veces basta saber', 'que estás bien, en algún lugar.'],
    ['lo que digan de una estrella', 'no cambia lo que es.'],
  ],

  epilogue: {
    found: (n, total) => `fragmentos encontrados · ${n} de ${total}`,
  },
};
