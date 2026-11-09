# Especificación técnica

## Resumen

- JavaScript sin framework + [Three.js](https://threejs.org) r170 para el tablero 3D.
- esbuild empaqueta todo en **un solo archivo** `jugar/JUGAR.html` (unos 3 MB): JavaScript, CSS, tipografías y el HDRI de iluminación en base64. Las demás texturas y los sonidos se generan por código.
- Abre desde `file://` con doble clic, sin servidor ni internet.
- Navegadores: Chrome/Edge 100+, Safari 15+, Firefox 100+. Requiere WebGL 2.

## Estructura

```
src/
  content/guion.js  Todos los textos: las 14 diapositivas, los números de las dos
                    ruedas, los cuatro autos y sus casillas
  engine/           Sin DOM: se prueba con node --test
    flow.js           El guion como máquina de estados
    store.js          Estado actual, atrás/adelante, saltos, guardado, ajustes
  scene/            Tablero 3D
    layout.js         Juego: cuatro carriles, bifurcación, Inicio, Destino, zonas,
                      río; las clases Path, Lane y Route
    lap.js            Vuelta: el camino de 40 casillas, sus zonas y Destino
    track.js          Geometría de los dos caminos, casillas, pórtico, barrera,
                      bandera, carteles de zona, cartel del título
    fx.js             Animaciones del tablero (choque, alcance, pozo, perro y
                      tormenta, salto, Ámsterdam) y de la bifurcación
    stage.js          Renderizador, luces, cámara, autos, ruedita, tareas animadas
    landmarks.js      Monumentos de cada barrio y sus nombres
    board.js          Mesa, marco, Facultad, Casa, edificios, árboles; un grupo
                      común y uno por tablero
    spinner.js        Ruedita
    vehicles.js       Las fichas (app, taxi, auto, remis, colectivo, moto)
    text3d.js         Letras nítidas: atlas de glifos Bitter, texto sobre curvas
    space.js          La prueba "¿hay lugar libre acá?" para la utilería, por tablero
    printed.js        Fondo impreso (canvas)
    post.js           Posprocesado
    gpu-timer.js      Medición de tiempo de GPU para bajar la calidad
    textures.js, merge.js, palette.js
  ui/               HTML sobre el tablero
    hud.js            Barra superior, equipos, nombres sobre los autos, botón de menú
    slides.js         Diapositivas de la vuelta y cartel de llegada
    cards.js          Tarjetas del juego (pregunta, y la respuesta debajo)
    scenes.js         Celular, bifurcación, términos, llegada, sentencias,
                      ruedita final con los números
    effects.js        Lluvia y alerta, relámpago, globos, martillo, confeti
    menu.js           Menú (ir a, ajustes, empezar de cero) y aviso de "Continuar"
    topics.js         Iconos de los temas (SVG y canvas)
    sound.js          Sonidos sintetizados (WebAudio)
    icons.js, dom.js
  main.js           Director: acciones, animación de cada paso, cámara, teclado
  styles.css        Estilos y tokens UBA
  index.html        Plantilla
build.mjs           Genera jugar/JUGAR.html
tests/              flow, guion y layout
```

## Flujo

El juego es un guion fijo. Un estado es un objeto chico que dice en qué punto del guion estamos:

```
vuelta{stop: 0, listo}
→ vuelta{n, titulo} → vuelta{n, texto, part: 1..partes} → vuelta{n, listo} … (n = 1..14)
→ meta → celular
→ bifurcacion{car, tried} ─┬─ negociar → bifurcacion{car, tried: [...,'negociar']}
                           └─ leer | aceptar → bifurcacion{car + 1, tried: []} … o, tras el auto 4,
turno{t, listo} → girado → movido → pregunta → respuesta → turno{t+1, listo} … (12 turnos)
→ llegada → sentencias{shown: 1..4} → ruedita{lista: false} → ruedita{lista: true}
→ celular2 → clausulas (fin)
```

- `next(s)` y `choose(s, camino)` (en `flow.js`) son las únicas formas de avanzar. Son funciones puras.
- El turno `t` lo juega el auto `t % 4` en su ronda `t / 4`; la casilla es la suma de sus giros (`LANE_POS`). En la vuelta, `LAP_POS` hace lo mismo con `GIROS_VUELTA`.
- Todo lo que se ve se deriva del estado: `world(s)` (qué tablero), `carPlaces(s)` (dónde está cada auto del juego), `lapPlace(s)` (el auto de la vuelta), `spinShown(s)` (qué número muestra la ruedita), `activeCar(s)`.
- `walkthrough()` lista todos los estados del guion (tomando "aceptar" en la bifurcación). Lo usan el menú "Ir a" y las pruebas.

### Director (`main.js`)

- `run(prev, next)`: reproduce la animación del paso, después `stage.snap(next)` acomoda todo en su lugar exacto y `show(next)` abre las capas HTML y mueve la cámara. `show` es idempotente. A mitad de un turno no se hace `snap`, para que lo que dejó la animación (la rama en el techo, el chichón) siga a la vista hasta que se cierra la tarjeta.
- Los dos tableros están siempre cargados; `stage.setWorld()` muestra uno u otro. El auto de la vuelta es la quinta ficha (`LAP_CAR`).
- Mientras se anima, `Espacio` termina la animación (`stage.skipAnimations()`). En la bifurcación, el primer `Espacio` acorta solo el cartel o el texto de los términos.
- Atrás, "Ir a" y Empezar de cero no animan: `redraw(state)` hace `snap` y `show`. Si había una animación en curso, primero la termina.
- Las animaciones usan el reloj del tablero (`stage.task`, `stage.wait`), no `setTimeout`, así respetan la velocidad elegida y se pueden terminar de golpe.

## Guardado

- Clave `destino-sano-y-salvo.v2` en `localStorage`: estado actual, pilas de atrás/adelante y ajustes (nombre, calidad, velocidad, sonido, volumen). Se escribe en cada paso.
- Al abrir, si el guion no está al principio, se ofrece "Continuar" o "Empezar de cero".
- En Chrome y Edge, `localStorage` de archivos `file://` se comparte entre archivos locales; en Safari depende de la ruta del archivo.
- Si el almacenamiento está bloqueado (modo privado), el juego funciona igual pero sin guardado.
- Si cambia el formato o la cantidad de pasos, subir `STORAGE_KEY` en `store.js`: lo guardado con otra versión se ignora.

## Gráficos

- Renderizado PBR con mapeo de tonos ACES, iluminación de entorno de un HDRI de estudio (`assets/studio.hdr`, "Studio Small 09" 1K, CC0 de Poly Haven, embebido en el HTML), sombra suave de una luz principal, relleno y foco cenital.
- Posprocesado (`post.js`, Alta y Media): oclusión ambiental GTAO a media resolución, un brillo leve en dorados y SMAA. Sin desenfoque: en el proyector cada casilla tiene que leerse nítida.
- Lo que tiene que verse nítido de cerca es geometría, no textura: camino, casillas, pórtico y cartelitos (`track.js`). Los textos del tablero se arman con un atlas de glifos (`text3d.js`).
- La geometría estática se une por material (`merge.js`) para reducir llamadas de dibujo.
- Calidad (menú > Ajustes): **Alta** (resolución hasta 2×, sombras 4096, posprocesado), **Media** (hasta 1,5×, 2048, posprocesado), **Baja** (1×, sin sombras ni posprocesado, menos árboles). Cambiarla recarga la página y retoma donde estaba.
- Sin parpadeo: la cámara queda quieta cuando no hay animación, y el plano cercano está en 2 para separar capas finas.
- Si un cuadro le cuesta a la GPU más de 22 ms (`gpu-timer.js`), cada 2 segundos se resigna algo: primero la oclusión ambiental y después resolución, de a 0,25× hasta 1×. Sin la extensión de medición se usa la tasa de cuadros.
- ¿Por qué no un motor nativo? Se probó Godot 4.7 en la MacBook Pro de la presentación (Intel + Radeon Pro 5500M): sin Metal nativo, no superaba unos 25 cuadros por segundo. Three.js en Chrome dibuja el tablero completo con efectos en unos 11 ms.

## Pruebas

```bash
npm test
```

- `flow.test.mjs`: el guion completo de la vuelta a las cláusulas, los clics de cada casilla y de cada turno, dónde cae cada giro, que dos autos nunca compartan casilla, la bifurcación auto por auto, y el `Store` (atrás, adelante, saltos, guardado, otra versión).
- `guion.test.mjs`: las 14 diapositivas con lo que pide su diseño, cuatro autos con tres casillas completas, cada animación en su casilla, los números de las ruedas, las sentencias, los términos en inglés sin final resaltado.
- `layout.test.mjs`: carriles de 20 casillas separados, Inicio y bifurcación para cada carril, nada fuera del tablero ni sobre la ruedita ni el río, curvas no demasiado cerradas, nombres de zona fuera del camino; la vuelta con sus 40 casillas y sus zonas.

Verificación manual antes de presentar: [MANTENIMIENTO.md](MANTENIMIENTO.md#checklist-antes-de-presentar).

## Build

`npm run build` ejecuta `build.mjs`:

1. esbuild empaqueta `src/main.js` (IIFE, minificado).
2. Las tipografías Bitter (`@fontsource/bitter`) y el HDRI se insertan como data URL.
3. CSS y JS se insertan en `src/index.html` y se escribe `jugar/JUGAR.html`.

`npm run dev` recompila al guardar. Para probar con herramientas de desarrollo, servir la carpeta `jugar/` (por ejemplo `python3 -m http.server`) o abrir el archivo directamente.

En la consola, `window.__juego` expone la aplicación: `__juego.store.state`, `__juego.jump({ phase: 'turno', turn: 5, step: 'listo' })` o `__juego.jump({ phase: 'vuelta', stop: 8, step: 'texto', part: 4 })`, `__juego.next()`.
