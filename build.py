"""Собирает автономный my-tasks.html. Запуск: python3 build.py."""
from pathlib import Path

root = Path(__file__).resolve().parent
page = (root / 'index.html').read_text(encoding='utf-8')
page = page.replace(
    '<link rel="stylesheet" href="styles.css">',
    '<style>\n' + (root / 'styles.css').read_text(encoding='utf-8') + '\n</style>',
)
page = page.replace('<script src="app.js" defer></script>', '')
page = page.replace(
    '</body>',
    '<script>\n' + (root / 'app.js').read_text(encoding='utf-8') + '\n</script>\n</body>',
)
(root / 'my-tasks.html').write_text(page, encoding='utf-8')
print('Собран my-tasks.html — страница со встроенными стилями и кодом.')
