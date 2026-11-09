// Everything the projected class says, in the order it is said. Edit the texts
// here and run `npm run build`. The class is scripted: no text depends on what
// the students answer, the presenters resolve that out loud.
//
// Two parts follow each other on the same page: the explanatory lap (one car,
// fourteen slides) and the game (four cars, twelve cards).
// Article numbers written as "(art. 1280)" or "(arts. 984 a 989)" are shown
// smaller and in grey at the end of the line.

export const TITULO = 'Destino: Sano y Salvo';
export const SUBTITULO = 'Contratos Civiles y Comerciales · Facultad de Derecho (UBA) · Grupo 7';
export const TEMA = 'Contrato de transporte';

// ---------------------------------------------------------------- the lap

// The three stretches of road, in both parts. In the lap each one is explained
// by one presenter and covers these content squares.
export const ZONAS = [
  { id: 'embarco', nombre: 'Embarco', tema: 'El contrato', color: '#91BDE1', desde: 1, hasta: 6 },
  { id: 'viaje', nombre: 'Viaje', tema: 'La responsabilidad', color: '#F7A600', desde: 7, hasta: 10 },
  { id: 'desembarco', nombre: 'Desembarco', tema: 'Las plataformas', color: '#3BC3AD', desde: 11, hasta: 14 },
];

// Rigged spinner of the lap: one number per spin. The last one reaches Destino.
// The car really moves that many squares, so the 14 slides land on
// 3, 5, 9, 10, 13, 18, 20, 23, 25, 29, 30, 33, 35, 38 and Destino is 40.
export const GIROS_VUELTA = [3, 2, 4, 1, 3, 5, 2, 3, 2, 4, 1, 3, 2, 3, 2];
export const CASILLAS_VUELTA = 40;

export const AUTO_VUELTA = { nombre: 'Toda la clase', color: '#F7A600', vehiculo: 'auto' };

