"""Extract the supplied PDF's embedded food images, retaining their transparency."""
from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdf

target = Path('assets/food')
target.mkdir(parents=True, exist_ok=True)
photos = {2: {1:'sajji',2:'bbq',3:'fish'},3:{1:'kabab',2:'chicken-karahi',3:'handi'},4:{1:'beef-karahi',2:'qeema',3:'masala',4:'nuggets',5:'wings'},5:{1:'naan',2:'roll',3:'burger',4:'salad',6:'drinks',7:'raita'},6:{1:'couple-platter',8:'family-platter',11:'friends-platter'}}
for number, names in photos.items():
    source = f'C:/Users/MMP/Documents/MENU {number}.pdf'
    images = list(PdfReader(source).pages[0].images)
    for index, name in names.items():
        images[index].image.save(target / f'{name}.webp', 'WEBP', quality=90)
for number in range(1,7):
    doc = pdf.PdfDocument(f'C:/Users/MMP/Documents/MENU {number}.pdf')
    doc[0].render(scale=2).to_pil().convert('RGB').save(f'assets/menu-{number}.jpg',quality=88)
print('Extracted 20 food photos and all six menu sheets.')
