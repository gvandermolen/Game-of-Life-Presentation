# Especificación de diseño

## Objetivo

Presentación del Grupo 7 sobre el contrato de transporte (Contratos Civiles y Comerciales, Facultad de Derecho, UBA, 11 de noviembre de 2026), compartida por Meet desde una sola computadora.

La clase tiene dos momentos sobre el mismo tablero:

- **La vuelta**: exponemos el trabajo. Un auto, "Toda la clase", da una vuelta de 40 casillas; las 13 de contenido abren una diapositiva cada una.
- **El juego**: los alumnos juegan. Cuatro autos piden un viaje en una app, pasan por la bifurcación y recorren el mismo camino cayendo en casillas con casos y preguntas.

Parece un *Juego de la Vida* con ruedita, pero es un guion fijo. La gracia se revela al final: la ruedita siempre dio el número necesario, el celular tenía 2 % de batería, la tarifa subió y todos aceptaron unos Términos y Condiciones que nadie leyó. Es el mismo contrato por adhesión que se analiza en el trabajo.

El texto completo está en `src/content/guion.js`; la especificación original, en el documento "Destino: Sano y Salvo — Especificación completa de la clase".

## Decisiones

| Tema | Decisión |
| --- | --- |
| Nombre | "Destino: Sano y Salvo", editable en el menú > Ajustes (se ve en la barra, el tablero, la ruedita y la pestaña) |
| Dos tableros | La vuelta y el juego son dos caminos distintos sobre la misma mesa, con el río, la Facultad y el cartel en común |
| La vuelta | Un solo camino de 40 casillas, todas iguales: un dibujo y el número |
| El juego | Un solo camino serpenteante de 19 casillas más Destino, compartido por los cuatro autos; cada auto avanza lo que marca la ruedita y nunca dos caen en la misma casilla |
| Tarjetas | Se dan vuelta: adelante la situación y la pregunta; atrás, en otro color, la respuesta |
| Ruedita | Del 1 al 10, arreglada: `GIROS_VUELTA` y `GIROS_JUEGO`. Frena con un "casi" en el número vecino |
| Clics | Uno por cosa que pasa: girar, mostrar, cerrar. Nunca dos cosas con un solo clic |
| Puntos | No hay. Las tarjetas plantean y responden; los expositores conducen la discusión |
| Animaciones | En el tablero 3D; el martillo, en pantalla. Entre 2 y 4 segundos, estilo caricatura |
| Celular | HTML, como una app real |
| Zonas | Embarco, Viaje y Desembarco en los dos tableros |
| Paisaje | Buenos Aires: barrios y monumentos |
| Contenido | Archivo `guion.js` + `npm run build` |

## Guion

### La vuelta

1. Vista general, con el auto en la Salida.
2. Por cada casilla de contenido:
   1. Clic: gira la ruedita y el auto avanza casilla por casilla. Se abre la diapositiva con el título.
   2. Clic: aparece el texto. En la casilla 8 (eximentes) sale en 4 partes y en la 12 (intermediaria) en 2; en las demás, todo junto.
   3. Clic: se cierra la diapositiva y vuelve la vista general.
3. Después de la casilla 13, un último giro lleva el auto a Destino (casilla 40): sube la bandera a cuadros y aparece "¡Llegamos sanos y salvos!".

Las diapositivas ocupan la derecha de la pantalla, con el auto a la izquierda. Arriba, la zona, "Casilla N de 13" y el tema con su icono; el título es la frase grande. Cada una tiene un diseño propio (línea de tiempo, columnas, etapas, tarjetas, enfrentadas o renglones con una figura o recuadros). Las referencias (arts., Ley) van al final del renglón, en gris y más chicas.

### El juego

1. **Celular**: app Llevame, 22:10, batería 4 %, Facultad de Derecho → Casa, $12.500 con tarifa dinámica x1,8, letra chica, ACEPTAR. Al tocar: "¡Viaje confirmado!" y aparecen los cuatro autos frente al pórtico.
2. **Bifurcación**, auto por auto (el panel dice qué grupo elige):
   - *Negociar los términos*: el auto choca contra una barrera, aparece el cartel "Contrato por adhesión: se acepta o no se viaja" y vuelve marcha atrás. El botón queda marcado "ya lo intentaron" para ese auto.
   - *Leer los términos*: el auto frena bajo el pórtico y los términos pasan demasiado rápido (unos 15 segundos), primero en castellano y enseguida en inglés, sin detenerse en nada. Después sigue hacia Inicio.
   - *Aceptar sin leer*: directo a Inicio.
3. **12 turnos**. En cada uno:
   1. Se resalta el auto de turno (anillo, nombre, ficha abajo).
   2. Clic: gira la ruedita.
   3. Clic: el auto avanza hasta su casilla, con la animación que corresponda. Si hay autos parados en el medio, los esquiva por el costado.
   4. Clic: se abre la tarjeta: título, situación y pregunta en negrita.
   5. Clic: la tarjeta se da vuelta y muestra la respuesta, en otro color. Si hay opciones, las correctas se marcan en verde y la trampa en rojo.
   6. Clic: se cierra la tarjeta y pasa el turno.
4. **Última vuelta**: un turno más por auto. Clic: gira la ruedita (3, 4, 6 y 1). Clic: el auto llega a Destino y, con el mismo clic, entra su sentencia boca abajo y se da vuelta. Es una tarjeta grande a la derecha, con borde del color del auto, el título "SENTENCIA", el grupo y el monto; el auto queda a la izquierda. Clic: se cierra y juega el auto siguiente. Con la cuarta, fanfarria y papel picado, y el clic siguiente va a la ruedita.