// One slide per content square. `diseno` picks the layout; `partes` is how many
// clicks reveal the body (default 1).
export const VUELTA = [
  {
    tema: 'Historia y evolución',
    icono: 'reloj',
    titulo: 'Historia y evolución del contrato',
    diseno: 'linea',
    hitos: [
      { fecha: 'Código de Comercio', texto: 'El transportista responde por los daños al viajero, salvo que pruebe una eximente (art. 184)' },
      { fecha: '1994', texto: 'La Constitución suma el derecho de los usuarios a la seguridad (art. 42 CN)' },
      { fecha: '2008 y 2010', texto: 'La Corte lo aplica al transporte (Ledesma y Uriarte Martínez)' },
      { fecha: '2015', texto: 'El Código Civil y Comercial regula el contrato (arts. 1280 a 1318)' },
    ],
  },
  {
    tema: 'Definición, partes y clases de transporte',
    icono: 'contrato',
    titulo: '¿Qué es el contrato de transporte?',
    diseno: 'renglones',
    renglones: [
      'Las partes: el transportista se obliga a trasladar personas o cosas, y el pasajero o el cargador a pagar un precio (art. 1280)',
      'Si alguien te lleva por cortesía, como un amigo, no hay contrato',
      'El viaje gratuito queda afuera, salvo que lo haga quien ofrece el servicio al público (art. 1282)',
      'Un viaje por app es transporte de personas, terrestre, urbano y oneroso',
    ],
  },
  {
    tema: 'Personas y cosas',
    icono: 'personaCaja',
    titulo: 'Personas y cosas: dos regímenes distintos',
    diseno: 'columnas',
    columnas: [
      { icono: 'persona', titulo: 'Personas', renglones: ['Hay que llevarlas sanas y salvas', 'No se puede limitar la responsabilidad por daños corporales (art. 1292)'] },
      { icono: 'caja', titulo: 'Cosas', renglones: ['Hay que entregarlas en el mismo estado', 'En cosas frágiles se puede pactar responder solo por culpa'] },
    ],
    pie: 'El equipaje entregado sigue las reglas de las cosas (art. 1293). Por lo que el pasajero lleva consigo, solo se responde con culpa probada (art. 1294).',
  },
  {
    tema: 'Caracteres, adhesión y consumo',
    icono: 'firma',
    titulo: 'Caracteres, adhesión y consumo',
    diseno: 'renglones',
    subtitulo: 'Bilateral · oneroso · conmutativo · no formal · nominado',
    renglones: [
      'Es por adhesión: el usuario no negocia nada, acepta lo que redactó la empresa (arts. 984 a 989)',
      'Si el pasajero es consumidor, es un contrato de consumo: ante la duda, se interpreta a su favor (art. 1095)',
      'La empresa tiene que informar en forma clara y detallada (art. 1100)',
    ],
  },
  {
    tema: 'Las etapas y las obligaciones',
    icono: 'etapas',
    titulo: 'Las etapas y las obligaciones',
    diseno: 'etapas',
    etapas: ['Embarco', 'Traslado', 'Desembarco'],
    columnas: [
      {
        titulo: 'Transportista',
        renglones: [
          'Trasladar al pasajero, llevar su equipaje y, sobre todo, cuidar su seguridad (art. 1289)',
          'Si ofrece el servicio al público, aceptar los pedidos y tratar a todos por igual (art. 1283)',
        ],
      },
      { titulo: 'Pasajero', renglones: ['Pagar el precio, presentarse a tiempo y cumplir los reglamentos (art. 1290)'] },
    ],
    partes: 3,
  },
  {
    tema: 'Extinción',
    icono: 'bandera',
    titulo: 'Modos de extinción del contrato',
    diseno: 'extincion',
    grupos: [
      { titulo: 'Normal', renglones: ['El cumplimiento: el pasajero llega a destino, sano y con su equipaje'] },
      {
        titulo: 'Anormal',
        renglones: [
          'Desistimiento antes del viaje',
          'Revocación en 10 días (art. 1110)',
          'Frustración de la finalidad (art. 1090)',
          'Imposibilidad de cumplir (art. 1732)',
          'Resolución por incumplimiento',
        ],
      },
    ],
  },
  {
    tema: 'Obligación de seguridad',
    icono: 'escudo',
    titulo: 'Llegar sano y salvo',
    diseno: 'renglones',
    figura: 'escudo',
    renglones: [
      'El transportista promete un resultado: responde objetivamente aunque no tenga culpa (arts. 1722 y 1723)',
      'Se aplican las reglas de las actividades riesgosas (arts. 1286 y 1757)',
      'No lo liberan manejar bien, cumplir las normas ni tener la habilitación (art. 1757)',
    ],
  },
  {
    tema: 'Eximentes',
    icono: 'rayo',
    titulo: 'Solo lo libera una causa ajena',
    diseno: 'tarjetas',
    tarjetas: [
      { titulo: 'Hecho de la víctima', texto: 'Su propia conducta causó el daño (art. 1729)' },
      { titulo: 'Caso fortuito', texto: 'No se pudo prever o no se pudo evitar (art. 1730)' },
      { titulo: 'Hecho de un tercero', texto: 'Con las mismas características del caso fortuito (art. 1731)' },
    ],
    recuadro: 'Pero si es un riesgo propio de la actividad, no lo libera (art. 1733 inc. e)',
    partes: 4,
  },
  {
    tema: 'Cláusulas que no valen',
    icono: 'boleto',
    titulo: 'Cláusulas que no valen',
    diseno: 'renglones',
    figura: 'boleto',
    renglones: [
      'Las que limitan la responsabilidad por muerte o lesiones se tienen por no escritas (art. 1292)',
      'Tampoco vale liberarse por anticipado si es abusivo o afecta derechos indisponibles (art. 1743)',
      'En consumo, se suma el control de las cláusulas abusivas (art. 37 LDC)',
    ],
  },
  {
    tema: '¿Quién responde?',
    icono: 'cadena',
    titulo: '¿Quién responde?',
    diseno: 'renglones',
    figura: 'cadena',
    eslabones: ['Conductor', 'Plataforma', 'Aseguradora'],
    renglones: [
      'Todos los que intervienen en el servicio responden frente al pasajero (art. 40 LDC)',
      'Si responden por causas distintas, las obligaciones son concurrentes (art. 1751)',
      'Puede sumarse el daño punitivo: una multa a favor del consumidor (art. 52 bis LDC)',
    ],
  },
  {
    tema: 'Contratos a distancia',
    icono: 'clic',
    titulo: 'Un contrato que se celebra con un clic',
    diseno: 'renglones',
    renglones: [
      'Se celebra a distancia, sin que las partes estén juntas (art. 1105)',
      'El soporte electrónico cumple con la forma escrita (art. 1106)',
      'El usuario es doblemente vulnerable: como consumidor y frente a la tecnología',
      'Por eso la empresa debe informar los riesgos del medio y quién los asume (art. 1107)',
    ],
  },
  {
    tema: 'Abusividad, jurisdicción y arbitraje',
    icono: 'juzgado',
    titulo: 'Jurisdicción y arbitraje',
    diseno: 'renglones',
    figura: 'mapa',
    renglones: [
      'El juez es el del lugar donde se recibe el servicio (art. 1109)',
      'Las cláusulas que cambian la jurisdicción se tienen por no escritas (art. 1109)',
      'En casos internacionales, el consumidor elige dónde demandar (art. 2654)',
      'Los conflictos de consumo no pueden ir a arbitraje (art. 1651 inc. c)',
    ],
  },
  {
    tema: '¿Intermediario o parte?',
    icono: 'red',
    titulo: '¿Intermediaria o empresa de transporte?',
    diseno: 'enfrentadas',
    columnas: [
      { titulo: 'Lo que dicen', citas: true, renglones: ['“Solo conectamos pasajeros con conductores”', '“No somos dueños de los autos”'] },
      { titulo: 'Lo que hacen', renglones: ['Fijan la tarifa', 'Asignan los viajes', 'Cobran y se quedan con una comisión'] },
    ],
    partes: 2,
  },
  {
    tema: 'Algoritmos y trato digno',
    icono: 'algoritmo',
    titulo: 'El algoritmo',
    diseno: 'renglones',
    renglones: [
      'El algoritmo asigna los viajes, fija la tarifa dinámica y define la reputación',
      'Las empresas lo guardan como secreto comercial',
      'Eso choca con el deber de informar “toda otra circunstancia relevante” (art. 1100)',
      'Hipervulnerabilidad del consumidor',
    ],
  },
];

