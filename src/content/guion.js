// Everything the projected game says, in the order it is said. Edit the texts
// here and run `npm run build`. The game is scripted: no text depends on what
// the class answers, the presenters resolve that out loud.

export const TITULO = 'El juego de los contratos: Transporte';
export const SUBTITULO = 'Contratos Civiles y Comerciales · Facultad de Derecho (UBA) · Grupo 7';

export const TRANSICION = {
  titulo: 'Terminó la clase…',
  texto: '¿Cómo volvemos a casa? Pidamos un auto.',
};

// The phone with the made-up ride app (click-wrap). Battery and surge are the
// hidden details revealed at the end.
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

// "Leer los términos": the text scrolls by far too fast, switches to English and
// stops for a moment on the last line. The *** lines are placeholders for the
// real phrases of the Uber terms analysed in the paper.
export const TERMINOS = {
  titulo: 'Términos y Condiciones de uso de Llevame',
  segundos: 24,
  castellano: [
    '1. Relación contractual. Los presentes Términos regulan el acceso o uso que usted haga, como persona, de las aplicaciones, páginas web, contenido, productos y servicios puestos a disposición por Llevame.',
    '2. Aceptación. Mediante su acceso y uso de los Servicios usted acuerda vincularse jurídicamente por estos Términos, que establecen una relación contractual entre usted y Llevame.',
    '3. Modificaciones. Llevame podrá modificar los Términos en cualquier momento. Las modificaciones serán efectivas después de su publicación. Su acceso o uso continuado constituye su consentimiento.',
    '4. *** Frase real de los términos de Uber (pendiente) ***',
    '5. Los Servicios se prestan «tal cual» y «según disponibilidad». Llevame no garantiza la calidad, idoneidad, seguridad o habilidad de los terceros proveedores.',
    '6. *** Frase real de los términos de Uber (pendiente) ***',
    '7. Usted acepta mantener indemne a Llevame y a sus consejeros, directivos y empleados frente a cualquier reclamación, demanda, pérdida, responsabilidad y gasto que surja de su uso de los Servicios.',
  ],
  ingles: [
    '8. Limitation of liability. Llevame shall not be liable for indirect, incidental, special, exemplary, punitive or consequential damages, including lost profits, lost data, personal injury or property damage.',
    '9. You acknowledge that third party providers may not be professionally licensed or permitted, and that the services may be unsafe.',
    '10. *** Real phrase from the Uber terms (pending) ***',
    '11. Governing law. These Terms shall be exclusively governed by and construed in accordance with the laws of The Netherlands, excluding its rules on conflicts of laws.',
    '12. Mediation. Any dispute shall first be submitted to mediation proceedings under the International Mediation Institute Rules.',
    '13. Notices. Llevame may give notice by means of a general notice on the Services, electronic mail to your email address, or by written communication.',
    '14. Assignment. You may not assign these Terms without Llevame prior written approval. Llevame may assign these Terms without your consent.',
  ],
  final: 'Any dispute shall be resolved by arbitration in Amsterdam, in English.',
};

// Rigged spinner: one number per turn, in turn order. It changes nothing (every
// spin moves the car to its next square) but must look random.
export const GIROS = [7, 3, 9, 5, 2, 8, 4, 10, 6, 1, 9, 3, 7, 5, 8, 2];

export const RUEDITA = {
  cartel: '¿Se dieron cuenta de que siempre salió el número que necesitábamos?',
};

