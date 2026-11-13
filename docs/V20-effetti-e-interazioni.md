# Memento START V21: effetti e interazioni

Questa guida descrive cosa deve succedere sulla pagina START, stato per stato, senza entrare nel codice. Per ogni parte ci sono due liste:

- **Cosa vedi:** il comportamento voluto.
- **È un errore se:** quello che non dovrebbe succedere. Se lo vedi, è un'incongruenza da segnalare. Indica dove (sezione, card, titolo), cosa stavi facendo (cursore fermo, in movimento, scroll) e su quale schermo.

I tempi sono indicativi: servono a capire se qualcosa è troppo lento o troppo brusco, non vanno misurati al centesimo.

---

## 1. Le regole di fondo

Tutto il resto deriva da queste cinque regole.

1. **A riposo non c'è ambra.** Ci sono nero, grafite e testi chiari. L'ambra compare solo quando fai qualcosa (muovi il cursore, tocchi, usi la tastiera, la pagina si carica) e poi si spegne da sola.
2. **L'ambra si muove per celle, non a cerchio.** Si accendono triangoli, che accendono i vicini, e la reazione si esaurisce. Non c'è mai un disco di luce che insegue il cursore.
3. **Il contorno resta nitido.** Testi, icone e card non cambiano mai forma o spessore. La luce lavora dentro e attorno.
4. **Lo scroll smonta la struttura, non la luce.** Scorrendo, le superfici si frammentano ai bordi dello schermo, sempre in grigio, mai in ambra.
5. **Il contenuto vince.** Dietro i testi lo sfondo è scuro e sfocato. Le pareti dello sfondo non sono mai più chiare dei titoli.

---

## 2. Apertura della pagina

**Cosa vedi**
- La pagina parte dal nero. In circa 1,8 secondi la struttura si costruisce: compaiono celle sparse, si riempiono, i contenuti prendono posto.
- Durante la costruzione alcune celle (circa una su sette) si accendono d'ambra per un attimo mentre entrano.
- Se muovi il mouse, scorri o premi un tasto prima della fine, la costruzione accelera (circa tre volte più veloce).
- Alla fine non resta ambra accesa.