export const LLEGADA_VUELTA = {
  titulo: '¡Llegamos sanos y salvos!',
  sub: 'Destino',
};

// ---------------------------------------------------------------- the phone

// The made-up ride app (click-wrap). Battery and surge are the hidden details
// revealed at the end.
export const CELULAR = {
  app: 'Llevame',
  hora: '22:10',
  bateria: 4,
  origen: 'Facultad de Derecho',
  destino: 'Casa',
  servicio: 'Llevame Auto · llega en 4 min',
  precio: '$12.500',
  tarifa: 'Tarifa dinámica x1,8',
  letraChica: 'Al tocar Aceptar, aceptás los Términos y Condiciones del juego',
  boton: 'ACEPTAR',
  confirmado: '¡Viaje confirmado!',
};

export const CELULAR_FINAL = {
  bateria: 2,
  precio: '$16.700',
  tarifa: 'Tarifa dinámica x2,4',
  cartel: '¿Y vieron cuánta batería tenía el celular?',
};

// ---------------------------------------------------------------- the fork

export const BIFURCACION = {
  cartel: 'Elijan un camino',
  caminos: {
    negociar: { titulo: 'Negociar los términos', tecla: '1' },
    leer: { titulo: 'Leer los términos', tecla: '2' },
    aceptar: { titulo: 'Aceptar sin leer', tecla: '3' },
  },
  adhesion: {
    titulo: 'Contrato por adhesión',
    texto: 'Se acepta o no se viaja',
  },
};

