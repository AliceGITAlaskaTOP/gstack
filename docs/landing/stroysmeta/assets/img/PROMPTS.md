# Карта изображений

Один style suffix на весь набор — иначе картинки читаются как свалка из разных стилей:

```
photorealistic architectural visualization, muted grey-green and warm sand palette,
35mm lens, natural colors, fine film grain, no text, no logos, no people
```

| Файл | Где стоит | Промпт (без суффикса) |
|---|---|---|
| `hero.webp` | первый экран, 16:10 | wide cinematic architectural render of a modern two-storey house with graphite standing-seam roof, light plaster walls and large windows, forest plot, dusk warm interior glow, subject on the right third, empty sky on the left |
| `facade-day.webp` | AI-визуализация, ракурс «день» | main facade of a modern two-storey house, light plaster and dark window frames, front three-quarter view, soft overcast daylight, green lawn |
| `terrace-evening.webp` | AI-визуализация, ракурс «вечер» | covered terrace of a modern house with wooden ceiling and outdoor lounge furniture, blue hour, warm lamps, low camera angle |
| `drone.webp` | AI-визуализация, ракурс «дрон» | aerial drone view of a single modern house on a wooded plot with driveway and lawn, late afternoon light, top-down three-quarter |
| `proposal.webp` | мокап телефона и модалка, 4:3 | modern two-storey house seen from the garden, vertical portrait framing, soft morning light, calm composition |
| `variant-base.webp` | комплектация «Базовый», 4:3 | compact single-storey modern house with simple gable roof, light plaster, minimal landscaping, overcast daylight, front view |
| `variant-comfort.webp` | комплектация «Комфорт», 4:3 | modern two-storey house with panoramic windows and terrace, light plaster and wood accents, overcast daylight, front three-quarter view |
| `variant-premium.webp` | комплектация «Премиум», 4:3 | large premium modern house with stone and wood facade, panoramic glazing, pool and landscaped garden, golden hour, front three-quarter view |
| `texture.webp` | резерв под разделитель | macro close-up texture of smooth grey concrete wall with faint formwork lines, low contrast, soft diffused light |
| `og.webp` | og-image, 1200×630 | wide banner composition of a modern house under construction with scaffolding at golden hour, empty space on the left third |

Пропорции задаёт вёрстка через `aspect-ratio` + `object-fit: cover`, поэтому пропорция
исходника некритична. Пока файла нет, контейнер показывает чертёжную подложку —
вёрстка не прыгает и пустых блоков не видно.

Логотипы, сертификаты и фотографии реальных объектов компании сюда не генерируются:
их берут у клиента.
