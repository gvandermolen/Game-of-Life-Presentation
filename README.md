# Jurisprudencia en Ruta

Juego de mesa 3D, estilo *Juego de la Vida*, para la presentación sobre jurisprudencia de transporte tradicional (colectivo, taxi, remis, auto particular, moto) y plataformas (Uber, Cabify). Facultad de Derecho, Universidad de Buenos Aires.

Los expositores manejan el juego desde una sola computadora conectada al proyector. Cada grupo del aula es un medio de transporte; avanza por su carril, responde cartas según la casilla y, en los cruces, choca con otros equipos (accidentes de tránsito). Gana el primero que llega al Palacio de Justicia.

## Cómo jugar en la presentación

1. Copiá la carpeta `jugar/` a la computadora (Mac o Windows). No hace falta instalar nada ni tener internet.
2. Doble clic en `jugar/JUGAR.html`. Se abre en el navegador (Chrome, Edge o Safari actualizados).
3. Tecla `F` para pantalla completa, `Espacio` para comenzar.
4. `Espacio` (o el clicker) gira la ruleta. Las cartas se resuelven con `S` (correcta), `N` (incorrecta) o `X` (anular).
5. Si algo sale mal: `Z` deshace la última jugada. `C` abre la configuración, con historial, "ir a la jugada N", ajuste manual y reinicio.

La partida se guarda sola en el navegador: sobrevive a recargar la página o cerrar la ventana.

Atajos completos: [docs/ATAJOS.md](docs/ATAJOS.md).

## Estado del contenido

Las mecánicas y el material jurídico son **provisorios** y se reemplazarán por el material definitivo. En pantalla, las cartas muestran consignas genéricas que leen los expositores; ningún caso inventado se proyecta. Los tres casos de ejemplo están solo en [docs/placeholders/casos-legales.md](docs/placeholders/casos-legales.md).

## Documentación

| Documento | Para qué |
| --- | --- |
| [docs/DESIGN.md](docs/DESIGN.md) | Especificación de diseño: reglas, tablero, identidad UBA, animación |
| [docs/TECH.md](docs/TECH.md) | Especificación técnica: arquitectura, motor, guardado, build |
| [docs/MANTENIMIENTO.md](docs/MANTENIMIENTO.md) | Cambiar equipos, reglas y cartas; recuperar una partida en vivo |
| [docs/ATAJOS.md](docs/ATAJOS.md) | Hoja de atajos para los expositores (imprimible) |
| [docs/placeholders/](docs/placeholders/) | Casos ficticios y contenido de ejemplo, a reemplazar |

## Desarrollo

Requiere Node.js 18 o superior.

```bash
npm install
npm test          # pruebas del motor de juego
npm run build     # genera jugar/JUGAR.html
npm run dev       # recompila al guardar cambios en src/
```

`jugar/JUGAR.html` está versionado a propósito: quien solo va a presentar descarga el repositorio y abre ese archivo.
