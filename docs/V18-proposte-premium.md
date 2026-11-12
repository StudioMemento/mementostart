# Memento START · V18: analisi del deploy e proposte "premium"

Analisi del deploy V18 su `mementostart.vercel.app` (12 novembre 2026), aperto nel browser integrato sul vostro PC: RTX 3070 Ti, Chrome 156, ANGLE/D3D11. Ho guardato la pagina emulando 1920×1080, 3440×1440 e 375×812. Gli screenshot del pannello sono a risoluzione ridotta, quindi i giudizi visivi riguardano l'insieme e non il singolo pixel.

---

## 1. Stato in breve

**Prestazioni: nessun problema.** La GPU ha margine per tutte le proposte qui sotto, comprese quelle che aggiungono passate di rendering.

| Scenario | 1920×1080 | 3440×1440 |
| --- | --- | --- |
| Pagina ferma | 240 fps | 240 fps |
| Hover sul titolo | 238 fps (frame peggiore 8 ms) | 240 fps |
| Hover sulla card | 240 fps | — |
| Scia sullo sfondo | — | 240 fps |
| Scroll continuo | 240 fps | 240 fps |
| Stop dello scroll | 234 fps (un frame da 29 ms) | 239 fps (un frame da 13 ms) |

- 240 fps è il limite del monitor, quindi il margine reale non si vede.
- Nessun errore in console.
- Con la cache calda il primo contenuto appare a 0,31 s e la pagina VFX è attiva a 1,09 s.
- L'engine pesa 205 kB gzip.

**Cosa funziona già:**
- Le pareti con il senso di scala.
- La topologia delle card in hover.
- Il glow che segue la sagoma delle lettere.
- La reazione a catena come unico linguaggio dell'energia.

---

## 2. Cosa abbassa la percezione premium

In ordine di impatto.

1. **La prima schermata non è integra.** All'apertura le card in basso cadono nella fascia d'ingresso dello scroll e appaiono frammentate prima di qualsiasi gesto: a 1920×1080 si vede l'indirizzo email spezzato. Un sito premium ha il primo frame perfetto. Oggi il primo frame sembra un errore di caricamento.

2. **La frammentazione dello scroll legge come glitch.** I contenuti in entrata e in uscita diventano schegge bianche piatte, con bordi netti; a pagina ferma, in fondo, si vedono pezzi di "SIAMO QUI" sparsi. Sono pezzi di testo, non pezzi di materia: non condividono la luce né la profondità delle pareti.

3. **"Pioggia" dietro la colonna dei contenuti.** In profondità il piano è visto di taglio: i triangoli diventano strisce verticali sottili, con creste ancora visibili. Dietro titoli e card si forma una texture rigata, la si vede bene a fondo pagina. È rumore proprio dove l'occhio legge.

4. **Troppa ambra.**
   - In hover il titolo diventa tutto arancio saturo.
   - Il pannello legal si riempie di faccette.
   - La scia sullo sfondo accende facce enormi per intero.

   Quando l'ambra è ovunque smette di essere preziosa. Nel premium l'accento è scarso e arriva come un evento.

5. **Le pareti battono i contenuti.** Sul vostro 3440×1440 le pareti hanno punte di luce più forti del titolo. La colonna centrale si legge come una striscia scura tra due pannelli luminosi, e l'occhio va ai lati.

6. **Elementi fuori materiale.**
   - La mappa Google ha lo stile predefinito.
   - Su mobile il telefono va a capo ("+39 328 545 / 4661").
   - Dopo la freccia finale resta un vuoto scuro senza chiusura.

7. **Nessun ritmo comune.** Il respiro del titolo, il battito delle faccette, l'impulso dello sfondo e la deriva dello scroll hanno ognuno tempi e curve propri. Singolarmente sono belli; insieme non sembrano diretti da una mano sola.

---

## 3. Principi proposti

Sono regole da tenere su tutte le pagine quando il sistema verrà esteso.

