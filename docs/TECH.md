# Especificación técnica

## Resumen

- JavaScript sin framework + [Three.js](https://threejs.org) r170 para el tablero 3D.
- esbuild empaqueta todo en **un solo archivo** `jugar/JUGAR.html` (unos 3 MB): JavaScript, CSS, tipografías y el HDRI de iluminación en base64. Las demás texturas y los sonidos se generan por código.
- Abre desde `file://` con doble clic, sin servidor ni internet.
- Navegadores: Chrome/Edge 100+, Safari 15+, Firefox 100+. Requiere WebGL 2.

## Estructura

```
src/
  content/guion.js  Todos los textos, los números de la ruedita y los cuatro autos
  engine/           Sin DOM: se prueba con node --test
    flow.js           El guion como máquina de estados
    store.js          Estado actual, atrás/adelante, saltos, guardado, ajustes
  scene/            Tablero 3D
    layout.js         Camino único, bifurcación, 16 casillas, colas, Destino
    track.js          Geometría del camino, casillas, pórtico, barrera, cartelitos
    fx.js             Animaciones del tablero (choque, alcance, perro, tormenta,
                      salto, Ámsterdam) y de los tres caminos de la bifurcación
    stage.js          Renderizador, luces, cámara, autos, ruedita, tareas animadas
    landmarks.js      Monumentos de cada barrio y sus nombres
    board.js          Mesa, marco, Facultad, Casa, edificios, árboles
    spinner.js        Ruedita
    vehicles.js       Las fichas (app, taxi, auto, remis, colectivo, moto)
    text3d.js         Letras nítidas: atlas de glifos Bitter, texto sobre curvas
    space.js          La prueba "¿hay lugar libre acá?" para la utilería
    printed.js        Fondo impreso (canvas)
    post.js           Posprocesado
    gpu-timer.js      Medición de tiempo de GPU para bajar la calidad
    textures.js, merge.js, palette.js
  ui/               HTML sobre el tablero
    hud.js            Barra superior, equipos, nombres sobre los autos
    cards.js          Carta con vuelta (pregunta / respuesta)
    scenes.js         Cartel inicial, celular, bifurcación, términos, llegada,
                      sentencias, cartel de la ruedita
    effects.js        Lluvia y alerta, relámpago, globos, martillo, sello, confeti
    menu.js           Menú (ir a, ajustes, empezar de cero) y aviso de "Continuar"
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
transicion → celular → bifurcacion{tried} ─┬─ negociar → bifurcacion{tried: [...,'negociar']}
                                           └─ leer | aceptar → turno{turn: 0, step: 'listo'}
turno{t, listo} → turno{t, pregunta} → turno{t, respuesta} → turno{t+1, listo} … (16 turnos)
→ llegada → sentencias{shown: 1..4} → ruedita → celular2 → clausulas (fin)
```

- `next(s)` y `choose(s, camino)` (en `flow.js`) son las únicas formas de avanzar. Son funciones puras.
- El turno `t` lo juega el auto `t % 4` y cae en la casilla `t + 1`.
- Todo lo que se ve se deriva del estado: `carPlaces(s)` (dónde está cada auto), `revealed(s)` (cuántos cartelitos de casilla se ven), `activeCar(s)`.
- `walkthrough()` lista todos los estados del guion (tomando "aceptar" en la bifurcación). Lo usan el menú "Ir a" y las pruebas.

### Director (`main.js`)

- `run(prev, next)`: reproduce la animación del paso, después `stage.snap(next)` acomoda todo en su lugar exacto y `show(next)` abre las capas HTML y mueve la cámara. `show` es idempotente.
- Mientras se anima, `Espacio` termina la animación (`stage.skipAnimations()`). En la bifurcación, el primer `Espacio` acorta solo el cartel o el texto de los términos.
- Atrás, "Ir a" y Empezar de cero no animan: `redraw(state)` hace `snap` y `show`. Si había una animación en curso, primero la termina.
- Las animaciones usan el reloj del tablero (`stage.task`, `stage.wait`), no `setTimeout`, así respetan la velocidad elegida y se pueden terminar de golpe.

## Guardado

- Clave `juego-de-los-contratos.v1` en `localStorage`: estado actual, pilas de atrás/adelante y ajustes (calidad, velocidad, sonido, volumen). Se escribe en cada paso.
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

- `flow.test.mjs`: el guion completo, el orden intercalado de los turnos, que dos autos nunca compartan casilla, la bifurcación en cualquier orden, y el `Store` (atrás, adelante, saltos, guardado, otra versión).
- `guion.test.mjs`: cuatro autos con cuatro casillas completas, cada animación en su casilla, un número de ruedita por turno, los términos terminan en el arbitraje en inglés.
- `layout.test.mjs`: casillas en orden y separadas, colas fuera de las casillas, caminos de la bifurcación continuos, nada fuera del tablero ni sobre la ruedita, curvas no demasiado cerradas, cartelitos lejos del camino.

Verificación manual antes de presentar: [MANTENIMIENTO.md](MANTENIMIENTO.md#checklist-antes-de-presentar).

## Build

`npm run build` ejecuta `build.mjs`:

1. esbuild empaqueta `src/main.js` (IIFE, minificado).
2. Las tipografías Bitter (`@fontsource/bitter`) y el HDRI se insertan como data URL.
3. CSS y JS se insertan en `src/index.html` y se escribe `jugar/JUGAR.html`.

`npm run dev` recompila al guardar. Para probar con herramientas de desarrollo, servir la carpeta `jugar/` (por ejemplo `python3 -m http.server`) o abrir el archivo directamente.

En la consola, `window.__juego` expone la aplicación: `__juego.store.state`, `__juego.jump({ phase: 'turno', turn: 5, step: 'listo' })`, `__juego.next()`.