// The four cars. Each one has four squares; turns go car 1, 2, 3, 4 and repeat,
// so car 1 owns squares 1, 5, 9, 13, car 2 owns 2, 6, 10, 14, and so on.
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
        titulo: 'El choque',
        anim: 'choque',
        situacion: 'Pediste un Cabify, te dormiste atrás sin cinturón. El conductor perdió el control, chocó un árbol y un semáforo, y el auto volcó. Te lastimaste.',
        pregunta: '¿Qué obligación del contrato se incumplió? ¿A quién le reclamás?',
        respuesta: 'La obligación de seguridad: el transportista tiene que llevarte sano y salvo (art. 1289). Podés reclamarle al conductor, a Cabify y a sus aseguradoras.',
      },
      {
        titulo: 'La contestación de Cabify',
        situacion: 'Cabify contesta: “No somos dueños del auto. El dueño es el chofer de esta agencia de Remise. Además, la pasajera no tenía puesto el cinturón.”',
        pregunta: '¿Tiene razón?',
        respuesta: 'Discusión abierta. Dejamos la respuesta para las casillas siguientes.',
      },
      {
        titulo: 'Primera instancia',
        anim: 'martillo',
        situacion: 'El juez condena al conductor y a Cabify, con sus aseguradoras. Pero le atribuye a la pasajera un 30 % de la culpa de sus lesiones por no llevar el cinturón. Cabify interpone una apelación y dice que es una mera intermediaria.',
        pregunta: '¿Están de acuerdo con el 30 %? ¿Y con la nueva justificación de Cabify?',
        respuesta: 'Discusión abierta. La respuesta la da la Cámara.',
      },
      {
        titulo: 'La Cámara',
        anim: 'martillo',
        situacion: 'La Cámara rechaza los argumentos de Cabify: la defensa de “mera app” llegó tarde, contradice lo que la propia empresa había dicho antes (llamó al conductor “chofer de esta agencia de Remise”) y, en el fondo, quien gana plata organizando el servicio no puede trasladar las pérdidas.',
        pregunta: '¿Qué creen que pasó con el cinturón?',
        pista: 'No hubo peritaje.',
        respuesta: 'No se probó que la falta de cinturón causara o agravara las lesiones, así que se eliminó el 30 %. Indemnización: $9.000.000 por incapacidad y $6.000.000 por daño extrapatrimonial.',
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
    casillas: [
      {
        titulo: 'Me chocaron de atrás',
        anim: 'alcance',
        situacion: 'El auto del grupo 1 los chocó de atrás. El pasajero se golpeó, se rompió la valija que iba en el baúl y también la notebook que llevaba en el asiento. La plataforma dice: “Fue culpa de un tercero”.',
        pregunta: '¿Se libera? ¿Responde igual por la valija y por la notebook?',
        respuesta: 'No se libera. Un choque en el tránsito es un riesgo propio de la actividad (art. 1733 inc. e). Responde y después le reclama al otro conductor. Por la valija del baúl responde siempre, porque se la entregaron. Por la notebook, que quedó a cargo del pasajero, solo si se prueba su culpa (arts. 1293 y 1294).',
      },
      {
        titulo: 'El perro',
        anim: 'perro',
        situacion: 'Un perro cruzó la calle y el conductor frenó de golpe. El pasajero se golpeó contra el asiento y sufrió lesiones. La plataforma dice: “Fue un caso fortuito”.',
        pregunta: '¿Se libera?',
        respuesta: 'No. Que algo se cruce en la calle es previsible en la ciudad. El caso fortuito tiene que ser imprevisible o inevitable (art. 1730).',
      },
      {
        titulo: 'La tormenta',
        anim: 'tormenta',
        situacion: 'Había alerta naranja por tormenta, el conductor siguió circulando y cayó una rama sobre el auto. La plataforma dice: “Fue la naturaleza, es caso fortuito”.',
        pregunta: '¿Se libera?',
        respuesta: 'No. Con la alerta meteorológica la tormenta era previsible y seguir circulando fue decisión del transportista. El caso fortuito se analiza según las circunstancias.',
      },
      {
        titulo: 'Me bajo acá',
        anim: 'salto',
        situacion: 'Llegando tarde al parcial, el pasajero abrió la puerta en plena calle y se bajó con el auto en movimiento, aunque el conductor le gritó que no lo hiciera. Se lastimó. La plataforma dice: “Fue culpa del propio pasajero”.',
        pregunta: '¿Se libera?',
        respuesta: 'Sí. Es hecho del damnificado (art. 1729): la causa del daño fue la conducta del propio pasajero. No hace falta probar su culpa, alcanza con que haya causado el daño.',
      },
    ],
    sentencia: '$21.000.000 por daños acumulados en los primeros 3 supuestos. Por el último: $0.',
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
        titulo: 'El reclamo',
        situacion: 'El pasajero se lastimó en un viaje y quiere reclamarle a Uber. La app le responde con sus términos: los servicios se prestan “tal cual”, no garantiza “la seguridad” de los conductores, y no responde por “lesión personal”.',
        pregunta: '¿Esa cláusula vale?',
        respuesta: 'No. Las cláusulas que limitan la responsabilidad del transportista por daños corporales se tienen por no escritas (art. 1292, CCyCN). Además son abusivas (art. 37 LDC, art. 1743 CCyCN).',
      },
      {
        titulo: 'La indemnidad',
        situacion: 'Otra cláusula dice que el usuario tiene que “mantener indemne” a la plataforma frente a cualquier reclamo derivado del uso del servicio.',
        pregunta: '¿Qué significa? ¿Vale?',
        respuesta: 'Significa que, si hay un problema, paga el usuario y no la empresa. Es abusiva: da vuelta el deber de seguridad, que es del proveedor.',
      },
      {
        titulo: 'Ámsterdam',
        anim: 'amsterdam',
        situacion: 'Para cualquier disputa, los términos dicen: mediación obligatoria y después arbitraje en Ámsterdam, en inglés y confidencial, bajo la ley de los Países Bajos.',
        pregunta: '¿Tiene que viajar a Holanda para reclamar?',
        respuesta: 'No. Los conflictos de consumo no pueden ir a arbitraje (art. 1651 inc. c). En contratos a distancia, la cláusula de prórroga de jurisdicción se tiene por no escrita (art. 1109) y el consumidor puede demandar en Argentina (art. 2654).',
      },
      {
        titulo: 'El Estado interviene',
        subtitulo: 'Caso Facebook',
        situacion: 'En un caso real, la autoridad de Defensa del Consumidor declaró abusivas cláusulas de WhatsApp, ordenó suprimirlas y le puso una multa de $5.000.000. La empresa local dijo: “No soy yo la proveedora, es una empresa extranjera”.',
        pregunta: '¿Puede el Estado hacer eso? ¿Quién se queda con la multa?',
        respuesta: 'Sí, la autoridad puede ordenar suprimir cláusulas abusivas, y la Cámara no suspendió esa orden. La multa no la cobra el usuario, va al Estado. Frente al argumento de “no soy la proveedora”, la LDC responde con la noción amplia de proveedor y la solidaridad de toda la cadena (arts. 2 y 40).',
      },
    ],
    sentencia: '$5.000.000 de multa. (Sos el Estado, no el consumidor.)',
  },
  {
    id: 'g4',
    grupo: 'Grupo 4',
    nombre: 'El taxi',
    vehiculo: 'taxi',
    color: '#F2B705',
    caso: 'Fallos Sindicato de Peones de Taxis',
    casillas: [
      {
        titulo: 'La demanda (2016)',
        situacion: 'Año 2016. Las apps de viajes empiezan a operar en la Ciudad con conductores sin licencia profesional y sin el seguro exigido, y nadie las controla. El Sindicato de Peones de Taxis inicia un juicio colectivo.',
        pregunta: '¿A quién demandan?',
        respuesta: 'Pregunta trampa: no a las plataformas, sino al Gobierno de la Ciudad, por no ejercer el poder de policía sobre el transporte. El propio GCBA había calificado la actividad de “clandestina” y aun así no hacía nada; la Cámara lo llamó “anomia voluntaria”.',
      },
      {
        titulo: 'La sentencia',
        anim: 'sello',
        situacion: 'La Cámara tiene que decidir qué es la actividad de las plataformas. Para eso se apoya en un fallo europeo sobre Uber y en normas de otras jurisdicciones del país.',
        pregunta: '¿Es intermediación tecnológica o transporte?',
        respuesta: 'Ante la falta de una regulación específica, y “a los efectos de este pleito”, es un servicio de transporte de pasajeros. El fallo europeo es el del Tribunal de Justicia de la Unión Europea (Élite Taxi, 2017), que vimos en la explicación.',
      },
      {
        titulo: 'La condena',
        situacion: 'La Cámara hace lugar en parte a la demanda y condena al GCBA.',
        pregunta: '¿Qué creen que le ordena? (Puede haber más de una correcta.)',
        opciones: [
          'No cobrarles a los taxistas los trámites locales que necesitan para trabajar.',
          'Impulsar el cobro de ingresos brutos a las plataformas.',
          'Controlar la publicidad de las plataformas y hacer campañas que informen a los usuarios los riesgos del servicio.',
          'Prohibir Uber en la Ciudad.',
        ],
        correctas: [0, 1, 2],
        respuesta: 'A, B y C son correctas: es una condena en un triple orden, arancelario, tributario y publicitario. D es la incorrecta: la sentencia no prohibió las plataformas. Además, la condena tuvo una condición: cesaba automáticamente cuando se regulara la actividad.',
      },
      {
        titulo: 'Llega la regulación (2026)',
        situacion: 'En mayo de 2026 la Ciudad dicta la Res. 99/SECT/26. Llama a las plataformas “Empresas de Redes de Transporte” que “intermedian”, pero les exige que los conductores tengan licencia D1 y que los autos tengan verificación técnica y seguro. Y reconoce que la actividad “configura técnicamente un servicio de transporte”.',
        pregunta: '¿Qué pasa con la condena? Y la pregunta de fondo: ¿son meras intermediarias?',
        respuesta: 'La condena perdió vigencia, y en octubre de 2026 la Cámara declaró inoficiosos los recursos contra la sentencia (con la disidencia del juez Juan Lima). Sobre el fondo: el propio regulador les impone deberes de quien organiza el transporte, así que en los hechos son más que intermediarias. Aclaración: este juicio no decidió su responsabilidad civil frente al pasajero (eso lo vimos en el Auto 1).',
      },
    ],
    sentencia: '$4.000.000 en trámites que los taxistas no pagaron (monto ilustrativo).',
  },
];

// Texts shown during the animations that need words on screen.
export const ANIMACION = {
  alerta: 'ALERTA NARANJA',
  alertaSub: 'Tormentas fuertes · Ciudad de Buenos Aires',
  salto: '¡NO, ESPERÁ!',
  juez: 'Order! This dispute shall be heard in Amsterdam, in English.',
  sello: 'SERVICIO DE TRANSPORTE',
};

export const LLEGADA = 'Destino: Casa';

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
  return { auto, index: Math.floor(turn / AUTOS.length), ...auto.casillas[Math.floor(turn / AUTOS.length)] };
}
