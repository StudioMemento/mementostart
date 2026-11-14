# tools/bkg — produzione dei plate dello sfondo

Lo sfondo (V22) è una scena procedurale renderizzata in Blender Cycles su tre piani di profondità (bg, mg, fg). Questi script la ricreano da zero e producono i file in `public/assets/bkg/`. Regole e scelte sono in `docs/dna/sfondo.md`.

```sh
pip install bpy==5.3.0 scipy shapely OpenEXR pillow       # Python 3.13; bpy è Blender come modulo

# anteprima con profondità di campo vera (fuoco sul campo intermedio)
python3 tools/bkg/field.py --res 1024 --spp 24 --dof 1 --focus 4.3 --fstop 0.55 --out out/bkg/preview.exr
python3 tools/bkg/sheet.py out/bkg/preview.exr out/bkg/sheet.jpg          # desktop, mobile e ultrawide su un foglio
python3 tools/bkg/crops.py out/bkg/preview.exr out/bkg/preview.png        # crop in fila + quadrato intero

# plate finali: un render per piano, pinhole (la profondità di campo la fa il browser)
for L in mg fg bg; do python3 tools/bkg/field.py --res 2560 --spp 36 --layer $L --out out/bkg/$L.exr; done
python3 tools/bkg/pack.py out/bkg public/assets/bkg
```

Su 2 core CPU l'anteprima a 1024 px richiede circa 7 minuti, i tre piani finali circa un'ora e mezza. Su una workstation con GPU (Cycles OptiX/HIP) bastano pochi minuti; con `--res 3200` il piano a fuoco resta nitido anche su ultrawide 4K.

| File | Cosa fa |
| --- | --- |
| `field.py` | La scena (V22): camera radente (1,25 m, 17° verso il basso) su un campo di piramidi d'ossidiana. Celle di Voronoi da un campionamento di Poisson in un piano deformato (la cella cresce con la distanza), una piramide a 3–4 facce per cella, cornice a V di lastre in primo piano, suolo emissivo con zone calde composte (`HOT`) e luce che sale dalla base di ogni cristallo. `--seed` cambia il campo, la cornice ha un seme suo. |
| `scene.py` | La prima versione (vista dall'alto, conca radiale), tenuta come riferimento. Contiene anche i materiali condivisi: ossidiana (vetro nero con assorbimento ambra-granato e micro-superficie) e suolo emissivo. |
| `pack.py` | EXR → set `landscape`, `landscape_m`, `portrait`: buio in lontananza, key e glow in WebP a scala di grigi (codifica √(x/(x+0,6))), alpha e disparità lossless (disparità a metà risoluzione, bordi riempiti dall'opaco più vicino), glint, poster e punto di fuga nel manifest. |
| `exrtool.py` | Lettura EXR, separazione key/glow (key = B, glow = R − B), rampa ambra per le anteprime. |
| `crops.py`, `sheet.py` | Anteprime: crop ultrawide, 16:9 e mobile, con il buio in lontananza. |

Le leve principali sono in testa a `field.py`: altezza e inclinazione della camera (`CAM_H`, `PITCH`, e allora va aggiornato `FOE` in `pack.py`), confine MG/BG (`Y_SPLIT`), crescita delle celle (`S0`, `KS`), zone calde (`HOT`), cornice (`fg_shards`). Altezze delle piramidi e fessure sono in `build_field()`; luce e materiali in `world_light()`, `setup_scene()` e `main()` (`--key`, `--world`, `--baseglow`, `--emit`).