// "Leer los términos": a very long legal text races by in small print for about
// 15 seconds. It starts in Spanish and soon switches to English. Nothing stops
// or lights up at the end: the text runs out and the car drives on. The
// Amsterdam clause is in there, unremarkable. Swap in the real phrases of the
// Uber terms analysed in the paper whenever they are at hand.
export const TERMINOS = {
  titulo: 'Términos y Condiciones de uso de Llevame',
  segundos: 15,
  castellano: [
    '1. Relación contractual. Los presentes Términos regulan el acceso o uso que usted haga, como persona, de las aplicaciones, páginas web, contenido, productos y servicios puestos a disposición por Llevame.',
    '2. Aceptación. Mediante su acceso y uso de los Servicios usted acuerda vincularse jurídicamente por estos Términos, que establecen una relación contractual entre usted y Llevame.',
    '3. Modificaciones. Llevame podrá modificar los Términos en cualquier momento. Las modificaciones serán efectivas después de su publicación. Su acceso o uso continuado constituye su consentimiento.',
    '4. Usted reconoce que Llevame no presta servicios de transporte ni funciona como una empresa de transportes, y que dichos servicios los prestan terceros independientes.',
    '5. Los Servicios se prestan «tal cual» y «según disponibilidad». Llevame no garantiza la calidad, idoneidad, seguridad o habilidad de los terceros proveedores.',
    '6. Llevame no será responsable de daños indirectos, incidentales, especiales, ejemplares, punitivos o emergentes, incluidos el lucro cesante, la pérdida de datos, la lesión personal o el daño a la propiedad.',
    '7. Usted acepta mantener indemne a Llevame y a sus consejeros, directivos y empleados frente a cualquier reclamación, demanda, pérdida, responsabilidad y gasto que surja de su uso de los Servicios.',
  ],
  ingles: [
    '8. Limitation of liability. Llevame shall not be liable for indirect, incidental, special, exemplary, punitive or consequential damages, including lost profits, lost data, personal injury or property damage.',
    '9. You acknowledge that third party providers may not be professionally licensed or permitted, and that the services may be unsafe.',
    '10. Llevame does not guarantee the quality, suitability, safety or ability of third party providers. You agree that the entire risk arising out of your use of the services remains solely with you.',
    '11. Governing law. These Terms shall be exclusively governed by and construed in accordance with the laws of The Netherlands, excluding its rules on conflicts of laws.',
    '12. Mediation. Any dispute shall first be submitted to mediation proceedings under the International Mediation Institute Rules.',
    '13. Arbitration. Any dispute not settled by mediation shall be resolved by arbitration in Amsterdam, in English, and kept confidential.',
    '14. Notices. Llevame may give notice by means of a general notice on the Services, electronic mail to your email address, or by written communication.',
    '15. Assignment. You may not assign these Terms without Llevame prior written approval. Llevame may assign these Terms without your consent.',
  ],
};

// ---------------------------------------------------------------- the game

// Rigged spinner of the game, in turn order: cars 1, 2, 3, 4 and again. The car
// really moves that many squares along its lane, landing on its card squares:
// car 1 on 4, 11, 17; car 2 on 5, 9, 14; car 3 on 3, 11, 14; car 4 on 6, 8, 18.
// Car 2 stops on 5 with car 1 right behind on 4, so it can be rear-ended.
export const GIROS_JUEGO = [4, 5, 3, 6, 7, 4, 8, 2, 6, 5, 3, 10];
export const CASILLAS_JUEGO = 20;

export const RUEDITA = {
  cartel: '¿Se dieron cuenta de que siempre salió el número que necesitábamos?',
  vuelta: 'En la vuelta',
  juego: 'En el juego',
};

