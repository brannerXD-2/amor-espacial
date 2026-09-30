# Dos puntos en el mismo universo

Una pequeña experiencia web para Camila. Sin carta, sin formulario, sin secciones: un cielo que se recorre con el dedo.

La idea: dos personas lejos la una de la otra pueden seguir formando parte del mismo universo. La distancia se mide en kilómetros; lo que significa alguien, no.

## Cómo está pensada

| Momento | Qué pasa | Interacción |
| --- | --- | --- |
| **Umbral** | Una frase y un punto de luz. | Mantener presionado para entrar (el sonido crece con el gesto). |
| **Distancia** | Dos puntos lejanos, una regla que cuenta, un hilo muy fino. | Mantener presionado: el hilo se dibuja desde los dos extremos. |
| **Viaje** | Se recorre el espacio entre los dos puntos. Un punto en el borde de la pantalla señala la siguiente estrella. | Arrastrar (con inercia), tocar la brújula para que te lleve, tocar la estrella. |
| **Admiración** | Una estrella desenfocada. | Mantener presionado para enfocar. |
| **Crecimiento** | Una espiral de estrellas. | Unirlas con el dedo. |
| **Paz** | Un enjambre inquieto. | Quedarse quieto: cualquier movimiento trae el ruido de vuelta. |
| **Familia** | Cuatro estrellas cálidas, lejos. | Tocarlas para acercarlas al mismo hogar. |
| **Sueños** | Una Ψ hecha de estrellas. | Deslizar: la forma cambia, la luz y los vínculos no. |
| **Tiempo** | Dos órbitas alrededor del mismo centro. | Mantener presionado para detener el tiempo. |
| **Nosotros** | Dos estrellas y un hilo entre ellas. | Tocar la tuya y esperar: la otra responde, con retraso, pero responde. |
| **Futuro** | Los dos puntos se acercan hasta compartir una misma órbita. Al final aparece una luz blanca en el centro. | Mover el dedo en círculos; si te detienes, un aviso recuerda seguir. Después, tocar la luz blanca. |
| **Final** | Empieza al tocar la luz blanca. El universo se apaga; queda un punto, luego otro; entre ellos, una pequeña constelación. Cierra con «Todavía queda camino.», «Camila.», «Te amo.» y la firma. | — |

Además hay **13 pensamientos escondidos** repartidos por el cielo: solo aparecen si pasas cerca. Al terminar se puede volver a explorar y ver cuántos quedaron por encontrar.

## Estructura

```
index.html
css/
  tokens.css     variables de diseño y tipografías
  base.css       reset, lienzo, velo, botones
  text.css       fragmentos de la historia y línea de instrucción
  hud.css        mapa en miniatura, botones, brújula
  scenes.css     umbral, final, pie de página, créditos
js/
  main.js        arranque
  config.js      todos los números ajustables (colores, densidad de estrellas, ritmo…)
  content.js     todos los textos
  story.js       orquesta los capítulos
  debug.js       solo con ?debug (ver abajo)
  engine/        lienzo, cámara, estrellas, nebulosa, polvo, sprites, bucle
  input/         puntero unificado (ratón, dedo, teclado) e inclinación opcional
  audio/         banda sonora
  ui/            fragmentos, HUD, créditos
  scenes/        umbral, distancia, viaje, futuro, final, epílogo
    nodes/       una interacción por archivo
assets/
  fonts/  audio/  images/
```

JavaScript sin dependencias, módulos ES nativos, sin paso de compilación.

## Probarlo en local

Los módulos ES necesitan un servidor (no funcionan abriendo el archivo directamente):

```bash
npx serve .
```

o, con Python:

```bash
python -m http.server 8080
```

## Publicarlo en GitHub Pages

1. Sube el contenido de esta carpeta a la raíz de un repositorio.
2. En *Settings → Pages*, elige la rama `main` y la carpeta `/ (root)`.
3. Todas las rutas son relativas, así que funciona tanto en `usuario.github.io/repo/` como en un dominio propio.

