# Immagini e mappa

## Le immagini delle card

- **Produzione:** render 3D di oggetti su fondo nero, in bianco e nero, con polvere e frammenti che si staccano dall'oggetto (la materia che si disfa). I prompt sono in `docs/image-prompts-v13.md` del progetto START.
- **A riposo:** bianco e nero. Il nero resta nero.
- **Base attiva (hover):** l'immagine si scalda dall'interno. La sua luminanza viene mappata sulla rampa ambra solo dove c'è luce; i neri non si colorano mai.
- **Range:** dove arrivano le celle, ambra piena e faccette sopra l'immagine. La leggibilità dell'oggetto viene prima.
- **Bordi dell'immagine:** sfumano, così non si vede mai dove finisce il riquadro.

## Ambienti (fotografie di studio)

Interni grafite e carbone illuminati da una sola fonte calda: lampada, portale, schermo. Low-poly dove serve. Sono le tavole "charcoal studio" (vedi `tavole.md`). Valgono per le pagine studio e servizi, non per la START.

## La mappa

La mappa non è Google Maps: è un **render notturno di Maniago** (`public/assets/images/location-map.webp`, 1672×941), low-poly, con lo studio illuminato e Piazza Italia con la fontana. Così non servono chiavi API, non ci sono contenuti di terze parti incorporati e non serve un consenso cookie.

- **A riposo:** in grigio, come ogni immagine (lo studio resta il punto più chiaro).
- **In hover:** la mappa mostra **i suoi colori**, già illuminati nella palette della casa, invece del grading d'ambra (`ownColour`). Le celle si accendono sopra, più rade perché il pannello è grande.
- **Etichette:** Studio Memento (Piazzetta Trento) e Piazza Italia (4 min a piedi). Sono testo vero, disegnato dall'engine come gli altri testi, con un solo colore. Seguono l'immagine anche quando il riquadro la ritaglia (`object-fit: cover`).
- **Comportamento:** lo studio è la **sorgente**. In hover gli impulsi partono da lì e attraversano la città.
- **Link:** tutta la mappa apre Google Maps in una nuova scheda.
- **Per cambiare immagine:** si sostituisce il file e si aggiornano proporzioni e posizioni in `src/components/locationMap.ts` (frazioni dell'immagine) e in `.map-label` (`start.css`).
