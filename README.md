# El juego de los contratos: Transporte

Juego de mesa 3D, estilo *Juego de la Vida*, para la presentación del Grupo 7 sobre el contrato de transporte (Contratos Civiles y Comerciales, Facultad de Derecho, UBA).

Es un guion, no un juego de azar: cuatro autos (cuatro grupos del aula) recorren un único camino de 16 casillas, de la Facultad a Casa. La ruedita está arreglada, cada casilla abre una carta con un caso y una pregunta, y al final se revela la trampa: el celular con 2 % de batería, la tarifa dinámica y los Términos y Condiciones que todos aceptaron sin leer.

## Cómo jugar en la presentación

**Online:** [gvandermolen.github.io/Game-of-Life-Presentation](https://gvandermolen.github.io/Game-of-Life-Presentation/). Se actualiza solo con cada cambio en `main`.

**Sin internet:**

1. Copiá la carpeta `jugar/` a la computadora (Mac o Windows). No hace falta instalar nada ni tener internet.
2. Doble clic en `jugar/JUGAR.html`. Se abre en el navegador (Chrome, Edge o Safari actualizados).
3. `F` para pantalla completa. Si se comparte por Zoom, compartir la ventana del navegador.
4. `Espacio` (o el clicker) avanza un paso: girar, ver la respuesta, pasar el turno. En la bifurcación se elige con `1`, `2`, `3` o con un clic.
5. `←` vuelve un paso. `G` abre el menú para saltar a cualquier momento del guion.

El juego recuerda dónde quedó: al reabrirlo ofrece "Continuar" o "Empezar de cero".

Atajos completos: [docs/ATAJOS.md](docs/ATAJOS.md).

## Recorrido

1. Cartel "Terminó la clase…".
2. El celular: la app Llevame, batería 4 %, tarifa x1,8, letra chica, ACEPTAR.
3. La bifurcación, con tres caminos:
   - Negociar los términos: barrera y cartel "Contrato por adhesión". Vuelven a la bifurcación.
   - Leer los términos: el texto pasa demasiado rápido, cambia al inglés y se frena en el arbitraje en Ámsterdam.
   - Aceptar sin leer: directo al tablero.
4. 16 turnos: ruedita, animación, carta (situación y pregunta), respuesta.
5. Llegada a Casa, las cuatro sentencias, el cartel de la ruedita y el celular final con las cláusulas.

## Documentación

| Documento | Para qué |
| --- | --- |
| [docs/DESIGN.md](docs/DESIGN.md) | Diseño: guion, tablero, cartas, animaciones |
| [docs/TECH.md](docs/TECH.md) | Arquitectura, flujo, guardado, build |
| [docs/MANTENIMIENTO.md](docs/MANTENIMIENTO.md) | Cambiar textos y números; checklist antes de presentar |
| [docs/ATAJOS.md](docs/ATAJOS.md) | Hoja de atajos para los expositores (imprimible) |

## Desarrollo

Requiere Node.js 18 o superior.

```bash
npm install
npm test          # pruebas del flujo, del guion y del tablero
npm run build     # genera jugar/JUGAR.html
npm run dev       # recompila al guardar cambios en src/
```

`jugar/JUGAR.html` está versionado a propósito: quien solo va a presentar descarga el repositorio y abre ese archivo.
