# SEO та AI discovery після деплою

Цей чеклист охоплює зовнішні налаштування, які не можна перевірити лише тестами репозиторію.

## 1. Перевірка production після деплою

```bash
curl -I https://ravlyk.org/definitely-not-real
curl -I https://ravlyk.org/manual.html
curl -I https://ravlyk.org/manual
curl -I https://ravlyk.org/language-reference.md
curl -I https://ravlyk.org/llms.txt
```

Очікування:

- невідома адреса повертає `404`, а не `200` з головною сторінкою;
- `/manual.html` перенаправляє на `/manual`;
- `/manual` повертає `200`;
- `language-reference.md` має `Content-Type: text/markdown`;
- `llms.txt` має текстовий `Content-Type`.

Також перевірити, що `ravlyk.pages.dev` не індексується як окрема копія сайту. Найпростіше рішення — redirect цього hostname на `https://ravlyk.org` у Cloudflare.

## 2. Google Search Console

1. Створити Domain property для `ravlyk.org`.
2. Додати запропонований Google DNS TXT-запис у Cloudflare DNS.
3. Подати `https://ravlyk.org/sitemap.xml`.
4. Через URL Inspection перевірити `/`, `/manual`, `/lessons`, `/about`.
5. Після деплою перевірити звіт Page indexing на soft-404, duplicate canonical і redirect URLs.

## 3. Bing Webmaster Tools

1. Імпортувати сайт із Google Search Console або підтвердити домен окремо.
2. Подати `https://ravlyk.org/sitemap.xml`.
3. Перевірити crawl/indexing diagnostics для основних canonical URL.

## 4. Cloudflare AI crawling

У Cloudflare відкрити AI Crawl Control і перевірити окремо:

- фактичні запити AI crawlers у звітах;
- Managed `robots.txt`;
- мережеве блокування crawler-ів, яке працює незалежно від тексту `robots.txt`;
- Markdown for Agents.

Рекомендована політика для мети РАВЛИКА:

- звичайний пошук — дозволити;
- AI search та retrieval/grounding — дозволити;
- `OAI-SearchBot`, Claude search/user agents і Perplexity search — не блокувати;
- training crawlers (`GPTBot`, `ClaudeBot`, `CCBot`) — увімкнути лише як свідоме рішення власника про дозвіл навчання майбутніх моделей;
- якщо Cloudflare дає окремі Content Signals, явно дозволити `ai-input`; `ai-train` встановити відповідно до рішення власника.

Після зміни `robots.txt` перевірити його через `https://ravlyk.org/robots.txt` і повторно переглянути AI Crawl Control через кілька днів.

## 5. Markdown for Agents

Якщо функція доступна на тарифі Cloudflare, увімкнути її й перевірити:

```bash
curl -i -H "Accept: text/markdown" https://ravlyk.org/manual
```

Очікування: `Content-Type: text/markdown`. Статична `language-reference.md` має залишатися доступною незалежно від цієї функції.

## 6. Що не публікувати без реальної функції

Не додавати порожні або фіктивні:

- API catalog;
- OAuth/OIDC metadata;
- OAuth Protected Resource Metadata;
- `auth.md` для реєстрації агентів;
- MCP Server Card;
- DNS-AID records;
- Agent Skills index без реальної навички.