**È un errore se**
- I contenuti compaiono con una dissolvenza uniforme, tutti insieme.
- Resta ambra accesa a pagina ferma dopo il caricamento.
- Si vede un lampo bianco o grigio chiaro prima che parta il nero.
- Il testo compare due volte (una versione sopra l'altra) o salta di posizione alla fine.

---

## 3. Lo sfondo

Lo sfondo è un foglio d'ossidiana curvato come un arco: vicino ai bordi dello schermo, lontano al centro. Non è liscio: è fatto di blocchi sfaccettati di vetro nero, con fessure tra un blocco e l'altro. Il foglio, le luci e la camera non si muovono mai a riposo: cambiano solo con un gesto.

### 3.1 A riposo

**Cosa vedi**
- Tono generale **molto scuro**. Le facce sono vetro nero con una grana fine di grafite: la forma dei blocchi si legge dai riflessi (lunghi e netti, che attraversano le facce), dai fili di luce sugli spigoli e dal buio delle fessure.
- Luce **simmetrica**: le due pareti si rispondono, la luce viene dall'alto e dal fondo del tunnel.
- **Ai bordi dello schermo** (primo piano): triangoli grandi e allungati in verticale, come schegge alte circa un terzo dello schermo. Qui ci sono i riflessi più netti.
- **Verso il centro** i triangoli diventano sempre più piccoli e più fitti, in modo graduale: si legge come una struttura 3D vista in prospettiva.
- **Il punto più scuro è il bordo della colonna dei contenuti** (dove inizia il testo).
- **Dentro la colonna** lo sfondo è scuro e leggermente sfocato: la profondità la danno soprattutto la misura e il buio. Restano triangoli piccoli, appena visibili, morbidi.
- Luce e buio dipendono solo dalla posizione orizzontale: si leggono come fasce verticali.

**È un errore se**
- Un triangolo enorme attraversa lo schermo dal bordo fino al centro.
- Il foglio si muove, ondeggia o scorre insieme alla pagina.
- C'è un taglio netto tra la parte nitida e quella sfocata (la sfocatura deve crescere in modo graduale).
- Dietro il testo si vede una texture nitida e fitta che disturba la lettura.
- Una faccia diventa bianca piena, piatta, senza sfumatura.
- Le pareti sembrano piatte (solo linee su un fondo uniforme) invece che blocchi con volume.
- Luci, riflessi o camera si muovono a pagina ferma.
- Compaiono bande o gradini nel nero (scalini di colore nei gradienti scuri).

**Nota sugli schermi.** Su un monitor largo (come il tuo 3440×1440) le pareti occupano molto spazio ai lati. Su schermi più stretti la colonna dei contenuti prende quasi tutta la larghezza, quindi le pareti si vedono solo in una striscia sottile ai bordi. È voluto.

### 3.2 Cursore in movimento

**Cosa vedi**
- Il cursore lascia una **scia d'ambra** che corre negli spigoli dei triangoli vicini e si propaga ai vicini per qualche passo, poi si spegne. Più veloce muovi, più lunga la scia.
- La reazione **continua anche dentro la colonna dei contenuti**: lì è più leggera (circa metà delle accensioni) e sfocata come lo sfondo, così non si interrompe di colpo al bordo della colonna.
- Le facce grandi del primo piano non si riempiono d'ambra: l'energia sale dalle fessure tra i blocchi, corre sui loro spigoli e le scalda appena.
- Sopra una card lo sfondo non reagisce: il cursore appartiene alla card.

**È un errore se**
- La reazione si ferma di netto sulla linea del bordo colonna.
- Dentro la colonna la scia è forte quanto ai lati o è nitida (deve essere più leggera e morbida).
- Una grande faccia vicina si riempie tutta d'arancio.
- La scia continua a lampeggiare dopo che hai smesso di muovere il mouse.

### 3.3 Cursore fermo

**Cosa vedi**
1. Dopo circa un quarto di secondo parte un impulso dal punto del cursore: poche celle, che si propagano e si spengono.
2. Dopo circa 2,6 secondi, un'eco più leggera.
3. Poi più niente finché non muovi di nuovo.

**È un errore se**
- A cursore fermo lo sfondo continua a pulsare a lungo o a intervalli regolari.

---

## 4. I titoli

Titoli grandi: "LET'S WORK TOGETHER", "SIAMO QUI", "CONTINUA IL VIAGGIO!". Ogni titolo ha **un'unica sfumatura su tutto il blocco** (dalla prima riga all'ultima), non una per riga.

### 4.1 A riposo

**Cosa vedi**
- La prima riga è bianca piena. La sfumatura grigia vive solo nella parte bassa dell'ultima riga: bianco in alto, grigio medio sulla linea di base.
- È la **versione desaturata della sfumatura arancio dell'hover**: stessa luminosità, nessun colore.
- Bordi dei caratteri nitidi.

**È un errore se**
- C'è una tinta (gialla, rosata, arancio) a riposo.
- Ogni riga ha la sua sfumatura separata (la seconda riga deve continuare la prima).
- La parte bassa è così scura da sembrare spenta o illeggibile.

### 4.2 Cursore sul titolo: il blocco si scalda

**Cosa vedi**
- Entro circa un terzo di secondo l'intero blocco passa alla sua **sfumatura calda**: bianco caldo (leggermente pesca) in alto, pesca e **arancio** nella parte bassa dell'ultima riga.
- Dentro tutte le lettere compare un **reticolo dorato** di piccoli triangoli, tenue lontano dal cursore e più fitto e acceso vicino. Attorno alle lettere, un bagliore ambra leggero.
- Respira piano (variazione minima, lenta).

