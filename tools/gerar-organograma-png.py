"""
Gera public/assets/img/organograma-pgm.png a partir do organograma animado
(assets/js/organograma.js), já montado, em 3x, com a assinatura da PGM.

Rode sempre que mudar o organograma:
  1. cd public && python -m http.server 8080      (em outro terminal)
  2. python tools/gerar-organograma-png.py
Requer: pip install playwright pillow  (usa o Google Chrome instalado)
"""
from playwright.sync_api import sync_playwright
import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "assets", "img", "organograma-pgm.png")
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r"C:/Program Files/Google/Chrome/Application/chrome.exe")
    d = b.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=3, reduced_motion="reduce")
    d.goto("http://127.0.0.1:8080/#sobre"); d.wait_for_load_state("networkidle")
    d.locator(".pillar[data-org]").click()
    d.wait_for_timeout(1200)
    d.evaluate("""() => {
      const org = document.getElementById('organograma');
      // tira do popup e monta sozinho na página, sem limite de largura
      document.body.appendChild(org);
      org.style.position = 'absolute'; org.style.left = '0'; org.style.top = '0'; org.style.zIndex = '9999';
      document.getElementById('pillar-layer').hidden = true;
      org.querySelector('.org__foot').style.display = 'none';
      org.style.cssText += ';background:#fff;padding:36px 40px 40px;margin:0;width:1180px';
      const head = document.createElement('div');
      head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:24px;margin:0 0 30px;padding-bottom:22px;border-bottom:1px solid #eee;font-family:Montserrat,sans-serif';
      head.innerHTML = '<img src="assets/logos/assinatura-proger.png" style="height:70px;width:auto" alt="">' +
        '<div style="text-align:right"><div style="font-weight:900;font-size:26px;color:#000;letter-spacing:-.3px">Organograma Institucional</div>' +
        '<div style="font-size:13px;color:#7A7A7A;margin-top:4px;text-transform:uppercase;letter-spacing:1px">Procuradoria Geral do Município de Camaçari</div></div>';
      org.insertBefore(head, org.firstChild);
      const stripe = document.createElement('div');
      stripe.style.cssText = 'height:8px;margin:34px -40px -40px;background:linear-gradient(100deg,#C20E1A 0 25%,#A2C037 25% 50%,#D67C1C 50% 75%,#84329B 75%)';
      org.appendChild(stripe);
    }""")
    d.wait_for_timeout(500)
    d.evaluate("window.PGMOrg.play()")      # recalcula as linhas no novo tamanho (já montado: reduced motion)
    d.wait_for_timeout(300)
    d.evaluate("document.getElementById('organograma').classList.remove('is-flowing')")  # estática: sem fluxo
    d.evaluate("window.scrollTo(0,0)")
    d.wait_for_timeout(300)
    d.locator("#organograma").screenshot(path=OUT)
    b.close()
from PIL import Image
im = Image.open(OUT); print("gerado", im.size)
im.convert("RGB").save(OUT, optimize=True)
import os; print(os.path.getsize(OUT)//1024, "KB")
