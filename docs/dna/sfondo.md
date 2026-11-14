# Sfondo — il mondo d'ossidiana (V22)

Lo sfondo è il **mondo** di Memento: un campo di piramidi d'ossidiana visto **di taglio**, con la camera bassa, che si allontana fino all'orizzonte e affonda nel buio. START è il campione; le altre pagine useranno lo stesso mondo con un'altra inquadratura e un altro fuoco di riposo. Sostituisce il piano inarcato di V20–V21, che si vedeva solo su ultrawide perché la sua luce stava nel padding laterale.

**Mood:** 90% nero carbone, 10% ambra caldo. Percettibile su ogni schermo, CGI vera dello studio, cinematografico.

## La materia

- **Vista radente.** Camera a 1,25 m dal suolo, inclinata di 17° verso il basso: l'orizzonte cade appena sopra il bordo alto su desktop, e su mobile lascia una fascia di cielo nero. Mai una vista dall'alto.
- **Scala.** Le celle crescono con la distanza (0,38 m vicino alla camera, circa 1 m a 8 m, 3 m all'orizzonte), così il campo lontano resta leggibile e non diventa rumore. Le altezze si abbassano verso l'orizzonte: il fondo è una pianura di punte che si perde nel buio.
- **Tre piani fisici:** FG è la **cornice a V**: lastre grandi ai due lati che salgono verso i bordi, più una cresta bassa al centro in basso (su mobile si vede in basso, su desktop ai lati). MG è il campo fino a 8,5 m, e continua sotto la cornice. BG è il campo oltre, fino all'orizzonte. Parallasse e sfocatura rivelano materia vera e non buchi.
- **Cristalli:** piramidi a 3–4 facce, una per cella di Voronoi (la base più grande che sta nella cella), alcune con una cresta o una spalla, il 9% guglie alte. Spigoli smussati; micro-superficie con venature, graffi, grana e onde concoidi leggere.
- **Ossidiana:** vetro nero lucido con assorbimento interno ambra-granato: i corpi restano neri, la luce entra solo ai bordi sottili.
- **Luce:** la key è neutra (softbox in alto a sinistra, una strip lontana sopra l'orizzonte, un controluce basso dal fondo) e sta solo nei riflessi. Il glow **sale dalla base** di ogni cristallo e si spegne verso l'alto: le creste restano nere. Tra i cristalli il suolo brucia nelle zone calde, composte perché cadano nel campo intermedio su ogni formato; ogni base ha almeno un filo d'ambra.
- **Buio in lontananza:** oltre 6 m la luce cala con la distanza (exp(−0,07·(z−6))): il campo affonda nel nero senza una linea d'orizzonte.

## Come si vede

- **Il lato lungo** del viewport mostra sempre ±0,52 (tangente). Su desktop si vede dal campo vicino all'orizzonte; su mobile, in verticale, dalla cornice in basso al cielo nero in alto. Su finestre quasi quadrate l'inquadratura si stringe quanto basta.
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

- **Scroll:** la camera avanza nel campo. Il dolly va **verso il punto di fuga** (sull'orizzonte, 0,306 sopra il centro), diverso per piano (BG 3%, MG 7%, FG 12% a fine pagina), con una deriva leggera; il fuoco di riposo scivola verso il fondo.
- **Caricamento** (le stesse fasi del DNA): prima si accendono i filetti delle fessure (il reticolo), poi emergono le facce, mentre il fuoco passa dal tutto sfocato al MG.
- **Reduced motion:** niente respiro, deriva o sollevamento; il fuoco scatta senza molla.

## Plate e produzione

- Prodotti in Blender 5.3 Cycles da `tools/bkg/field.py` (scena procedurale): render quadrato 2560 px per piano, pinhole. Poi `tools/bkg/pack.py` applica il buio in lontananza e crea i set `landscape` (2560×1920), `landscape_m` (1280×960) e `portrait` (1080×1440) in `public/assets/bkg/`. Il manifest porta anche il punto di fuga (`foe`).
- **Peso:** 0,58 MB desktop, 0,25 MB landscape ridotto, 0,24 MB mobile, più poster e glint.
- **Separazione delle luci:** la key è bianca e il glow non ha blu, quindi key = B e glow = R − B, da un solo render denoised.
- **Profondità:** salvata come disparità (1/z, z tra 1 e 400 m) normalizzata, a metà risoluzione. I bordi antialias prendono la profondità dell'opaco più vicino, altrimenti compaiono puntinature sui bordi sfocati.