### Final

1. **Ruedita**: "¿Se dieron cuenta de que siempre salió el número que necesitábamos?" Clic: la lista de todos los números que salieron en la vuelta y en el juego.
2. **Celular final**: batería 2 %, $16.700, x2,4, con la batería y el precio marcados. "¿Y vieron cuánta batería tenía el celular?" Clic en la letra chica: los Términos y Condiciones del juego, cinco cláusulas en chiste.

## Autos

| Auto | Color | Caso | Casillas |
| --- | --- | --- | --- |
| Grupo 1 · La pasajera dormida | Violeta `#7A4FD8` | Bevilacqua (choque con Cabify) | El viaje · La contestación y la primera instancia · La Cámara |
| Grupo 2 · El peor viaje | Coral `#E2412F` | Hipotético: las eximentes de responsabilidad | Me chocaron de atrás · El perro y la tormenta · Me bajo acá |
| Grupo 3 · La letra chica | Turquesa `#13A89E` | Cláusulas abusivas (términos de Uber y caso Facebook) | El pozo · Ámsterdam · La Justicia confirma |
| Grupo 4 · El taxi | Amarillo `#F2B705` | Sindicato de Peones de Taxis | La demanda (2016) · La sentencia · Llega la regulación (2026) |

## Animaciones

| Turno | Animación | Qué pasa |
| --- | --- | --- |
| 1 | `choque` | "Zzz…": la pasajera duerme, el auto se despista, choca un árbol y un semáforo y vuelca |
| 2 | `alcance` | El auto 2 frena en un semáforo en rojo; el auto 1, que está justo atrás, lo choca de atrás y retrocede |
| 3 | `pozo` | El auto cae en un pozo entre dos casillas: "¡Ay!" y un chichón |
| 5, 8, 9 | `martillo` | Golpes de martillo de juez |
| 6 | `perroTormenta` | Cruza un perro, frenada fuerte; después alerta naranja, lluvia, relámpagos y una rama que cae sobre el techo |
| 7 | `amsterdam` | Al auto le salen alas y aterriza junto a dos molinos y un juez con peluca: "Order! This dispute shall be heard in Amsterdam, in English." |
| 10 | `salto` | Un reloj marca 8:58: "¡Llego tarde al parcial!". "¡NO, ESPERÁ!": el pasajero se tira del auto en movimiento |

## Tableros

- **La vuelta**: de la Salida, junto a la Facultad, el camino sube serpenteando alrededor de la ruedita hasta Destino, con la bandera a cuadros. Todas las casillas son iguales: un dibujo y el número; la 40 es a cuadros. Un cartel de ruta marca el comienzo de cada zona.
- **El juego**: de la Facultad, el pórtico de la bifurcación con sus tres caminos (el de negociar termina en la barrera), la línea de Inicio con los cuatro autos uno al lado del otro y un solo camino que serpentea hasta la línea de Destino frente a la casa, donde se vuelve a abrir para los cuatro. Todas las casillas son iguales, con un dibujo al azar y el número: no se nota cuáles tienen tarjeta.
- Las tres zonas (Embarco, Viaje, Desembarco) tiñen el fondo y llevan su nombre impreso.
- Barrios y monumentos de Buenos Aires, con sus nombres sin pisar caminos ni utilería.

## Identidad visual

Basada en el Manual de marca .UBA.

| Token | Valor | Uso |
| --- | --- | --- |
| Azul UBA | `#1D2554` | Paneles, carteles, texto |
| Celeste | `#91BDE1` | Zona Embarco, selección |
| Dorado | `#F7A600` | Zona Viaje, acentos, turno activo, el auto de la vuelta |
| Turquesa | `#3BC3AD` | Zona Desembarco |
| Dorado claro | `#FCCD8E` | Texto sobre azul |
| Coral | `#EF4230` | Alertas, reloj |
| Papel | `#FBF6EA` | Diapositivas, tarjetas y fichas de equipo |

Tipografía: **Bitter** (la tipografía institucional UBA), incluida en el archivo. Black para títulos y números, Bold para etiquetas, Regular para texto.

No se usa el escudo oficial de la UBA: hace falta el archivo autorizado.

## Pantalla

- **Barra superior**: el nombre del juego, en qué casilla o turno estamos con lo que hace el próximo `Espacio`, y botones (atrás, vista general, sonido, pantalla completa).
- **Botón de menú**: redondo, abajo a la derecha, en todas las pantallas (también en el celular).
- **Equipos**: cuatro fichas abajo, con tres marcas de progreso cada una, solo en el juego. La del auto de turno se levanta.
- **Diapositiva y tarjeta**: a la derecha, para que el auto se vea a la izquierda.
- **Menú** (`M`, `G` o el botón): "Ir a" cualquier momento del guion, separado en La vuelta, El juego y Final; ajustes (nombre, calidad, velocidad, sonido, volumen), empezar de cero y atajos.

## Movimiento y cámara

- Vista general mientras se espera el giro; la cámara va a la ruedita al girar, sigue al auto en su recorrido y lo deja a la izquierda cuando se abre la diapositiva o la tarjeta.
- La ruedita desacelera con una curva suave, hace clic en cada segmento y casi se detiene en el número vecino antes del final.
- `Espacio` durante una animación la termina. Atrás y "Ir a" no animan.