**È un errore se**
- Si scalda solo una parte del blocco mentre il resto resta grigio (vale per la base calda: il range è un'altra cosa, vedi sotto).
- Compare un cerchio di colore attorno al cursore.
- I caratteri diventano **più spessi** (in grassetto) quando si scaldano. Il peso deve restare identico a riposo e in hover.

### 4.3 Il "range": dove arriva il cursore

**Cosa vedi**
- Le lettere vicine al cursore si accendono di **giallo caldo** (mai giallo limone), più chiaro in alto e più profondo verso la base. Il colore sale dal basso.
- Dentro le lettere accese c'è un **reticolato** di piccoli triangoli: alcuni arancio (gli accenti), alcuni più chiari, che si accendono e si spengono lentamente.
- Attorno alle lettere accese c'è un **bagliore ambra caldo**, leggero, che segue la sagoma esatta di ogni lettera, con un velo di brillantezza (bloom).
- La zona accesa è allungata lungo la frase (larga in orizzontale, bassa in verticale) e fatta di celle: il suo bordo è irregolare, triangolare.
- Ogni tanto, mentre muovi il cursore, piccole scintille si staccano dalle lettere e si allontanano dal cursore.

**È un errore se**
- Il giallo è acido o verdastro.
- La zona accesa è un cerchio o un ovale dal bordo liscio.
- Il bagliore è largo, a gradini, o fa sembrare le lettere sdoppiate.
- Il bagliore cambia la forma delle lettere o le ingrossa.
- Le scintille escono anche a cursore fermo o durante lo scroll.

### 4.4 Il cursore se ne va

**Cosa vedi**
- Tutto il blocco **si desatura** e torna grigio in un solo movimento (circa 0,6–1 s): sfumatura calda, giallo del range e reticolo insieme.

**È un errore se**
- Si vedono i tagli triangolari delle celle mentre il colore se ne va.
- Resta una zona colorata dopo qualche secondo.

---

## 5. Le card (tab dei contatti)

Le card hanno un'immagine (busta, portatile, telefono, icone social), un'icona piccola e un testo.

### 5.1 A riposo

**Cosa vedi**
- Card in **nero void**, cornice sottile, immagine in bianco e nero, testo e icona in **un solo colore**.
- Nessuna cella visibile, nessuna ambra.

**È un errore se**
- Il testo di una card ha una sfumatura di grigio dall'alto al basso.
- Si vedono triangoli o linee ambra su una card a riposo.
- Il bordo dell'immagine si vede come un rettangolo.

### 5.2 Cursore vicino a una card (senza entrarci)

Esempio: il cursore nello spazio tra quattro card.

**Cosa vedi**
- Il **bordo** delle card vicine si accende a tratti sul lato rivolto al cursore. Tra le card si forma una croce di luce lungo gli spazi.
- **Dentro** le card vicine si accendono alcune celle, solo sul lato verso il cursore: triangoli ambra tenui, di misure diverse.
- Le immagini vicine si scaldano appena.
- Più il cursore è vicino, più la risposta è forte. Allontanandosi, svanisce dolcemente.

**È un errore se**
- Una card vicina si accende tutta, anche dal lato opposto al cursore.
- Le celle interne compaiono su un lato diverso da quello del cursore.
- Il bordo si accende tutto insieme invece che a tratti.

### 5.3 Cursore sulla card

**Cosa vedi**
- **Un solo insieme di celle**, più fitto lungo i bordi e più rado al centro. Le celle compaiono **solo vicino al cursore e dove passa la reazione**, a zone, poi tornano al nero: nessun campo fermo di triangoli. Le visibilità e le saturazioni variano: alcune arancio pieno, altre quasi neutre.
- Vicino al cursore le celle sono più accese. Le celle respirano piano, ognuna col suo ritmo.
- La reazione a catena passa per **le stesse celle**, con lo stesso aspetto: non c'è uno strato fermo e uno che si muove.
- L'immagine si **illumina dall'interno**: le creste dell'oggetto diventano ambra, i neri restano neri, il centro non brucia mai in bianco.
- Il bordo si accende a tratti.
- Il **testo resta dello stesso colore e dello stesso spessore**. Vicino al cursore prende una tinta ambra chiara e molto diffusa.
- Muovendo il cursore, qualche frammento si stacca dalle celle accese e scivola verso l'esterno della card.

**È un errore se**
- Si vedono due famiglie di triangoli diverse (per esempio una ferma e luminosa e un'altra che si muove con un altro colore).
- Su tutta la card resta un tappeto fermo di triangoli che copre la reazione.
- Si vede il bordo del riquadro dell'immagine o una zona grigia attorno all'oggetto.
- Le linee lunghe dei triangoli grandi al centro sono più evidenti di quelle fitte sui bordi.
- Il testo diventa più spesso in hover.
- Il testo prende un arancio saturo o una sfumatura.
- L'immagine si colora uniformemente, compreso il nero di fondo.

### 5.4 Il cursore esce

**Cosa vedi**
- Le celle si spengono in poco meno di mezzo secondo, con un ritorno morbido; la reazione rimasta finisce da sola.

**È un errore se**
- La card resta accesa a lungo o si spegne di colpo.

---

## 6. La mappa ("SIAMO QUI")

**Cosa vedi**
- **A riposo:** il render notturno della città, in grigio come ogni foto. Lo studio è il punto più chiaro. Due etichette: "Studio Memento / Piazzetta Trento" accanto all'edificio illuminato, "Piazza Italia / 4 min" accanto alla fontana.
- **In hover:** la mappa mostra **i suoi colori originali** (luci ambra dello studio e della piazza), non un arancio uniforme. Dallo studio partono impulsi ogni 1,6 secondi circa, che si propagano per le celle sopra la città. Le celle sulla mappa sono più rade che sulle card piccole.
- Un clic in qualsiasi punto della mappa apre Google Maps in una nuova scheda.
- Su schermi stretti resta solo l'etichetta dello studio.

**È un errore se**
- Le etichette non stanno sull'edificio o sulla fontana (soprattutto cambiando la larghezza della finestra).
- In hover tutta la mappa diventa marrone-arancio piatta.
- Gli impulsi partono da un punto diverso dallo studio.
- La mappa si colora anche a riposo.

---

## 7. Le domande frequenti (pannello FAQ)

**Cosa vedi**
- Il pannello si comporta come una card grande: celle più rade, immagine (lampadina) illuminata dall'interno in hover.
- Il titolo del pannello e le domande sono in un solo colore. Vicino al cursore prendono la stessa tinta ambra diffusa delle card.
- Aprendo una domanda parte un impulso dall'immagine del pannello.

**È un errore se**
- Tutto il pannello si accende d'ambra in hover.
- L'apertura di una domanda non produce nessun segnale o ne produce uno molto forte.

---

## 8. Lo scroll

### 8.1 Le fasce

Lo schermo ha tre fasce: il 15% in alto (uscita), il 70% al centro (lettura), il 15% in basso (ingresso).

**Cosa vedi**
- Al centro tutto è composto e fermo.
- Nelle fasce in alto e in basso le superfici si separano in piccoli triangoli di misure diverse, sempre più verso il bordo dello schermo, con un leggero vortice.
- È tutto **in grigio**: nessuna ambra durante lo scroll.
- Tornando indietro la struttura si ricompone esattamente com'era.

**È un errore se**
- Compare ambra mentre scorri.
- Un testo nella fascia di lettura è frammentato.
- La frammentazione cambia a seconda della velocità di scroll invece che della posizione.

### 8.2 Quando lo scroll si ferma

**Cosa vedi**
- Dopo un istante, i triangoli che stavano uscendo diventano frammenti che si allontanano e svaniscono in circa un secondo e mezzo.
- Riprendendo lo scroll, la struttura torna dalla posizione.

**È un errore se**
- I frammenti restano sospesi a lungo o tornano indietro da soli.

### 8.3 Prima e ultima schermata

**Cosa vedi**
- **Prima schermata:** il titolo è al centro della fascia di lettura. In basso le card entrano già frammentate (si vedono le cornici e la parte alta delle immagini, i testi sono ancora sotto la piega).
- **Ultima schermata:** "CONTINUA IL VIAGGIO!" è al centro. In alto ciò che era prima esce frammentato: è voluto. In basso resta aria.

**È un errore se**
- Il titolo della prima schermata è troppo in alto o tocca la fascia superiore.
- Nella prima schermata si leggono già i testi delle card frammentati.
- Nell'ultima schermata la chiusura è frammentata.

---

## 9. Tastiera, touch, movimento ridotto

**Tastiera**
- Quando il focus arriva su un elemento (Tab), parte un breve impulso d'ambra da lì. L'anello di focus del browser resta sempre visibile.
- **È un errore se** il focus è invisibile o se un elemento con il focus resta frammentato in una fascia.

**Touch (telefono, tablet)**
- Il tocco lascia un impulso locale che si propaga e si spegne. Non resta uno stato di hover acceso dopo aver tolto il dito.
- **È un errore se** una card resta accesa dopo il tocco.

**Movimento ridotto** (impostazione del sistema operativo)
- La pagina appare subito composta, senza costruzione.
- Niente deriva dei frammenti, niente propagazione, niente respiro. Gli hover ci sono, più tenui.
- **È un errore se** con il movimento ridotto qualcosa continua a muoversi da solo.

**Senza WebGL** (browser vecchi o errori)
- Torna la pagina normale, completa e navigabile, senza effetti.

---

## 10. Qualità sui diversi dispositivi

La pagina sceglie da sola un profilo e lo abbassa se i fotogrammi rallentano.

| Profilo | Dove | Cosa cambia |
| --- | --- | --- |
| Alto | computer con scheda video | tutto: bloom, sfocatura dello sfondo, particelle piene |
| Medio | telefoni e tablet | come l'alto, con meno particelle e celle un po' più grandi |
| Basso | dispositivi lenti | niente bloom e niente sfocatura dello sfondo; le celle lontane dietro i testi sono più tenui per non disturbare |

Per confrontare si può forzare il profilo aggiungendo all'indirizzo `?vfx=high`, `?vfx=medium` o `?vfx=low`.

**È un errore se**
- Sul tuo computer (RTX 3070 Ti) la pagina scatta o il profilo scende al basso.
- Sul profilo basso dietro i testi si vede un reticolo nitido e fitto.

---

## 11. I tempi in una tabella

| Cosa | Entra | Esce |
| --- | --- | --- |
| Costruzione della pagina | 1,8 s | |
| Passaggio da una cella accesa alla vicina | 0,1–0,3 s | |
| Una cella accesa | subito | si spegne in 1–2 s |
| Sfumatura calda di un titolo | ~0,35 s | ~0,6 s |
| Range sui titoli | ~0,45 s | ~1,1 s |
| Hover di una card | ~0,1 s | ~0,3 s |
| Risposta di una card vicina | ~0,1 s | ~0,3 s |
| Impulso a cursore fermo (sfondo) | dopo 0,25 s | eco a 2,6 s, poi niente |
| Impulso dalla mappa | ogni 1,6 s in hover | |
| Frammenti allo stop dello scroll | dopo un istante | ~1,6 s |
| Scintille e frammenti | | 0,3–1,5 s |

---

## 12. Grade finale

**Cosa vedi**
- Luci forti che si smorzano morbide invece di bruciare; testi con il loro colore esatto.
- Angoli dello schermo appena più scuri; una grana finissima sulle superfici (non sul nero puro); un filo d'aberrazione cromatica solo sugli spigoli chiari vicino al bordo dello schermo; in hover, una leggera striatura orizzontale calda attorno alle luci.

**È un errore se**
- La grana si vede sul nero o sui testi a distanza normale.
- L'aberrazione si vede al centro o sui titoli.
- Compaiono bande o righe nei neri.

## 13. Colori di riferimento

| Elemento | Colore |
| --- | --- |
| Fondo | quasi nero (#020202, anche prima che parta il WebGL) |
| Card e pannelli | nero void opaco |
| Titoli a riposo | bianco (#F2F2F2) fino alla parte alta dell'ultima riga, poi grigio medio (#838383) sulla linea di base |
| Titoli in hover, alto | bianco caldo (#FBEFE8) |
| Titoli in hover, base | arancio (#D9682F) |
| Range sui titoli | giallo caldo (#FFDA8C), più chiaro in alto (#FFE6C4), più profondo in basso (#FFB45C) |
| Accenti, spigoli accesi | arancio intenso (#FF5510, #FF8A1C) |
| Testo delle card | un solo colore chiaro (#F2F0EC), velato a riposo |

Se un colore sullo schermo è chiaramente fuori da questa famiglia (rosa, verde, giallo limone, blu), è un'incongruenza.