// The four cars. Each one has three squares; turns go car 1, 2, 3, 4 and repeat.
// `anim` names the animation played on the board before the card opens.
export const AUTOS = [
  {
    id: 'g1',
    grupo: 'Grupo 1',
    nombre: 'La pasajera dormida',
    vehiculo: 'app',
    color: '#7A4FD8',
    caso: 'Basado en el fallo Bevilacqua (choque con Cabify)',
    casillas: [
      {
        titulo: 'El viaje',
        anim: 'choque',
        situacion: 'Pediste un Cabify, te dormiste atrás sin cinturón. El conductor perdió el control, chocó un árbol y un semáforo, y el auto volcó. Te lastimaste.',
        pregunta: '¿Qué obligación del contrato se incumplió? ¿A quién le reclamás?',
        respuesta: 'La obligación de seguridad: el transportista tiene que llevarte sano y salvo (art. 1289). Podés reclamarle al conductor, a Cabify y a sus aseguradoras.',
      },
      {
        titulo: 'La contestación y la primera instancia',
        anim: 'martillo',
        situacion: 'Al contestar la demanda, Cabify reconoce al conductor como “chofer de esta agencia de Remise” y alega que la pasajera no llevaba el cinturón. El juez condena al conductor y a Cabify, con sus aseguradoras, pero le atribuye a la pasajera un 30 % de la culpa de sus lesiones por no llevar el cinturón. Cabify apela y, por primera vez, dice que es una mera aplicación tecnológica.',
        pregunta: '¿Están de acuerdo con el 30 %? ¿Puede Cabify decir ahora que es una mera intermediaria?',
        respuesta: 'Discusión abierta. La respuesta la da la Cámara.',
      },
      {
        titulo: 'La Cámara',
        anim: 'martillo',
        situacion: 'La Cámara resuelve la apelación de Cabify.',
        pregunta: '¿Qué decidió sobre la defensa de “mera app”? ¿Y qué pasó con el cinturón?',
        pista: 'no hubo peritaje.',
        respuesta: 'No puede: esa defensa no se planteó al contestar la demanda y no se puede introducir recién en la apelación. Además contradice sus propios actos, porque en la contestación había llamado al conductor “chofer de esta agencia de Remise”. Y aun en el fondo, quien gana plata organizando el servicio no puede trasladar las pérdidas. Sobre el cinturón: no se probó que causara o agravara las lesiones, así que se eliminó el 30 %. Indemnización: $9.000.000 por incapacidad y $6.000.000 por daño extrapatrimonial.',
      },
    ],
    sentencia: '$9.000.000 por incapacidad + $6.000.000 por daño extrapatrimonial. Sin reducción por el cinturón.',
  },
  {
    id: 'g2',
    grupo: 'Grupo 2',
    nombre: 'El peor viaje',
    vehiculo: 'app',
    color: '#E2412F',
    caso: 'Hipotético: las eximentes de responsabilidad',
    // The clock on these cards: the exam starts at 9:00.
    parcial: '9:00',
    casillas: [
      {
        titulo: 'Me chocaron de atrás',
        anim: 'alcance',
        reloj: '8:41',
        situacion: 'El auto del Grupo 1 los chocó de atrás. El pasajero se golpeó, se rompió la valija que iba en el baúl y también la notebook que llevaba en el asiento. La plataforma dice: “Fue culpa de un tercero”.',
        pregunta: '¿Se libera? ¿Responde igual por la valija y por la notebook?',
        respuesta: 'No se libera. Es un hecho de un tercero, pero solo libera si tiene las características del caso fortuito: que no se haya podido prever o evitar (art. 1731). Un choque en el tránsito es un riesgo propio de la actividad (art. 1733 inc. e): solo exime el caso fortuito externo a la actividad. Responde y después le reclama al otro conductor. Por la valija del baúl responde en forma objetiva, porque se la entregaron y rigen las reglas del transporte de cosas (art. 1293). Por la notebook, que quedó a cargo del pasajero, solo si se prueba su culpa (art. 1294).',
      },
      {
        titulo: 'El perro y la tormenta',
        anim: 'perroTormenta',
        reloj: '8:52',
        situacion: 'Primero, un perro cruzó la calle, el conductor frenó de golpe y el pasajero se golpeó contra el asiento. Después, con alerta naranja por tormenta, el conductor siguió circulando y cayó una rama sobre el auto. Las dos veces la plataforma dice: “Fue un caso fortuito”.',
        pregunta: '¿Alguna de las dos la libera?',
        respuesta: 'Ninguna. El caso fortuito tiene que ser imprevisible o inevitable (art. 1730), y se analiza según las circunstancias. Que algo se cruce en la calle es previsible en la ciudad. Y con alerta meteorológica la tormenta también era previsible: seguir circulando fue decisión del transportista.',
      },
      {
        titulo: 'Me bajo acá',
        anim: 'salto',
        reloj: '8:58',
        situacion: 'Llegando tarde a un parcial, el pasajero abrió la puerta en plena autopista y se bajó con el auto en movimiento, aunque el conductor le gritó que no lo hiciera. Se lastimó. La plataforma dice: “Fue culpa del propio pasajero”.',
        pregunta: '¿Se libera?',
        respuesta: 'Sí. Es hecho del damnificado (art. 1729): la causa del daño fue la conducta del propio pasajero. No hace falta probar su culpa, alcanza con que haya causado el daño.',
      },
    ],
    sentencia: '$21.000.000 por los primeros 2 accidentes. Por el último: $0.',
  },
  {
    id: 'g3',
    grupo: 'Grupo 3',
    nombre: 'La letra chica',
    vehiculo: 'app',
    color: '#13A89E',
    caso: 'Cláusulas abusivas (términos de Uber y caso Facebook)',
    casillas: [
      {
        titulo: 'El pozo',
        anim: 'pozo',
        situacion: 'El pasajero se lastimó y reclama. La app le responde con sus términos: los servicios se prestan “tal cual”, no garantiza “la seguridad” de los conductores, no responde por “lesión personal” y, además, el usuario tiene que “mantener indemne” a la plataforma frente a cualquier reclamo.',
        pregunta: '¿Valen esas cláusulas?',
        respuesta: 'No. Las cláusulas que limitan la responsabilidad del transportista por daños corporales se tienen por no escritas (art. 1292, CCyCN), y todas son abusivas (art. 37 LDC, art. 1743 CCyCN). La indemnidad es la peor: significa que, si hay un problema, paga el usuario y no la empresa, lo que da vuelta el deber de seguridad del proveedor.',
      },
      {
        titulo: 'Ámsterdam',
        anim: 'amsterdam',
        situacion: 'Para cualquier disputa, los términos dicen: mediación obligatoria y después arbitraje en Ámsterdam, en inglés y confidencial, bajo la ley de los Países Bajos.',
        pregunta: '¿Tiene que viajar a Holanda para reclamar?',
        respuesta: 'No. Los conflictos de consumo no pueden ir a arbitraje (art. 1651 inc. c). En contratos a distancia, la cláusula de prórroga de jurisdicción se tiene por no escrita (art. 1109) y el consumidor puede demandar en Argentina (art. 2654).',
      },
      {
        titulo: 'La Justicia confirma',
        subtitulo: 'Caso Facebook',
        situacion: 'En un caso real, la autoridad de Defensa del Consumidor declaró abusivas cláusulas de WhatsApp, ordenó suprimirlas y le puso a Facebook Argentina una multa de $5.000.000. Entre esas cláusulas: el usuario usa el servicio “a tu propio riesgo”, que se presta “tal y como está”, y libera a la empresa “de cualquier reclamo”. La empresa se defendió: “No soy yo la proveedora, es una empresa extranjera”.',
        pregunta: '¿Les suenan esas cláusulas? ¿Qué decidió la Justicia? ¿Y quién se queda con la multa?',
        respuesta: 'Son casi iguales a las de Uber de la primera casilla. En 2025 la Cámara confirmó todo: las cláusulas son abusivas, hay que suprimirlas y la multa se mantiene. También rechazó la defensa de la empresa extranjera: no la probó, sus propios términos decían lo contrario y no es lógica una desvinculación absoluta entre empresas del mismo grupo. En 2026 denegó el recurso extraordinario. La multa no la cobra el usuario: va al Estado.',
      },
    ],
    sentencia: '$5.000.000 de multa, confirmada por la Justicia. (Sos el Estado, no el consumidor.)',
  },
  {
    id: 'g4',
    grupo: 'Grupo 4',
    nombre: 'El taxi',
    vehiculo: 'taxi',
    color: '#F2B705',
    caso: 'Fallo Sindicato de Peones de Taxis (la plataforma frente al Estado)',
    casillas: [
      {
        titulo: 'La demanda (2016)',
        situacion: 'Año 2016. Las apps de viajes empiezan a operar en la Ciudad con conductores sin licencia profesional y sin el seguro exigido, y nadie las controla. El Sindicato de Peones de Taxis inicia un juicio colectivo.',
        pregunta: '¿A quién demandan?',
        respuesta: 'Pregunta trampa: no a las plataformas, sino al Gobierno de la Ciudad, por no ejercer el poder de policía sobre el transporte. El propio GCBA había calificado la actividad de “clandestina” y aun así no hacía nada; la Cámara lo llamó “anomia voluntaria”.',
      },
      {
        titulo: 'La sentencia',
        anim: 'martillo',
        situacion: 'Con apoyo en un fallo europeo sobre Uber, la Cámara decide que, ante la falta de regulación, la actividad de las plataformas es un servicio de transporte de pasajeros. Y condena al GCBA.',
        pregunta: '¿Qué le ordena? (Puede haber más de una correcta.)',
        opciones: [
          'No cobrarles a los taxistas los trámites locales que necesitan para trabajar.',
          'Impulsar el cobro de ingresos brutos a las plataformas.',
          'Controlar la publicidad de las plataformas y hacer campañas que informen a los usuarios los riesgos del servicio.',
          'Prohibir Uber en la Ciudad.',
        ],
        correctas: [0, 1, 2],
        respuesta: 'A, B y C son correctas: es una condena en un triple orden, arancelario, tributario y publicitario. D es la trampa: la sentencia no prohibió las plataformas. Además, la condena tenía una condición: cesaba automáticamente cuando se regulara la actividad. El fallo europeo es el del Tribunal de Justicia de la Unión Europea (Élite Taxi, 2017), que vimos en la explicación.',
      },
      {
        titulo: 'Llega la regulación (2026)',
        situacion: 'En mayo de 2026 la Ciudad dicta la Res. 99/SECT/26. Llama a las plataformas “Empresas de Redes de Transporte” que “intermedian”, pero les exige que los conductores tengan licencia D1 y que los autos tengan verificación técnica y seguro. Y reconoce que la actividad “configura técnicamente un servicio de transporte”.',
        pregunta: '¿Qué pasa con la condena? Y la pregunta de fondo: ¿son meras intermediarias?',
        respuesta: 'La condena perdió vigencia, y en octubre de 2026 la Cámara declaró inoficiosos los recursos contra la sentencia (con la disidencia del juez Juan Lima). Sobre el fondo: el propio regulador les impone deberes de quien organiza el transporte, así que en los hechos son más que intermediarias. Aclaración: este juicio no decidió su responsabilidad civil frente al pasajero (eso lo vimos en el Auto 1).',
      },
    ],
    sentencia: '$4.000.000 en trámites que los taxistas no pagaron (monto ilustrativo)',
  },
];