1. **L'ambra è un evento.** Mai a riposo. Al massimo circa il 6% dello schermo ambra nello stesso momento, salvo il gesto esplicito sul titolo.
2. **Una sola luce, una sola materia.** Pareti, card, frammenti e particelle sono lo stesso cristallo grafite e reagiscono alle stesse luci.
3. **Il contenuto vince sempre.** Dietro testo e card la luminanza dello sfondo resta sotto una soglia fissa; le pareti non superano mai il bianco del titolo.
4. **Un solo tempo.** Una unità base (ad esempio 1,2 s), le sue frazioni e due curve: expo-out per le entrate, sinusoide lenta per i respiri. Tutte le animazioni ne derivano.
5. **Il primo frame è perfetto,** e anche l'ultimo.

---

## 4. Proposte

Costo indicativo: S fino a mezza giornata, M 1–2 giorni, L 3–5 giorni.

### A. Correzioni rapide (alto impatto, basso rischio)

**A1 · Prima schermata integra.** S
- *Come:* la fascia d'ingresso si attiva solo dopo il primo scroll dell'utente. Oggi `bandEnable` la abilita già a `scrollY = 0`.
- *Effetto:* all'apertura il loading compone la pagina e poi la lascia ferma e intera. La tassellazione compare solo quando l'utente inizia a muoversi.

**A2 · Dosare l'ambra.** S

| Dove | Ora | Proposta |
| --- | --- | --- |
| Hover sul titolo | tutto il titolo arancio saturo | Ambra dalla base fino a circa il 40% dell'altezza, con respiro lento; la parte alta resta bianco-argento e si scalda solo vicino al cursore. Saturazione al tono medio della rampa, mai il giallo pieno. |
| FAQ e legal | faccette su tutto il pannello | Faccette solo nel raggio del cursore. |
| Sfondo | facce enormi accese per intero | L'energia percorre gli spigoli; l'emissione di una faccia scala con l'inverso della sua dimensione. |

**A3 · Calmare la profondità.** S
- *Come:* in profondità le linee di cresta e il rilievo si spengono progressivamente, e la nebbia per profondità cresce.
- *Effetto:* dietro i contenuti resta una sfumatura di grafite morbida, senza righe. In alternativa si riduce la profondità massima del piano, ma si perde un po' di scala.

**A4 · Esposizione delle pareti.** S
- *Come:* una curva filmica sulle luci alte, perché gli spigoli non brucino in bianco piatto, più un tetto di luminanza relativo al bianco del titolo.
- *Effetto:* le pareti restano drammatiche ma non rubano la scena.

**A5 · Dettagli di layout.** S
- Il numero di telefono non deve andare a capo (`white-space: nowrap` o un corpo leggermente ridotto sotto i 400 px).
- Controllo generale degli a-capo su mobile.

### B. Qualità d'immagine e coerenza (medio impatto, costo medio)

**B1 · Passata di color grading con dithering.** M
- *Come:* una sola passata finale con quattro interventi:
  - curva filmica;
  - ombre leggermente fredde e luci leggermente calde, per un tono più "fotografico";
  - dithering a rumore blu, che toglie le bande nei gradienti scuri (sugli schermi a 8 bit le sfumature di nero fanno scalini);
  - grana appena percettibile (circa 0,5%), che lega materia 3D e superfici piatte.
- *Perché:* è la differenza tra "render" e "immagine".

**B2 · Frammenti fatti della stessa materia.** M
- *Come:* quando una superficie si frammenta, le schegge prendono il materiale delle pareti: faccia grafite, spigolo lucido, luce delle stesse lampade.
- *Movimento:* ruotano poco in 3D e si allontanano in profondità (rimpiccioliscono ed entrano nella nebbia) invece di scivolare piatte sullo schermo.
- *Effetto:* lo scroll diventa materia che si smonta, non testo che si rompe. Risolve il punto 2 e rafforza il principio 2.

**B3 · Luce che vive, piano che resta fermo.** M
- *Come:* il piano resta immobile, come richiesto, ma le luci si muovono pochissimo: una deriva lentissima (ciclo di 40–60 s) che fa scorrere i riflessi sulle creste.
- *Effetto:* il materiale sembra reale anche a pagina ferma. Nessun movimento di geometria, nessun lampeggio.

**B4 · Un solo sistema di tempi.** M
- *Come:* costanti di tempo e curve in `config.ts` usate da tutti gli effetti: respiro del titolo, battito delle faccette, impulso dello sfondo, deriva dello scroll, loading.
- *Stagger:* basato sulla distanza dal punto d'origine, per tutte le reazioni.

