# Especificación de diseño

## Objetivo

Presentación del Grupo 7 sobre el contrato de transporte (Contratos Civiles y Comerciales, Facultad de Derecho, UBA, 11 de noviembre de 2026), compartida por Zoom desde una sola computadora.

El juego parece un *Juego de la Vida* con ruedita, pero es un guion fijo. La gracia se revela al final: la ruedita siempre dio el número necesario, el celular tenía 2 % de batería, la tarifa subió y todos aceptaron unos Términos y Condiciones que nadie leyó. Es el mismo contrato por adhesión que se analiza en el trabajo.

El texto completo está en `src/content/guion.js`; la especificación original, en el documento "El juego de los contratos: TRANSPORTE — Especificación del juego web".

## Decisiones

| Tema | Decisión |
| --- | --- |
| Equipos | 4 autos, uno por grupo del aula. El 4 es el taxi |
| Camino | Uno solo para todos, como el Juego de la Vida original |
| Casillas | 16, intercaladas: el auto 1 juega la 1, 5, 9 y 13; el 2, la 2, 6, 10 y 14; y así |
| Ruedita | Del 1 al 10, arreglada: los números están en `GIROS` y no cambian nada. Frena con un "casi" en el número vecino |
| Puntos | No hay. Las cartas plantean y responden; los expositores conducen la discusión |
| Bifurcación | En el tablero 3D, con pórtico y tres caminos |
| Animaciones | En el tablero 3D las de la ruta; el martillo y el sello, en pantalla |
| Celular | HTML, como una app real |
| Zonas | Embarco, Viaje y Desembarco, decorativas |
| Paisaje | Buenos Aires: barrios y monumentos de la versión anterior |
| Contenido | Archivo `guion.js` + `npm run build` |

## Guion

1. **Cartel**: "Terminó la clase… ¿Cómo volvemos a casa? Pidamos un auto."
2. **Celular**: app Llevame, 22:10, batería 4 %, Facultad de Derecho → Casa, $12.500 con tarifa dinámica x1,8, letra chica, ACEPTAR. Al tocar: "¡Viaje confirmado!" y aparecen los cuatro autos frente al pórtico.
3. **Bifurcación**:
   - *Negociar los términos*: los autos chocan contra una barrera, aparece el cartel "Contrato por adhesión: se acepta o no se viaja" y vuelven marcha atrás. El botón queda marcado "ya lo intentaron".
   - *Leer los términos*: los términos pasan demasiado rápido durante unos 24 segundos, cambian al inglés y se frenan en "Any dispute shall be resolved by arbitration in Amsterdam, in English". Después, al tablero.
   - *Aceptar sin leer*: directo al tablero.
4. **16 turnos**. En cada uno:
   1. Se resalta el auto de turno (anillo, nombre, ficha abajo).
   2. Gira la ruedita, con clics y un "casi".
   3. El auto avanza solo a su casilla, con la animación que corresponda.
   4. Se abre la carta: título, situación, pregunta en negrita. Siguiente clic: se da vuelta y muestra la respuesta. Siguiente clic: pasa el turno.
5. **Llegada**: los cuatro autos estacionan en Casa. "Destino: Casa".
6. **Sentencias**: una carta por auto, se da vuelta una por clic.
7. **Ruedita**: "¿Se dieron cuenta de que siempre salió el número que necesitábamos?"
8. **Celular final**: batería 2 %, $16.700, x2,4, con la batería y el precio marcados. "¿Y vieron cuánta batería tenía el celular?" Clic en la letra chica: los Términos y Condiciones del juego, cinco cláusulas en chiste.

## Autos

