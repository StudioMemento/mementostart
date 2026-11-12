# Immagini e mappa

## Le immagini delle card

- **Produzione:** render 3D di oggetti su fondo nero, in bianco e nero, con polvere e frammenti che si staccano dall'oggetto (la materia che si disfa). I prompt sono in `docs/image-prompts-v13.md` del progetto START.
- **A riposo:** bianco e nero. Il nero resta nero.
- **Base attiva (hover):** l'immagine si scalda dall'interno. La sua luminanza viene mappata sulla rampa ambra solo dove c'è luce; i neri non si colorano mai.
- **Range:** dove arrivano le celle, ambra piena e faccette sopra l'immagine. La leggibilità dell'oggetto viene prima.
- **Bordi dell'immagine:** sfumano, così non si vede mai dove finisce il riquadro.

## Ambienti (fotografie di studio)

Interni grafite e carbone illuminati da una sola fonte calda: lampada, portale, schermo. Low-poly dove serve. Sono le tavole "charcoal studio" (vedi `tavole.md`). Valgono per le pagine studio e servizi, non per la START.

## La mappa nella materia

La mappa non è Google Maps: è un'immagine generata dal progetto (`scripts/location-map.mjs`), trattata dall'engine come ogni altra immagine di card. Così non servono chiavi API, non ci sono contenuti di terze parti incorporati e non serve un consenso cookie.

- **Contenuto:**
  - la città come rete di celle, più fitta attorno allo studio;
  - i riferimenti chiave come nodi sfaccettati: Piazza Italia, Duomo, Museo delle Coltellerie, Stazione, Castello;
  - via Roma come linea piena;
  - linee tratteggiate a piedi dallo studio;
  - nord e scala da 100 m.
- **Etichette:** sono testo vero, disegnato dall'engine come gli altri testi. A riposo sono bianche, in hover ambra.
- **Comportamento:** lo studio è la **sorgente**. In hover gli impulsi partono da lì e attraversano la città.
- **Link:** tutta la mappa apre Google Maps in una nuova scheda.
- **Tempi a piedi:** sono indicativi (linea d'aria × 1,25, 80 m/min, +20% in salita) e così vanno presentati.
- **Coordinate:** Wikivoyage (Maniago) e la scheda Google Maps dello studio. Per aggiungere un luogo si modifica lo script e si rigenera.
