# Destino: Sano y Salvo · plan de implementación (2026-11-09)

Fuente: "Destino: Sano y Salvo — Especificación completa de la clase" (9/11/2026). En la app no se habla de "Parte 1" y "Parte 2": son **la vuelta** (explicación) y **el juego**.

## Decisiones tomadas con el equipo

| Tema | Decisión |
| --- | --- |
| Después de la llegada de la vuelta | Clic: directo al celular. El cartel "Terminó la clase…" se elimina (lo dicen los expositores) |
| Choque de atrás (turno 2) | El Auto 1 se cambia al carril del Auto 2, lo choca y vuelve a su carril |
| Clics de la vuelta | Un clic gira, mueve el auto y abre la diapositiva con el título. Otro clic muestra el texto (en las casillas 5, 8 y 13, por partes). Otro clic la cierra |
| Nombre | "Destino: Sano y Salvo", editable en Ajustes (barra, pestaña, cartel del tablero y pantalla de inicio) |
| Teclas | `M` abre el menú. El sonido queda en el botón de la barra y en Ajustes |

## Guion (flow.js)

```
vuelta {stop 0, listo}
  → vuelta {stop n, titulo} → vuelta {stop n, texto, part 1..partes} → vuelta {stop n, listo}   (n = 1..14)
  → meta                       (giro 15: el auto llega a Destino, bandera, "¡Llegamos sanos y salvos!")
  → celular → bifurcacion {car 0..3, tried}   (cada auto elige; negociar vuelve a elegir)
  → turno {t, listo → girado → movido → pregunta → respuesta}   (t = 0..11)
  → llegada → sentencias 1..4 → ruedita {lista: false} → ruedita {lista: true} → celular2 → clausulas
```

- Posiciones: suma acumulada de los giros. Vuelta `3 2 4 1 3 5 2 3 2 4 1 3 2 3 2` → 3, 5, 9, 10, 13, 18, 20, 23, 25, 29, 30, 33, 35, 38, 40. Juego `4 5 3 6 | 7 4 8 2 | 6 5 3 10` → Auto 1: 4, 11, 17; Auto 2: 5, 9, 14; Auto 3: 3, 11, 14; Auto 4: 6, 8, 18.
- Atrás desde la respuesta vuelve a la pregunta, con el auto en su casilla.
- Store: versión 2, clave nueva, validación de la forma del estado.

## Tablero

- Un solo tablero físico con dos mundos que se alternan (el celular tapa el cambio): **mundo de la vuelta** y **mundo del juego**. Mesa, tablero, río, Facultad, cartel del título y ruedita son compartidos.
- **Vuelta**: camino serpenteante desde la Salida, 40 casillas; las 14 de contenido más grandes, con número e ícono; la 40 es Destino, con bandera a cuadros. Zonas Embarco / Viaje / Desembarco en el borde del camino y carteles de ruta en cada límite. Un solo auto: "Toda la clase".
- **Juego**: la Facultad, el pórtico y los tres caminos siguen igual. Donde se unen los caminos, la ruta se abre en **4 carriles paralelos** (Inicio → 20 casillas → Destino, frente a Casa). Casillas de paso neutras y numeradas; las 3 casillas con tarjeta de cada auto, en su color. Zonas de color en los bordes. Sin carteles de título (las tarjetas los muestran).
- `space.js`: la prueba "¿está libre este lugar?" pasa a depender del mundo, para ubicar casas, árboles y monumentos alrededor de cualquiera de los dos caminos.

## Animaciones

| Auto · casilla | Animación |
| --- | --- |
| 1 · El viaje | "Zzz" sobre el auto, zigzag, semáforo, árbol, vuelco |
| 1 · Contestación y primera instancia; 1 · La Cámara; 4 · La sentencia | Martillo |
| 2 · Me chocaron de atrás | El Auto 1 se cambia de carril y lo choca de atrás en el semáforo |
| 2 · El perro y la tormenta | Perro y frenada; después alerta naranja, lluvia y una rama que cae sobre el techo |
| 2 · Me bajo acá | Reloj "¡Llego tarde!", "¡NO, ESPERÁ!", el pasajero salta y rueda por el pasto |
| 3 · El pozo | Pozo, salto, "¡AY!" y chichón en el techo |
| 3 · Ámsterdam | Despega como un avión, aterriza, molinos y juez con peluca |

## Pantallas

- Diapositivas de la vuelta: panel grande, título como frase, renglones cortos, artículo al final en gris y más chico. Diseños: línea de tiempo, columnas con ícono, etapas con flechas, normal y anormal, escudo, tres tarjetas y recuadro, boleto tachado, cadena, mapa, columnas enfrentadas.
- Bifurcación: un auto por vez, con su nombre en el panel. "Leer": unos 15 segundos, más rápido, del castellano al inglés, sin frenar ni resaltar el final; sin marcadores "pendiente".
- Tarjetas: 3 por auto (12), con los textos nuevos; reloj del parcial en las del Auto 2.
- Menú: botón chico con tres rayitas, siempre en la misma esquina y en todas las pantallas. Secciones: La vuelta, El juego, Final y Cerrar. Ajustes: nombre, calidad, velocidad, sonido.
- Ruedita final: cartel; clic: las dos listas de números; clic: el celular con la batería.

## Orden de trabajo

1. Guion y motor (`guion.js`, `flow.js`, `store.js`), con pruebas.
2. Geometría (`layout.js`, nuevo `lap.js`), con pruebas.
3. Construcción 3D (`track.js`, nuevo `lap-track.js`, `board.js`, `space.js`, `landmarks.js`) y escenario (`stage.js`).
4. Animaciones (`fx.js`) y efectos HTML (`effects.js`).
5. Pantallas (`slides.js` nuevo, `cards.js`, `scenes.js`, `hud.js`, `menu.js`, `styles.css`) y director (`main.js`).
6. Documentación, `npm test`, `npm run build` y recorrido completo en el navegador.
