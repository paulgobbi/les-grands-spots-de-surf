"""Les Grands spots de surf — Streamlit shell / MapLibre front-end."""
from pathlib import Path
import json
import streamlit as st

ROOT = Path(__file__).resolve().parent
st.set_page_config(page_title="Les Grands spots de surf", page_icon="🌊", layout="wide", initial_sidebar_state="collapsed")
st.markdown("""<style>
header[data-testid="stHeader"]{display:none} #MainMenu,footer{display:none!important}
.block-container{padding:0!important;max-width:100%!important}
[data-testid="stAppViewContainer"]{background:#e9f3f5}
[data-testid="stIFrame"]{display:block;width:100%}
iframe{border:0!important}
</style>""",unsafe_allow_html=True)

spots = json.loads((ROOT / "web/spots.json").read_text(encoding="utf-8"))
# Safe embedding in an inline HTML document (avoid closing script tags).
json_text = json.dumps(spots, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
html = (ROOT / "web/index.html").read_text(encoding="utf-8")
css = (ROOT / "web/style.css").read_text(encoding="utf-8")
js = (ROOT / "web/app.js").read_text(encoding="utf-8")
html = html.replace("/*__CSS__*/",css).replace("/*__SPOTS__*/",json_text).replace("/*__JS__*/",js)
st.iframe(html, width="stretch",height=900)