| Auto | Color | Caso | Casillas |
| --- | --- | --- | --- |
| Grupo 1 · La pasajera dormida | Violeta `#7A4FD8` | Bevilacqua (choque con Cabify) | El choque · La contestación de Cabify · Primera instancia · La Cámara |
| Grupo 2 · El peor viaje | Coral `#E2412F` | Hipotético: eximentes de responsabilidad | Me chocaron de atrás · El perro · La tormenta · Me bajo acá |
| Grupo 3 · La letra chica | Turquesa `#13A89E` | Cláusulas abusivas (Uber, caso Facebook) | El reclamo · La indemnidad · Ámsterdam · El Estado interviene |
| Grupo 4 · El taxi | Amarillo `#F2B705` | Sindicato de Peones de Taxis | La demanda (2016) · La sentencia · La condena · Llega la regulación (2026) |

## Animaciones

| Casilla | Animación | Qué pasa |
| --- | --- | --- |
| 1 | `choque` | El auto se despista, choca un árbol y un semáforo, vuelca y queda en su casilla |
| 2 | `alcance` | El auto 2 frena en un semáforo en rojo; el auto 1, que está atrás, lo choca y vuelve |
| 6 | `perro` | Cruza un perro, frenada fuerte, el perro sigue contento |
| 10 | `tormenta` | Alerta naranja, lluvia, relámpagos y un árbol que cae sobre el techo |
| 14 | `salto` | "¡NO, ESPERÁ!": la pasajera se tira del auto en movimiento |
| 11 | `amsterdam` | Aparecen un molino y un juez con peluca: "Order! This dispute shall be heard in Amsterdam, in English." |
| 8 | `sello` | Ícono de la app con el sello rojo "SERVICIO DE TRANSPORTE" |
| 9, 13 | `martillo` | Golpes de martillo de juez |

## Tablero

- De abajo hacia arriba: la Facultad, el pórtico de la bifurcación con sus tres caminos (el de negociar termina en la barrera), la salida y el camino de las 16 casillas alrededor de la ruedita, hasta Casa.
- Cada casilla muestra solo el color y el número del auto dueño. El título aparece en un cartelito al costado cuando el auto cae ahí.
- Las tres zonas (Embarco, Viaje, Desembarco) tiñen el fondo y llevan su nombre impreso.
- Barrios y monumentos de Buenos Aires, con sus nombres sin pisar caminos ni utilería.

## Identidad visual

Basada en el Manual de marca .UBA.

| Token | Valor | Uso |
| --- | --- | --- |
| Azul UBA | `#1D2554` | Paneles, carteles, texto |
| Celeste | `#91BDE1` | Selección |
| Dorado | `#F7A600` | Acentos, turno activo, títulos de carteles |
| Dorado claro | `#FCCD8E` | Texto sobre azul |
| Coral | `#EF4230` | Alertas, sello |
| Papel | `#FBF6EA` | Cartas y fichas de equipo |

Tipografía: **Bitter** (la tipografía institucional UBA), incluida en el archivo. Black para títulos y números, Bold para etiquetas, Regular para texto.

No se usa el escudo oficial de la UBA: hace falta el archivo autorizado.

## Pantalla

- **Barra superior**: "El juego de los contratos / Transporte · Grupo 7", el turno actual con lo que hace el próximo `Espacio`, y botones (atrás, vista general, sonido, pantalla completa, menú).
- **Equipos**: cuatro fichas abajo, con cuatro marcas de progreso cada una. La del auto de turno se levanta.
- **Carta**: a la derecha, del color del auto, para que el auto se vea a la izquierda. Se da vuelta en 3D para la respuesta.
- **Menú** (`G`): "Ir a" cualquier momento del guion, ajustes (calidad, velocidad, sonido, volumen), empezar de cero y atajos.

## Movimiento y cámara

- Vista general mientras se espera el giro; la cámara va a la ruedita al girar, sigue al auto en su recorrido y lo deja a la izquierda cuando se abre la carta.
- La ruedita desacelera con una curva suave, hace clic en cada segmento y casi se detiene en el número vecino antes del final.
- `Espacio` durante una animación la termina. Atrás y "Ir a" no animan.
