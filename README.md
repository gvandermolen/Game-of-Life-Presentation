# Destino: Sano y Salvo

Juego de mesa 3D, estilo *Juego de la Vida*, para la presentación del Grupo 7 sobre el contrato de transporte (Contratos Civiles y Comerciales, Facultad de Derecho, UBA).

Es un guion, no un juego de azar, en dos momentos:

- **La vuelta**: un solo auto, "Toda la clase", recorre un camino de 40 casillas. En cada una de las 13 casillas de contenido se abre una diapositiva con el tema que presentamos.
- **El juego**: cuatro autos (cuatro grupos del aula) piden un viaje en una app, eligen un camino en la bifurcación y avanzan por un mismo camino de 19 casillas hasta Destino. Cada auto cae en tres casillas con un caso y una pregunta, y en una última vuelta llega a Destino. Al final se revela la trampa: la ruedita siempre dio el número necesario, el celular tenía 2 % de batería, la tarifa subió y todos aceptaron unos Términos y Condiciones que nadie leyó.

El nombre del juego se cambia en el menú > Ajustes.

## Cómo jugar en la presentación

**Online:** [gvandermolen.github.io/Game-of-Life-Presentation](https://gvandermolen.github.io/Game-of-Life-Presentation/). Se actualiza solo con cada cambio en `main`.

**Sin internet:**

1. Copiá la carpeta `jugar/` a la computadora (Mac o Windows). No hace falta instalar nada ni tener internet.
2. Doble clic en `jugar/JUGAR.html`. Se abre en el navegador (Chrome, Edge o Safari actualizados).
3. `F` para pantalla completa. Si se comparte por Meet, compartir la ventana del navegador.
4. `Espacio` (o el clicker) avanza un paso. En la bifurcación se elige con `1`, `2`, `3` o con un clic.
5. `←` vuelve un paso. `M` (o el botón redondo abajo a la derecha) abre el menú para saltar a cualquier momento del guion.

El juego recuerda dónde quedó: al reabrirlo ofrece "Continuar" o "Empezar de cero".

Atajos completos: [docs/ATAJOS.md](docs/ATAJOS.md).

## Recorrido

1. **La vuelta**: ruedita, el auto avanza casilla por casilla y, en las 14 de contenido, la diapositiva: primero el título, con otro clic el texto (en partes en las casillas 5, 8 y 13) y con otro clic se cierra. Termina en Destino con la bandera a cuadros: "¡Llegamos sanos y salvos!".
2. **El celular**: la app Llevame, batería 4 %, tarifa x1,8, letra chica, ACEPTAR.
3. **La bifurcación**, auto por auto, con tres caminos:
   - Negociar los términos: barrera y cartel "Contrato por adhesión". El auto vuelve y elige otra vez.
   - Leer los términos: el texto pasa demasiado rápido y en inglés. Después, a Inicio.
   - Aceptar sin leer: directo a Inicio.
4. **12 turnos**: ruedita, el auto avanza (con su animación), la tarjeta con la situación y la pregunta, que se da vuelta para mostrar la respuesta, y pasa el turno. Después, una última vuelta: cada auto gira y llega a Destino.
5. **Final**: llegada a Destino, las cuatro sentencias, la ruedita con todos los números que salieron y el celular final con las cláusulas del juego.

## Documentación

| Documento | Para qué |
| --- | --- |
| [docs/DESIGN.md](docs/DESIGN.md) | Diseño: guion, tableros, diapositivas, tarjetas, animaciones |
| [docs/TECH.md](docs/TECH.md) | Arquitectura, flujo, guardado, build |
| [docs/MANTENIMIENTO.md](docs/MANTENIMIENTO.md) | Cambiar textos y números; checklist antes de presentar |
| [docs/ATAJOS.md](docs/ATAJOS.md) | Hoja de atajos para los expositores (imprimible) |

## Desarrollo

Requiere Node.js 18 o superior.

```bash
npm install
npm test          # pruebas del flujo, del guion y de los tableros
npm run build     # genera jugar/JUGAR.html
npm run dev       # recompila al guardar cambios en src/
```

`jugar/JUGAR.html` está versionado a propósito: quien solo va a presentar descarga el repositorio y abre ese archivo.
