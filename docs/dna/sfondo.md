# Sfondo — il mondo d'ossidiana (V22)

Lo sfondo è il **mondo** di Memento: un campo di schegge d'ossidiana visto dall'alto, dentro una conca. START è il campione; le altre pagine useranno lo stesso mondo con un'altra inquadratura e un altro fuoco di riposo. Sostituisce il piano inarcato di V20–V21, che si vedeva solo su ultrawide perché la sua luce stava nel padding laterale.

**Mood:** 90% nero carbone, 10% ambra caldo. Percettibile su ogni schermo, CGI vera dello studio, cinematografico.

## La materia

- **Conca radiale.** Il centro è lontano, i bordi sono vicini. La scala cresce dal centro verso i bordi **in tutte le direzioni**: schegge piccole e fitte dietro i contenuti, grandi lastre al bordo.
- **Tre piani fisici:** FG (lastre al bordo), MG (anello intermedio), BG (fondo). Ogni piano continua sotto quello più vicino, così parallasse e sfocatura rivelano materia vera e non buchi.
- **Schegge:** celle di Voronoi spezzate da fratture, poliedri sfaccettati con un'inclinazione propria, spigoli smussati, cristalli sciolti sopra. Micro-superficie con crepe, graffi, grana e onde concoidi leggere.
- **Ossidiana:** vetro nero lucido con assorbimento interno ambra-granato. Le parti sottili vicino alla base si scaldano, quelle spesse restano nere.
- **Luce:** la key è neutra (studio, softbox e strip) e sta solo nei riflessi. Il glow viene dal fondo delle fessure e accende la **base** delle schegge, non le creste: filetti ambra tendenti all'arancio. Le zone calde sono a chiazze; le faglie del primo piano sono crepe piene di frammenti.

## Come si vede

- **Il lato lungo** del viewport mostra sempre ±0,52 (tangente): la rampa di scala arriva al bordo del mondo su ogni schermo. Il lato corto ne mostra una parte (su mobile, l'inizio della rampa). Su finestre quasi quadrate l'inquadratura si stringe quanto basta.
- **Nessun redraw** al resize: cambia solo l'inquadratura. Solo un cambio d'orientamento (o di profilo) cambia plate.
- **Palette garantita dal codice:** le texture portano solo luminanze; il colore si ricostruisce nello shader (key neutra, rampa ambra granato → arancio → giallo caldo). Un colore estraneo non può entrare.

## Profondità di campo

- **Bokeh esagonale**, scatter-as-gather in spazio plate: si ricalcola solo quando il fuoco si muove. Mentre viaggia usa mezza risoluzione, poi un passaggio fine quando atterra.
- **Fuoco a riposo** sul piano intermedio. Il **cursore** mette a fuoco la superficie che ha sotto, con un'attesa (0,12 s) e un'isteresi, e una molla lenta (1,7 s, leggero oltrepasso) come un assistente operatore.
- Sopra un **titolo o una card** tutto lo sfondo va fuori fuoco: il contenuto vince sempre.
- Su **touch** il fuoco segue lo scroll: MG → FG → BG → MG.

## Energia e luce

- **A riposo** il glow delle fessure è basso (0,34) e respira lento (7,2 s). È l'unica ambra a riposo della pagina: una scelta del brief V22, valida solo per lo sfondo.
- **Il gesto** accende la reazione a catena dello sfondo (celle irregolari in spazio schermo, `VFX.chain.background`). Scia, impulso ed eco restano quelli del DNA. L'energia accende le fessure **cella per cella**, anche quelle fredde, e le facce si scaldano appena: mai un disco. Solo questa energia entra nel bloom.
- **Schegge:** vicino al cursore si sollevano di pochi pixel, di più nel primo piano.
- **Scintille** sulle facce a fuoco; quando passa l'energia lampeggiano.
- **Puntini ambra** sospesi a profondità diverse: esagoni sfocati quando sono fuori fuoco, nascosti dalla materia davanti.

## Movimento

- **Scroll:** dolly e parallasse per piano (BG 3,5%, MG 6,5%, FG 11% a fine pagina); il fuoco di riposo scivola verso il fondo.
- **Caricamento** (le stesse fasi del DNA): prima si accendono i filetti delle fessure (il reticolo), poi emergono le facce, mentre il fuoco passa dal tutto sfocato al MG.
- **Reduced motion:** niente respiro, deriva o sollevamento; il fuoco scatta senza molla.

## Plate e produzione

- Prodotti in Blender 5.3 Cycles da `tools/bkg/scene.py` (scena procedurale): render quadrato 2560 px per piano, pinhole. Poi `tools/bkg/pack.py` crea i set `landscape` (2560×1920), `landscape_m` (1280×960) e `portrait` (1080×1440) in `public/assets/bkg/`.
- **Peso:** 1,26 MB desktop, 0,57 MB landscape ridotto, 0,65 MB mobile, più poster e glint.
- **Separazione delle luci:** la key è bianca e il glow non ha blu, quindi key = B e glow = R − B, da un solo render denoised.
- **Profondità:** salvata come disparità (1/z) normalizzata, a metà risoluzione. I bordi antialias prendono la profondità dell'opaco più vicino, altrimenti compaiono puntinature sui bordi sfocati.