El archivo `.nojekyll` evita que Pages procese nada.

## Personalizar

- **Textos**: `js/content.js`. Cada fragmento es una lista de líneas; las líneas de un fragmento aparecen una tras otra y el siguiente fragmento espera un toque.
- **Ritmo y aspecto**: `js/config.js` (densidad de estrellas, velocidad de lectura, colores, posición de cada idea en el viaje).
- **Pensamientos escondidos**: la lista `hidden` de `js/content.js`.

## Detalles técnicos

- **Móvil primero.** Diseñado para iPhone 15 Plus en vertical; probado también en pantallas más pequeñas, tabletas y escritorio (el viaje pasa a horizontal en pantallas anchas). Áreas seguras (`env(safe-area-inset-*)`), `100dvh`, objetivos táctiles de 44 px, sin nada que dependa del hover.
- **Rendimiento.** Un solo lienzo 2D, resolución limitada a 2×, nebulosa en caché a media resolución, sprites pre-renderizados. Si los fotogramas van lentos, baja sola la calidad. Se detiene por completo con la pestaña oculta.
- **Movimiento reducido.** Con `prefers-reduced-motion` desaparecen el efecto de velocidad, el paralaje, las estrellas fugaces y los desenfoques de texto.
- **Teclado.** Espacio o Enter equivalen a tocar o mantener; las flechas mueven el cielo.
- **Inclinación (opcional).** En móviles aparece un botón para mover el fondo con la inclinación; en iOS pide permiso al tocarlo.
- **Sonido.** Nunca arranca solo. Se elige en la entrada («con sonido» / «en silencio») y el gesto de entrada lo activa; hay un botón para silenciarlo durante toda la experiencia.
  - Se usa un elemento `<audio>` (suena aunque el iPhone tenga el interruptor de silencio) y se intenta arrancar en cualquier gesto que el navegador pueda aceptar (`pointerdown`, `pointerup`, `touchend`, `click`, `keydown`), reintentando tras cada rechazo. Las pantallas táctiles solo aceptan el *soltar* el dedo.
  - En iOS el volumen del elemento de audio no se puede cambiar: ahí la música solo está encendida o apagada, por eso la pista ya trae su propio inicio y final suaves.
  - Si el navegador bloquea el arranque, el icono de sonido de la esquina late en dorado; un toque lo inicia. También responde a los controles de la pantalla de bloqueo.
  - Esta parte no se pudo probar en un iPhone real; se probó con un reproductor simulado que imita las reglas de gesto de Chrome y Safari.

### Modo de pruebas

Con `?debug` en la URL se expone `window.app` y se puede saltar a un capítulo:

```
/?debug&from=explore&node=3     # empieza en la idea 4
/?debug&from=futuro
/?debug&from=finale
/?debug&motion=reduce           # fuerza movimiento reducido
```

`debug.js` también sustituye `requestAnimationFrame` cuando la pestaña está oculta, para poder probar de forma automática.

## Créditos y licencias

- **Música**: «Space Ambience» de Alexander Nakarada (CreatorChords), [creatorchords.com](https://creatorchords.com). Royalty Free Music by [free-stock-music.com](https://www.free-stock-music.com). Licencia [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Cambios: recomprimida a 96 kbps, compresión suave, ajuste de volumen y fundidos de entrada y salida.
  El original se procesó con:

  ```bash
  ffmpeg -i original.mp3 -af "acompressor=threshold=-20dB:ratio=2.2:attack=200:release=800,volume=-1dB,afade=t=in:st=0:d=2,afade=t=out:st=271:d=4.5" -c:a libmp3lame -b:a 96k -ar 44100 assets/audio/space-ambience.mp3
  ```
- **Tipografías** (SIL Open Font License 1.1, servidas desde `assets/fonts/`): Instrument Serif, Geist Mono y DM Mono.
- Todo lo demás (estrellas, nebulosas, órbitas) se dibuja en código; no hay imágenes de terceros.

*hecho con cariño por Branner*
