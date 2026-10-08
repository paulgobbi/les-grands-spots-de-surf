# Les Grands spots de surf

Carte interactive des 146 grands spots de surf, hébergée avec Streamlit Community Cloud et MapLibre GL JS.

## Installer et démarrer en local

Prérequis : Python 3.10+ et connexion Internet (les fonds de carte et la bibliothèque JavaScript sont chargés en ligne).

```bash
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

Sous Windows, remplacer `python` par `py` si nécessaire. Le navigateur ouvrira généralement `http://localhost:8501`.

## Déployer sur GitHub puis Streamlit

1. Créer un dépôt GitHub **public** : `les-grands-spots-de-surf`.
2. Décompresser l'archive et déposer **le contenu** du dossier dans le dépôt, à la racine : `app.py`, `requirements.txt`, le dossier `web/` et éventuellement `.streamlit/`.
3. Attention : `.streamlit/config.toml` se trouve dans un dossier caché ; si l'import par navigateur ne permet pas de l'ajouter, le déploiement fonctionne sans ce dossier (seules les couleurs Streamlit par défaut changeront).
4. Dans https://share.streamlit.io, cliquer sur **Create app** / **Deploy an app**, choisir le dépôt, la branche `main` et le fichier principal `app.py`.
5. Choisir un sous-domaine disponible et déployer. Une URL de la forme `https://les-grands-spots-de-surf.streamlit.app` est possible si libre.
6. Pour mettre à jour, modifier et enregistrer les fichiers du dépôt GitHub : Streamlit redéploie automatiquement le projet.

## Organisation

- `app.py` : intégration Streamlit de l'interface HTML, CSS, JS et du JSON.
- `web/spots.json` : données des 146 spots, dérivées du classeur initial.
- `web/index.html` : structure de l'interface.
- `web/style.css` : interface desktop/mobile.
- `web/app.js` : filtres, recherche, carte, fiches, tris, clustering.
- `.streamlit/config.toml` : thème Streamlit.

## Notes

- Les sélections et tris repartent à leur valeur par défaut lors d'un nouveau chargement.
- Aucun compte, favori ou base de données n'est nécessaire.
- Les menus multisélections sont combinés en OU au sein du filtre, les filtres entre eux en ET.
- Le fond *Carte* utilise OpenFreeMap et *Satellite* utilise l'imagerie Sentinel-2 Cloudless EOX (résolution différente de Google Earth). Ces services sont externes et leurs conditions/disponibilité peuvent évoluer.
- L'interface fonctionne dans un cadre intégré à Streamlit de hauteur 900 px. Pour l'affichage sur de très grands écrans, le navigateur peut afficher du fond Streamlit en dessous du cadre ; ceci n'affecte pas la carte interne.
- Les données originales sont conservées, avec une correction de `Point beak` vers `Point break` uniquement dans les **options de filtre** (la fiche garde le texte Excel).
