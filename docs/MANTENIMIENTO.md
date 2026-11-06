# Mantenimiento

## Checklist antes de presentar

1. Abrir `jugar/JUGAR.html` en la computadora que se va a usar, con el proyector o Zoom.
2. `F` para pantalla completa. Verificar que las cartas se lean bien en la pantalla compartida.
3. Probar sonido y volumen (`G` > Ajustes).
4. Recorrer el guion una vez entero (o con `G` > "Ir a"), y después `G` > Empezar de cero.
5. Si va lento: Calidad gráfica Media o Baja.
6. Llevar el archivo en un pendrive como respaldo.

## Cambiar los textos

Todos los textos del juego están en un solo archivo: `src/content/guion.js`, en el orden en que aparecen. Después de editar:

```bash
npm test && npm run build
```

y abrir de nuevo `jugar/JUGAR.html`.

| Qué | Dónde, en `guion.js` |
| --- | --- |
| Título y subtítulo | `TITULO`, `SUBTITULO` |
| Cartel inicial | `TRANSICION` |
| Celular del principio y del final (batería, precio, tarifa) | `CELULAR`, `CELULAR_FINAL` |
| Bifurcación y cartel de contrato por adhesión | `BIFURCACION` |
| Términos que pasan rápido (y cuántos segundos duran) | `TERMINOS` |
| Números de la ruedita, uno por turno | `GIROS` |
| Cartel final de la ruedita | `RUEDITA` |
| Los cuatro autos, sus casillas y su sentencia | `AUTOS` |
| Textos de las animaciones (alerta, globos, sello) | `ANIMACION` |
| Cartel de llegada | `LLEGADA` |
| Cláusulas del juego | `CLAUSULAS` |

### Un auto

```js
{
  grupo: 'Grupo 1',
  nombre: 'La pasajera dormida',
  vehiculo: 'app',            // app, taxi, auto, remis, colectivo, moto
  color: '#7A4FD8',
  caso: 'Basado en el fallo Bevilacqua (choque con Cabify)',
  casillas: [ /* exactamente 4 */ ],
  sentencia: '$9.000.000 por incapacidad + …',
}
```

### Una casilla

| Campo | Obligatorio | Qué es |
| --- | --- | --- |
| `titulo` | Sí | Título de la carta y del cartelito junto a la casilla |
| `situacion` | Sí | El caso, en la cara de la carta |
| `pregunta` | Sí | La pregunta en negrita |
| `respuesta` | Sí | Lo que aparece al dar vuelta la carta |
| `anim` | No | Animación antes de la carta: `choque`, `alcance`, `perro`, `tormenta`, `salto`, `amsterdam` (en el tablero), `martillo`, `sello` (en pantalla) |
| `pista` | No | Línea chica bajo la pregunta |
| `opciones`, `correctas` | No | Opciones a mostrar. Si hay `opciones`, `correctas` es obligatorio: los índices desde 0 que se marcan como correctos en la respuesta |
| `subtitulo` | No | Se agrega después de "Casilla N de 4" |

Los turnos van auto 1, 2, 3, 4 y se repiten: el auto 1 juega las casillas 1, 5, 9 y 13; el auto 2, las 2, 6, 10 y 14; y así. Las animaciones del tablero están hechas para su casilla (por ejemplo, `alcance` necesita al auto 1 en la casilla 1 justo atrás); moverlas de casilla puede verse raro.

`GIROS` tiene que tener 16 números del 1 al 10, sin repetir el mismo dos veces seguidas. No cambian nada (cada auto siempre va a su casilla siguiente): solo tienen que parecer al azar. `npm test` lo verifica.

## Cambiar el código

Rutas relativas a `src/`. Ver [TECH.md](TECH.md) para la arquitectura.

| Qué | Dónde |
| --- | --- |
| Orden de los pasos del guion | `engine/flow.js` |
| Forma del camino, casillas, bifurcación | `scene/layout.js` (lo verifica `tests/layout.test.mjs`) |
| Animaciones del tablero y de la bifurcación | `scene/fx.js` |
| Cámara, autos, ruedita | `scene/stage.js` |
| Cartas | `ui/cards.js` |
| Celular, bifurcación, términos, llegada, sentencias | `ui/scenes.js` |
| Lluvia, globos, martillo, sello | `ui/effects.js` |
| Barra superior, equipos, nombres sobre los autos | `ui/hud.js` |
| Menú y aviso de "Continuar" | `ui/menu.js` |
| Sonidos | `ui/sound.js` |
| Atajos de teclado | `main.js` → `onKey()` |
| Colores e identidad | `styles.css` (`:root`) y `scene/palette.js` |
| Monumentos y barrios | `scene/landmarks.js` |

Si cambia la cantidad de pasos del guion, subí la versión de `STORAGE_KEY` en `engine/store.js` para que no se retome una partida vieja.

## Problemas conocidos

- Mover `JUGAR.html` de carpeta puede hacer que el navegador no encuentre dónde quedó (sobre todo en Safari). Se retoma con `G` > "Ir a".
- Sin WebGL (computadoras muy viejas o con aceleración desactivada) el tablero no arranca y se muestra un aviso.