**B5 · Mappa nella materia.** M
- *Opzione 1:* mappa Google con stile cloud (grafite monocromatica, strade appena incise, pin ambra).
- *Opzione 2, più coerente:* immagine statica stilizzata disegnata dall'engine, con il pin come sorgente d'energia.
- In entrambi i casi resta il pulsante "Apri in Maps".

**B6 · Una chiusura.**
- *Come:* dopo "Continua il viaggio!" le pareti si spengono gradualmente verso il fondo e l'ultima luce resta sulla freccia. Sotto, una riga sobria: © Memento Studio, P.IVA, privacy.
- *Effetto:* l'ultimo frame è composto quanto il primo, e la riga legale dà fiducia.

### C. Firma (alto impatto, costo alto)

**C1 · Il cursore come sorgente di luce.** M
- *Come:* una piccola luce puntiforme segue il cursore nello spazio 3D, poco davanti alle pareti. Gli spigoli catturano riflessi che si muovono con la mano: luce fisica sul materiale, non un alone 2D.
- *Perché:* è il singolo cambiamento che più fa sembrare il sito "oggetto vero". Costa una luce in più nello shader; la GPU ha margine.

**C2 · Coreografia d'ingresso.** L
- *Sequenza:*
  - buio;
  - una linea di luce corre lungo le creste dal bordo verso il centro, come fibra ottica, e rivela le pareti;
  - il titolo si compone dalle stesse celle usate nello scroll.
- *Regole:* 1,6–2,2 s in tutto, una volta per sessione, saltabile con qualsiasi gesto. Con reduced motion si salta del tutto.

**C3 · Profondità fotografica.** M
- *Come:* sfocatura leggera proporzionale alla profondità sulle pareti lontane, schegge vicine nitide.
- *Effetto:* insieme ad A3 rende la scala ancora più leggibile e pulisce lo sfondo dietro il testo.

**C4 · Continuità tra le pagine.** L
- *Come:* quando il sistema arriverà su navigation, servizi, Portfolio e levelup, il piano diventa lo spazio comune. Il cambio pagina diventa un movimento di camera dentro lo stesso spazio, non un taglio.
- *Perché:* è una firma di studio e dà al sito una mappa spaziale.
- *Prerequisito:* passare da iframe in Framer a Vercel diretto, già in programma.

---

## 5. Priorità consigliata

| # | Proposta | Impatto | Costo | Rischio |
| --- | --- | --- | --- | --- |
| 1 | A1 Prima schermata integra | Alto | S | Basso |
| 2 | A2 Dosare l'ambra | Alto | S | Basso |
| 3 | A3 + A4 Profondità calma, esposizione | Alto | S | Basso |
| 4 | C1 Cursore come luce | Alto | M | Basso |
| 5 | B1 Grading con dithering | Medio-alto | M | Basso |
| 6 | B2 Frammenti di materia | Alto | M | Medio |
| 7 | B4 Un solo tempo | Medio | M | Basso |
| 8 | B3 Luce che vive | Medio | M | Basso |
| 9 | B5, B6, A5 Mappa, chiusura, layout | Medio | M | Basso |
| 10 | C2 Coreografia d'ingresso | Alto | L | Medio |
| 11 | C3 Profondità fotografica | Medio | M | Basso |
| 12 | C4 Continuità tra pagine | Molto alto | L | Alto |

Un primo giro sensato è 1–5: in circa due giorni toglie i difetti che si notano e aggiunge il gesto più "costoso" a vedersi (C1), senza rischi per le prestazioni.

---

## 6. Da decidere voi

- **Ambra sul titolo.** Nella V17 avete chiesto che l'ambra avvolga quasi tutto il titolo. A2 propone di ridurla. È una scelta di gusto: si può tenere avvolgente ma meno satura.
- **Prima schermata.** Integra fino al primo scroll (A1), oppure frammentata da subito come oggi?
- **Chiusura.** Riga legale a fondo pagina sì o no? Ci sono vincoli di layout del kit di navigazione?
- **Mappa.** Google con stile cloud (serve un Map ID sul vostro account Google Cloud) o mappa stilizzata disegnata dall'engine?
