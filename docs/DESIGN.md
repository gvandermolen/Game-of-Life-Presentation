# Especificación de diseño

Estado: versión 1 (escenario). Mecánicas y contenido jurídico provisorios.

## Objetivo

Un tablero de juego que se vea como un objeto físico real proyectado en pantalla, para que una presentación de unos 30 minutos ante estudiantes de Derecho sea participativa. El juego es el soporte: el contenido son las preguntas y casos de jurisprudencia de transporte.

Criterios de éxito:

- Se lee desde el fondo del aula en un proyector de 720p o 1080p.
- Los expositores pueden corregir cualquier error en vivo en menos de 10 segundos (deshacer, ir a una jugada, ajuste manual).
- Los choques entre equipos ocurren seguido, porque ilustran accidentes de tránsito.
- Funciona sin internet con doble clic, en Mac y Windows.

## Decisiones tomadas con el cliente

| Tema | Decisión |
| --- | --- |
| Idioma | Español rioplatense |
| Quién opera | Solo los expositores. Los equipos del aula discuten y responden en voz alta |
| Equipos | 2 a 6. Por defecto: Colectivo, Taxi, Auto particular, Plataforma (Uber/Cabify), Moto, Remis |
| Tablero | Una ruta sinuosa por transporte. Las rutas se trenzan y se cruzan físicamente en 8 rotondas |
| Choques | Parada obligatoria en cada cruce; si ya hay otro equipo **en esa misma rotonda**, hay choque |
| Resolución de choque | Carta conjunta; ambos equipos argumentan; los expositores eligen quién prevalece |
| Casillas | Tipadas: pregunta, dilema, apelación, multa, bonus, control, libre |
| Cartas | 2 o 4 opciones; veredicto de los expositores (correcta, incorrecta, anular) |
| Ganador | El primero que llega a la Meta (cambiable más adelante) |
| Ruleta | Virtual, en el centro, 1 a 10, como en el Juego de la Vida |
| Estética | Homenaje al Juego de la Vida clásico, con identidad UBA en la interfaz |
| Sonido | Sí, con botón de silencio |
| Persistencia | Guardado automático; sobrevive a recargar y cerrar el navegador |

## Reglas provisorias

Todos los valores se cambian en Configuración > Reglas, y el cambio queda en el historial.

- Cada turno, el equipo gira la ruleta (1 a 10) y avanza por su ruta.
- **Cruce** (casillas 8, 17 y 25 de cada ruta): parada obligatoria en una rotonda compartida con otras rutas. Si al llegar ya hay otro equipo en esa rotonda, hay **choque**: carta conjunta y los expositores eligen quién prevalece. Quien no prevalece retrocede 2 casillas (o pierde un turno, o ambas cosas). "Sin responsable" no penaliza a nadie.

### Rotondas: quién se cruza con quién

Cada ruta pasa por 3 rotondas y en cada una se encuentra con rivales distintos. Sirve para asignar los casos: una rotonda es el lugar natural de la carta de accidente entre esos transportes.

| Rotonda | Casilla | Rutas que se cruzan |
| --- | --- | --- |
| 1 | 8 | Colectivo · Taxi |
| 2 | 8 | Auto particular · Plataforma |
| 3 | 8 | Moto · Remis |
| 4 | 18 | Taxi · Colectivo · Plataforma |
| 5 | 18 | Auto particular · Remis · Moto |
| 6 | 27 | Plataforma · Colectivo |
| 7 | 27 | Taxi · Moto |
| 8 | 27 | Remis · Auto particular |

Si se juega con menos equipos, las rotondas de rutas apagadas quedan grises y no generan choques.
- **Pregunta**: carta de 4 opciones. Correcta +1, incorrecta 0.
- **Dilema**: carta de 2 posturas. Correcta +2, incorrecta −1.
- **Apelación**: carta de 2 opciones. Si prospera +3.
- **Multa**: retrocede 2.
- **Bonus**: gira otra vez.
- **Control**: pierde el próximo turno.
- Los movimientos por efectos no activan la casilla de destino (evita cadenas largas en vivo).
- Gana el primero que llega a la casilla 32 (Meta).

### Ritmo

32 casillas con 3 paradas obligatorias dan unas 5 a 7 jugadas por equipo. Con 6 equipos son unas 35 jugadas más cartas: algo más de 30 minutos. Para acortar: desactivar "Cruces con parada obligatoria" o usar menos equipos. Para alargar: bajar el valor máximo de la ruleta.

### Composición de casillas

Cada ruta tiene exactamente las mismas cantidades de cada tipo, en distinto orden (rotación por tramos), así ningún transporte tiene ventaja.

| Tipo | Por ruta |
| --- | --- |
| Libre | 9 |
| Pregunta | 5 |
| Dilema | 4 |
| Multa | 3 |
| Apelación | 3 |
| Bonus | 2 |
| Control | 2 |
| Cruce (compartido) | 3 |

## Tablero

