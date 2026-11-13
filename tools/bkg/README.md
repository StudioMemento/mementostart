# tools/bkg — produzione dei plate dello sfondo

Lo sfondo (V22) è una scena procedurale renderizzata in Blender Cycles su tre piani di profondità (bg, mg, fg). Questi script la ricreano da zero e producono i file in `public/assets/bkg/`. Regole e scelte sono in `docs/dna/sfondo.md`.

```sh
pip install bpy==5.3.0 scipy shapely OpenEXR pillow       # Python 3.13; bpy è Blender come modulo

# anteprima con profondità di campo vera (fuoco sul piano intermedio)
python3 tools/bkg/scene.py --res 1024 --spp 32 --dof 1 --focus 7.2 --fstop 0.17 --out out/bkg/preview.exr
python3 tools/bkg/crops.py out/bkg/preview.exr out/bkg/preview.png        # crop ultrawide / desktop / mobile

# plate finali: un render per piano, pinhole (la profondità di campo la fa il browser)
for L in mg fg bg; do python3 tools/bkg/scene.py --res 2560 --spp 36 --layer $L --out out/bkg/$L.exr; done
python3 tools/bkg/pack.py out/bkg public/assets/bkg
```

Tempi di riferimento su 2 core CPU: MG 41 min, FG 20 min, BG 13 min. Su una workstation con GPU (Cycles OptiX/HIP) bastano pochi minuti; con `--res 3200` il piano a fuoco resta nitido anche su ultrawide 4K.

| File | Cosa fa |
| --- | --- |
| `scene.py` | Conca radiale a tre strati: celle di Voronoi spezzate da fratture, schegge sfaccettate, cristalli sciolti, fondo emissivo con zone calde (`heat`), ossidiana (vetro nero con assorbimento ambra-granato), studio neutro. `--seed` cambia la disposizione. |
| `pack.py` | EXR → set `landscape`, `landscape_m`, `portrait`: key e glow in WebP a scala di grigi (codifica √(x/(x+0,6))), alpha e disparità lossless (disparità a metà risoluzione, bordi riempiti dall'opaco più vicino), glint e poster. |
| `exrtool.py` | Lettura EXR, separazione key/glow (key = B, glow = R − B), rampa ambra per le anteprime. |
| `crops.py` | Anteprime dei crop ultrawide, 16:9 e mobile. |

Le leve principali sono in `build_strata()` di `scene.py`: profilo di profondità, misura delle celle, larghezza delle fessure, zone calde, faglie del primo piano. Densità dell'ossidiana e materiali sono in `main()`.