// Texts shown during the animations that need words on screen.
export const ANIMACION = {
  alerta: 'ALERTA NARANJA',
  alertaSub: 'Tormentas fuertes · Ciudad de Buenos Aires',
  salto: '¡NO, ESPERÁ!',
  tarde: '¡Llego tarde al parcial!',
  zzz: 'Zzz…',
  ay: '¡AY!',
  juez: 'Order! This dispute shall be heard in Amsterdam, in English.',
};

export const LLEGADA = {
  titulo: 'Destino',
  sub: 'Llegaron los cuatro autos',
};

// The "Terms and Conditions of the game" the class accepted on the phone.
export const CLAUSULAS = {
  titulo: 'Términos y Condiciones del juego',
  lista: [
    'La Dra. Herrera se compromete a no tomar el último parcial y a calificar a todos con 10.',
    'Los alumnos renuncian a reclamar cualquier nota.',
    'El Grupo 7 no responde por aburrimiento, sueño ni lesiones derivadas de la clase.',
    'Toda disputa se resolverá por arbitraje en Ámsterdam, en neerlandés y en forma confidencial.',
    'El jugador cede al Grupo 7 sus apuntes de todas las materias.',
  ],
};

export function casilla(turn) {
  const auto = AUTOS[turn % AUTOS.length];
  const index = Math.floor(turn / AUTOS.length);
  return { auto, index, ...auto.casillas[index] };
}

export function zonaDe(n) {
  return ZONAS.find((z) => n >= z.desde && n <= z.hasta);
}
