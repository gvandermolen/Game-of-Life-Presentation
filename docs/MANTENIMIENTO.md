# Mantenimiento

## Checklist antes de presentar

1. Abrir `jugar/JUGAR.html` en la computadora que se va a usar, con el proyector o Meet.
2. `F` para pantalla completa. Verificar que las diapositivas y las tarjetas se lean bien en la pantalla compartida.
3. Probar sonido y volumen (`M` > Ajustes).
4. Revisar el nombre del juego (`M` > Ajustes > Nombre del juego).
5. Recorrer el guion una vez entero (o con `M` > "Ir a"), y después `M` > Empezar de cero.
6. Si va lento: Calidad gráfica Media o Baja.
7. Llevar el archivo en un pendrive como respaldo.

## Cambiar los textos

Todos los textos del juego están en un solo archivo: `src/content/guion.js`, en el orden en que aparecen. Después de editar:

```bash
npm test && npm run build
```

y abrir de nuevo `jugar/JUGAR.html`.

| Qué | Dónde, en `guion.js` |
| --- | --- |
| Nombre por defecto, subtítulo y tema | `TITULO`, `SUBTITULO`, `TEMA` (el nombre también se cambia desde el menú) |
| Las tres zonas: nombre, tema, color y casillas | `ZONAS` |
| Números de la ruedita de la vuelta (15) | `GIROS_VUELTA` |
| Las 14 diapositivas de la vuelta | `VUELTA` |
| Cartel de llegada de la vuelta | `LLEGADA_VUELTA` |
| Celular del principio y del final (batería, precio, tarifa) | `CELULAR`, `CELULAR_FINAL` |
| Bifurcación y cartel de contrato por adhesión | `BIFURCACION` |
| Términos que pasan rápido (y cuántos segundos duran) | `TERMINOS` |
| Números de la ruedita del juego (12) | `GIROS_JUEGO` |
| Los cuatro autos, sus casillas y su sentencia | `AUTOS` |
| Textos de las animaciones (alerta, globos, juez) | `ANIMACION` |
| Cartel de llegada del juego | `LLEGADA` |
| Cartel final de la ruedita y títulos de las listas | `RUEDITA` |
| Cláusulas del juego | `CLAUSULAS` |

### Una diapositiva de la vuelta

Cada una tiene `tema`, `icono`, `titulo` y un `diseno` que elige cómo se dibuja:

| `diseno` | Campos |
| --- | --- |
| `linea` | `hitos: [{ fecha, texto }]`: una línea de tiempo |
| `renglones` | `renglones`, y opcionales `subtitulo` (chips separados por " · ") y `figura` (`escudo`, `boleto`, `cadena` con `eslabones`, `mapa`) |
| `columnas` | `columnas: [{ icono, titulo, renglones }]` y `pie` |
| `etapas` | `etapas` (las flechas) y `columnas`; cada renglón de las columnas es una parte |
| `extincion` | `grupos: [{ titulo, renglones }]` (normal y anormal) |
| `tarjetas` | `tarjetas: [{ titulo, texto }]`, una parte cada una, y `recuadro` como última parte |
| `enfrentadas` | Dos `columnas` (una parte cada una); `citas: true` las pone entre comillas |

`partes` dice cuántos clics hacen falta para mostrar todo el texto (si no está, 1). Las referencias como "(art. 1289)" se pasan solas al final del renglón, en gris y más chicas.

Los iconos están en `src/ui/topics.js`.

### Un auto

```js
{
  grupo: 'Grupo 1',
  nombre: 'La pasajera dormida',
  vehiculo: 'app',            // app, taxi, auto, remis, colectivo, moto
  color: '#7A4FD8',
  caso: 'Basado en el fallo Bevilacqua (choque con Cabify)',
  casillas: [ /* exactamente 3 */ ],
  sentencia: '$9.000.000 por incapacidad + …',
}
```

### Una casilla del juego

| Campo | Obligatorio | Qué es |
| --- | --- | --- |
| `titulo` | Sí | Título de la tarjeta |
| `situacion` | Sí | El caso |
| `pregunta` | Sí | La pregunta en negrita |
| `respuesta` | Sí | Lo que aparece debajo con el clic siguiente |
| `anim` | No | Animación al avanzar: `choque`, `alcance`, `pozo`, `perroTormenta`, `salto`, `amsterdam`, `martillo` |
| `pista` | No | Línea chica bajo la pregunta |
| `opciones`, `correctas` | No | Opciones a mostrar. Si hay `opciones`, `correctas` es obligatorio: los índices desde 0 que se marcan como correctos en la respuesta |
| `subtitulo` | No | Se agrega después de "Casilla N de 3" |
| `reloj` | No | Hora que se muestra en la tarjeta (el Grupo 2 llega tarde al `parcial`) |

Los turnos van auto 1, 2, 3, 4 y se repiten. Cada auto avanza por su carril lo que marca la ruedita, así que `GIROS_JUEGO` decide en qué casilla cae cada uno: hoy el auto 1 cae en 4, 11 y 17; el 2 en 5, 9 y 14; el 3 en 3, 11 y 14; el 4 en 6, 8 y 18. El `alcance` necesita al auto 1 justo atrás del 2 (casillas 4 y 5). Las casillas salen solas de los números, pero `tests/flow.test.mjs` las fija a propósito (y `tests/layout.test.mjs` las de la vuelta): si se cambian los números, actualizar ahí las casillas esperadas. `npm test` también verifica que nadie pase de la última casilla y que dos autos nunca compartan casilla.

## Cambiar el código

Rutas relativas a `src/`. Ver [TECH.md](TECH.md) para la arquitectura.

| Qué | Dónde |
| --- | --- |
| Orden de los pasos del guion | `engine/flow.js` |
| Carriles del juego, bifurcación, Inicio y Destino | `scene/layout.js` (lo verifica `tests/layout.test.mjs`) |
| Camino de la vuelta | `scene/lap.js` |
| Animaciones del tablero y de la bifurcación | `scene/fx.js` |
| Cámara, autos, ruedita, bandera | `scene/stage.js` |
| Diapositivas de la vuelta | `ui/slides.js` |
| Tarjetas del juego | `ui/cards.js` |
| Celular, bifurcación, términos, llegada, sentencias, ruedita final | `ui/scenes.js` |
| Lluvia, globos, martillo, confeti | `ui/effects.js` |
| Barra superior, equipos, nombres sobre los autos, botón de menú | `ui/hud.js` |
| Menú y aviso de "Continuar" | `ui/menu.js` |
| Sonidos | `ui/sound.js` |
| Atajos de teclado | `main.js` → `onKey()` |
| Colores e identidad | `styles.css` (`:root`) y `scene/palette.js` |
| Monumentos y barrios | `scene/landmarks.js` |

Si cambia la cantidad de pasos del guion, subí `STORE_VERSION` y `STORAGE_KEY` en `engine/store.js` para que no se retome una partida vieja.

## Problemas conocidos

- Mover `JUGAR.html` de carpeta puede hacer que el navegador no encuentre dónde quedó (sobre todo en Safari). Se retoma con `M` > "Ir a".
- Sin WebGL (computadoras muy viejas o con aceleración desactivada) el tablero no arranca y se muestra un aviso.
