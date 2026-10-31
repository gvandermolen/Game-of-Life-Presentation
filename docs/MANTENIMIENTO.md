# Mantenimiento

Guía para quien tenga que cambiar el juego. Las tareas de presentador (equipos, reglas, contenido) no requieren programar: se hacen desde Configuración.

## Checklist antes de presentar

1. Abrir `jugar/JUGAR.html` en la computadora que se va a usar, con el proyector conectado.
2. `F` para pantalla completa. Verificar que se lean las fichas de equipos y las cartas desde el fondo del aula.
3. `C` > Equipos: elegir los equipos que juegan, nombres y colores. "Nueva partida con estos equipos".
4. `C` > Datos: cargar el contenido jurídico, si ya está listo.
5. Probar sonido y volumen (`C` > Presentación).
6. Jugar dos o tres turnos de prueba, luego `C` > Partida > Reiniciar partida a 0.
7. Si va lento: Calidad gráfica Media o Baja.
8. Llevar el archivo en un pendrive como respaldo, y opcionalmente una partida exportada.

## Cambiar desde Configuración (sin programar)

| Qué | Dónde |
| --- | --- |
| Equipos que juegan (2 a 6), nombres, colores | Equipos |
| Valores de las reglas provisorias | Reglas > Aplicar reglas |
| Título, subtítulo, calidad, sonido, velocidad, leyenda | Presentación |
| Exportar o importar partida, cargar contenido, borrar todo | Datos |

## Cargar el contenido jurídico real

El contenido es un archivo JSON. Se carga en Configuración > Datos > Cargar contenido, queda guardado en el navegador y se puede quitar.

```json
{
  "nombre": "Jurisprudencia de transporte · versión 1",
  "cartas": [
    {
      "id": "p-01",
      "tipo": "pregunta",
      "titulo": "Responsabilidad del transportista",
      "caso": "Nombre del fallo, tribunal, año",
      "texto": "Consigna que se proyecta en la carta.",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correcta": 2,
      "transportes": ["colectivo"]
    }
  ]
}
```

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| `tipo` | Sí | `pregunta` (4 opciones), `dilema` (2), `apelacion` (2) o `colision` (choque, sin opciones) |
| `texto` | Sí | Consigna que se proyecta |
| `opciones` | Sí, salvo `colision` | Entre 2 y 4 textos cortos |
| `titulo` | No | Título de la carta; si falta, se usa el nombre del tipo |
| `caso` | No | Línea pequeña sobre la consigna (fallo, tribunal) |
| `correcta` | No | Índice desde 0. Si está, al marcar una opción se ve si es correcta y se sugiere el veredicto. Los expositores siempre confirman |
| `transportes` | No | Ids de equipos para los que conviene la carta: `colectivo`, `taxi`, `auto`, `app`, `moto`, `remis`. Si hay cartas para el equipo, se usan primero |
| `id` | No | Para ubicar la carta al editar |

Las cartas de cada tipo se usan en orden y vuelven a empezar al terminarse. El orden queda registrado en la partida, así que deshacer vuelve a mostrar la misma carta.

Hay un ejemplo válido en [placeholders/contenido-ejemplo.json](placeholders/contenido-ejemplo.json) (casos ficticios: no proyectar en la presentación real).

## Cambiar el código

Todas las rutas son relativas a `src/`. Después de cualquier cambio: `npm test` y `npm run build`.

| Qué | Dónde |
| --- | --- |
| Valores por defecto de las reglas | `engine/rules.js` → `DEFAULT_RULES` |
| Qué hace cada casilla | `engine/reducer.js` → `land()` |
| Orden y cantidad de casillas, cruces, largo de la ruta | `engine/board.js` → `SEGMENTS`, `CRUCES`, `LANE_LENGTH` |
| Quién se cruza con quién en cada rotonda | `engine/board.js` → `LEVEL_GROUPS` (y la tabla de `docs/DESIGN.md`) |
| Equipos por defecto (nombre, color, ruta) | `engine/roster.js` |
| Colores de casillas e identidad | `scene/palette.js` y `styles.css` (`:root`) |
| Forma de las rutas (columnas, alturas de los cruces, curvas) | `scene/layout.js` → `COLS`, `Z_LEVELS`, `BUMP`, `warp()` |
| Dibujo del tablero impreso (regiones, río, barrios, cartel) | `scene/printed.js` |
| Montañas, edificios, árboles, semáforos | `scene/board.js` |
| Vehículos | `scene/vehicles.js` → `BUILDERS` |
| Textos de cartas genéricas | `content/deck.js` → `GENERIC` |
| Atajos de teclado | `main.js` → `onKey()` |
| Sonidos | `ui/sound.js` |

### Reglas al cambiar el motor

- El reductor debe seguir siendo puro: nada de `Math.random()` ni de fechas adentro. Lo aleatorio se decide antes y viaja en la acción (como `SPIN.value`).
- Si cambiás `board.js` (casillas, cruces, largo, rotondas), las partidas guardadas dejan de tener sentido: subí `SESSION_VERSION` en `engine/session.js`.
- Si tocás la forma de las rutas en `layout.js`, corré `npm test`: `tests/layout.test.mjs` avisa si dos rutas se tocan fuera de una rotonda o si una ruta pisa la ruleta.
- Agregar un tipo de casilla: estilo en `scene/palette.js`, efecto en `reducer.js`, texto en `ui/hud.js` → `effectText()`, nombre en `board.js` → `SQUARE_TYPES`.

## Recuperar una partida en vivo

Ver también [ATAJOS.md](ATAJOS.md#si-algo-sale-mal).

- Todo lo que pasó está en Configuración > Partida > Historial, con una línea por acción.
- "Ir aquí" vuelve a ese punto sin borrar lo posterior: se puede volver adelante con Rehacer o con "Ir aquí" en una fila gris, hasta que se juegue algo nuevo.
- "Ir a la jugada número N" deja la partida justo después del giro N (con la carta o el choque de ese giro ya resueltos, si lo estaban).
- El ajuste manual queda registrado y se puede deshacer.

## Problemas conocidos

- Mover `JUGAR.html` de carpeta puede hacer que el navegador no encuentre la partida guardada (sobre todo en Safari). Solución: Exportar antes, Importar después.
- Algunos navegadores bloquean el sonido hasta el primer clic o tecla: la pantalla de inicio se encarga de eso.
- Sin WebGL (computadoras muy viejas o con aceleración desactivada) el tablero no arranca y se muestra un aviso.
