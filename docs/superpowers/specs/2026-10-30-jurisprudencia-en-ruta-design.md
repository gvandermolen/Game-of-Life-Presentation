# Jurisprudencia en Ruta · diseño aprobado (2026-10-30)

Resumen de las decisiones tomadas en la sesión de diseño. El detalle vive en [docs/DESIGN.md](../../DESIGN.md) (producto) y [docs/TECH.md](../../TECH.md) (técnica).

## Alcance de esta etapa

Armar el escenario: motor de juego, tablero 3D, controles de expositor y mecánicas provisorias. El material jurídico y las reglas finales llegan después y se cargan sin tocar el motor.

## Decisiones

- Operan solo los expositores, desde una computadora y un proyector.
- 2 a 6 equipos; por defecto Colectivo, Taxi, Auto particular, Plataforma, Moto y Remis.
- Carriles paralelos que se unen en 3 cruces con parada obligatoria; llegar a un cruce ocupado es un choque.
- Choque: carta conjunta, argumentan ambos equipos, los expositores eligen quién prevalece; el otro retrocede o pierde turno.
- Casillas tipadas con efectos provisorios; cartas de 2 o 4 opciones con veredicto de los expositores.
- Gana el primero que llega a la Meta.
- Estética de homenaje al Juego de la Vida con identidad UBA (azul, dorado, Bitter).
- Un único archivo HTML, sin internet; guardado automático; deshacer, ir a la jugada N, reiniciar, exportar e importar.
- Casos inventados solo en la documentación, nunca en pantalla.

## Enfoques evaluados

1. **Elegido:** JavaScript + Three.js empaquetado en un HTML: presencia 3D real y entrega en una carpeta.
2. React + React Three Fiber: iteración rápida, pero cadena de herramientas más pesada para quien solo presenta.
3. Tablero 2.5D en CSS/SVG: más liviano, pero sin la sensación de objeto físico pedida.