- Mesa de madera barnizada, tablero con marco azul UBA y filete dorado.
- Fondo "impreso" como el cartón del juego de 1960: parches de colores suaves (mostaza, naranja, verdes), grano de papel, pliegue central y viñeta envejecida. El Riachuelo cruza al frente con su nombre siguiendo la curva del río; cada ruta lo cruza por un puente de baranda blanca que acompaña la curva de la ruta.
- Seis rutas de asfalto con borde del color del equipo que salen de un círculo "SALIDA" con el nombre del transporte, serpentean con curvas redondeadas y se cruzan en 8 rotondas numeradas. Cada rotonda es como una real: calzada circular, cordón cortado en cada entrada, senda peatonal en cada acceso, isla central azul con el número y semáforos detrás (para no tapar el número). Las casillas son piezas en relieve que se curvan con la ruta.
- La Meta es una avenida dorada a cuadros, apenas curva, a lo ancho del fondo. Cada ruta llega derecha y perpendicular a la avenida, como una calle que desemboca en ella, con su propia línea de llegada a cuadros; el texto "META · PALACIO DE JUSTICIA" sigue la curva de la avenida. Detrás, el Palacio de Justicia sobre una plaza.
- Relieve en plástico como el original: casas, iglesias y torres blancas junto a las rutas y árboles. Sin montañas: la ruleta está sobre un pedestal bajo.
- Cada barrio tiene su monumento, ubicado más o menos donde queda en un mapa real (norte hacia el Palacio, el Riachuelo al frente, el río hacia la derecha), con el nombre del barrio y del monumento al lado:

  | Barrio | Monumento |
  | --- | --- |
  | San Nicolás | Obelisco |
  | Monserrat | Casa Rosada |
  | Balvanera | Congreso |
  | La Boca | La Bombonera y Caminito |
  | Puerto Madero | Puente de la Mujer |
  | Recoleta | Floralis Genérica |
  | Palermo | Planetario |
  | Retiro | Torre Monumental |
  | Núñez | Estadio Monumental |
- Fuera del tablero, sobre la mesa: mazos de Preguntas, Dilemas, Apelaciones y Accidentes.
- Fichas: cada transporte es un vehículo de juguete brillante sobre una base redonda del color del equipo. El taxi es negro con techo amarillo, como en Buenos Aires.

## Identidad visual

Basada en el Manual de marca .UBA.

| Token | Valor | Uso |
| --- | --- | --- |
| Azul UBA | `#1D2554` | Marco del tablero, paneles, texto |
| Celeste | `#91BDE1` | Casilla Pregunta, selección |
| Dorado | `#F7A600` | Acentos, Meta, Apelación, turno activo |
| Dorado claro | `#FCCD8E` | Texto sobre azul, Control |
| Turquesa | `#3BC3AD` | Dilema |
| Coral | `#EF4230` | Multa, choques |
| Papel | `#FBF6EA` | Cartas y fichas de equipo |

Tipografía: **Bitter** (la tipografía institucional UBA), incluida en el archivo. Black para títulos y números, Bold para etiquetas, Regular e Italic para texto.

No se usa el escudo oficial de la UBA: hace falta el archivo autorizado. El encabezado dice "Facultad de Derecho · UBA" con un monograma "FD". Si se consigue el logo, va en el encabezado y en la pantalla de inicio.

Prohibido por diseño: degradados violeta, glassmorphism, tarjetas genéricas, emojis como iconos.

## Pantallas

1. **Inicio**: título, equipos, "Comenzar" o "Continuar partida · jugada N".
2. **Tablero**: barra superior (marca, turno actual, botones), leyenda de casillas a la izquierda, fichas de equipos abajo con progreso y estado.
3. **Carta**: tipo, equipo, consigna, opciones grandes con letra, veredicto de los expositores con el efecto a la vista.
4. **Choque**: los equipos enfrentados, consigna y un botón "Prevalece …" por equipo.
5. **Ganador**: nombre del equipo, ranking, confeti, "Deshacer última jugada" por si fue un error.
6. **Configuración**: panel lateral con pestañas Partida, Equipos, Reglas, Presentación, Datos y Atajos.

## Movimiento y cámara

- La cámara arranca con un barrido sobre la mesa y después queda quieta en la vista general: la ruleta gira y las fichas avanzan sin mover la cámara. Solo se mueve para encuadrar una carta, un choque, o si los expositores eligen seguir a un equipo (teclas 1 a 6).
- Con una carta abierta, la cámara deja la ficha en el tercio superior para que no quede tapada.
- La ruleta desacelera con una curva suave y hace "clic" en cada segmento. Siempre se detiene en el número que registró el motor.
- Las fichas avanzan casilla por casilla con un salto corto.
- Choque: acercamiento al cruce, vibración, esquirlas y sonido de bocina y golpe; las fichas quedan enfrentadas en el centro del cruce.
- `Espacio` durante una animación la acelera. Se respeta "reducir movimiento" del sistema en la interfaz.

## Fuera de alcance (versión 1)

- Material jurídico real y reglas definitivas.
- Celulares de los alumnos o varias computadoras.
- Publicación en internet (se define al final).
