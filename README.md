# AION 2 — v4mp Build Lab

Персональный read-only анализатор Ranger **v4mp** · Global EU · Kromede. React + Vite + Cloudflare Pages Functions.

## Что уже реализовано

- Профиль v4mp с запросами к публичным NCSOFT endpoints: character info и equipment.
- Отдельные показатели Gear Score / Item Level и Combat Power — значения не смешиваются.
- Нормализация основных и дополнительных характеристик: `statList`, `statSecondList`, `statAdditionalList`.
- Просмотр экипировки, скинов, навыков и Daevanion board summary.
- Отдельная вкладка Arcana: показывает Arcana-слоты, если они присутствуют в ответе; иначе даёт ссылку на публичный профиль Shugo.GG, не подставляя устаревшие карты.
- PvE Ranger reference с уровнями ключевых навыков, Stigma-ориентирами и ротацией, сверенными с опубликованным гайдом Mobalytics (2 Nov 2026).
- Прозрачный план улучшений по найденным пробелам в навыках и экипировке.
- Адаптивный интерфейс, лёгкие CSS transitions, reduced-motion support.

## Источники и ограничения данных

Основной источник профиля — публичные JSON endpoints NCSOFT:
- `/api/character/info`
- `/api/character/equipment`

Схемы полей и endpoints описаны в [aion2_api API reference](https://github.com/axsddlr/aion2_api/blob/main/docs/API.md). Это неофициальная документация к публичным endpoints NCSOFT; стабильность API не гарантируется.

Публичный профиль персонажа: [Shugo.GG · v4mp](https://shugo.gg/character/global/eu-kromede/v4mp). Shugo.GG отображает экипировку и Arcana, но сайт не используется как скрытый или несанкционированный API.

PvE reference:
- [Mobalytics Ranger PvE guide](https://mobalytics.gg/gamebase/guides/aion-2-ranger-pve-build) — навыки, специализации, ротация и приоритеты экипировки.
- [AION2 Companion Ranger guide](https://aion2companion.com/builds/ranger/) — редакционный порядок PvE характеристик.

Важно:
- PvE reference — опубликованный билд/гайд, а не статистически подтверждённая выборка всех топ-игроков.
- Приоритет характеристик обозначен как редакционный ориентир; он не учитывает капы и реальные значения конкретного персонажа.
- Farm planner пока эвристический: он показывает найденные уровни навыков и экипировку, но не рассчитывает ожидаемый DPS, шансы дропа, стоимость попытки или точный рейтинг данжей.
- Отдельный endpoint детализации Daevanion и item soul-bind/stat lines ещё не подключён.
- Arcana отображается только при наличии распознаваемых данных в ответе NCSOFT. При их отсутствии показывается внешний источник.
- Никакие отсутствующие значения не заменяются демонстрационными цифрами.

## Разработка и проверки

Требования: Node.js 22+.

```bash
npm install
npm test
npm run build
node --check functions/api/profile.js
node --check src/lib/character-data.js
npm audit
```

Unit tests используют встроенный Node.js test runner и проверяют нормализацию API-ответов, основные/дополнительные статы и пустые/невалидные payloads.

GitHub Actions выполняет тесты, production build, syntax checks и dependency audit. Cloudflare Pages публикует `dist` и Functions из `functions/`.

## Текущий стек

- React 18
- Vite 6
- Cloudflare Pages Functions
- Node.js built-in test runner
- CSS motion, без тяжёлого animation runtime

Стек намеренно остаётся лёгким: TypeScript, Playwright, axe-core и Lighthouse CI стоит добавлять после стабилизации API-контракта и основных сценариев, а не ради списка зависимостей.
