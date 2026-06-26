/**
 * Тести для GET /api/generate-quote
 *
 * Мокаємо:
 *  - connectToDatabase   → нічого не робить
 *  - PromptConfig.findOne → повертаємо null або об'єкт
 *  - Quote.create        → успіх або помилка
 *  - Quote.countDocuments / findOne.skip → для fallback
 *  - @google/genai       → повертаємо текст або кидаємо помилку
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Моки зовнішніх залежностей ────────────────────────────────────────────

const mockGenerateContent = vi.fn();

// GoogleGenAI використовується як клас (new GoogleGenAI(...)),
// тому мок повинен бути справжнім конструктором
vi.mock('@google/genai', () => {
  const MockGoogleGenAI = vi.fn(function () {
    return { models: { generateContent: mockGenerateContent } };
  });
  return { GoogleGenAI: MockGoogleGenAI };
});

vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

const mockPromptConfigFindOne = vi.fn();
vi.mock('@/lib/models/PromptConfig', () => ({
  default: { findOne: mockPromptConfigFindOne },
}));

const mockQuoteCreate = vi.fn();
const mockQuoteCountDocuments = vi.fn();
// findOne(...).skip(...) — ланцюжок; повертаємо об'єкт з методом skip
const mockQuoteFindOne = vi.fn();
vi.mock('@/lib/models/Quote', () => ({
  default: {
    create: mockQuoteCreate,
    countDocuments: mockQuoteCountDocuments,
    findOne: mockQuoteFindOne,
  },
}));

// ─── Хелпер для створення запиту ────────────────────────────────────────────

function makeRequest(lang?: string): NextRequest {
  const url = lang
    ? `http://localhost/api/generate-quote?lang=${lang}`
    : 'http://localhost/api/generate-quote';
  return new NextRequest(url);
}

// ─── Тести ──────────────────────────────────────────────────────────────────

describe('GET /api/generate-quote', () => {
  // Завантажуємо route динамічно ПІСЛЯ того, як моки вже встановлено
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Динамічний імпорт, щоб модуль зчитував замоканий GoogleGenAI
    const mod = await import('@/app/api/generate-quote/route');
    GET = mod.GET;
  });

  // ── 1. Успішна генерація (без конфігу в БД, мова UK) ─────────────────────
  it('повертає цитату для lang=uk (без DB конфігу)', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockResolvedValue({ text: 'Куй своє серце як сталь.' });
    mockQuoteCreate.mockResolvedValue({});

    const res = await GET(makeRequest('uk'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.quote).toBe('Куй своє серце як сталь.');
    expect(body.fallback).toBeUndefined();
  });

  // ── 2. Успішна генерація (без конфігу в БД, мова EN) ─────────────────────
  it('повертає цитату для lang=en (без DB конфігу)', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockResolvedValue({ text: 'Forge your soul in darkness.' });
    mockQuoteCreate.mockResolvedValue({});

    const res = await GET(makeRequest('en'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.quote).toBe('Forge your soul in darkness.');
  });

  // ── 3. Генерація з конфігом з БД + lang=uk ───────────────────────────────
  it('використовує конфіг з БД і додає вимогу мови UK', async () => {
    mockPromptConfigFindOne.mockResolvedValue({
      systemInstruction: 'Custom instruction',
      examples: [{ user: 'test', ai: 'response' }],
    });
    mockGenerateContent.mockResolvedValue({ text: 'Текст від AI.' });
    mockQuoteCreate.mockResolvedValue({});

    const res = await GET(makeRequest('uk'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.quote).toBe('Текст від AI.');

    // Перевіряємо що systemInstruction містить вимогу Ukrainian
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.config.systemInstruction).toContain('Ukrainian');
  });

  // ── 4. Генерація з конфігом з БД + lang=en ───────────────────────────────
  it('використовує конфіг з БД і додає вимогу мови EN', async () => {
    mockPromptConfigFindOne.mockResolvedValue({
      systemInstruction: 'Custom instruction',
      examples: [],
    });
    mockGenerateContent.mockResolvedValue({ text: 'AI text.' });
    mockQuoteCreate.mockResolvedValue({});

    const res = await GET(makeRequest('en'));
    const callArgs = mockGenerateContent.mock.calls[0][0];

    expect(callArgs.config.systemInstruction).toContain('English');
  });

  // ── 5. lang не переданий → fallback до 'uk' ──────────────────────────────
  it('якщо lang не переданий — використовує uk за замовчуванням', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockResolvedValue({ text: 'Дефолтна цитата.' });
    mockQuoteCreate.mockResolvedValue({});

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.quote).toBe('Дефолтна цитата.');
    // lang=uk зберігається в БД
    expect(mockQuoteCreate).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'uk' })
    );
  });

  // ── 6. Невалідний lang → fallback до 'uk' ────────────────────────────────
  it('невалідний lang (наприклад "fr") → зводиться до uk', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockResolvedValue({ text: 'Цитата.' });
    mockQuoteCreate.mockResolvedValue({});

    const res = await GET(makeRequest('fr'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockQuoteCreate).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'uk' })
    );
  });

  // ── 7. Injection-спроба в lang ───────────────────────────────────────────
  it('injection у lang не потрапляє до БД', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockResolvedValue({ text: 'Цитата.' });
    mockQuoteCreate.mockResolvedValue({});

    await GET(makeRequest("'; DROP TABLE quotes; --"));
    expect(mockQuoteCreate).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'uk' })
    );
  });

  // ── 8. AI повертає порожній рядок → fallback із БД ───────────────────────
  it('якщо AI повертає порожній текст — повертає цитату з БД (fallback)', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockResolvedValue({ text: '   ' }); // тільки пробіли → trim() → ''

    mockQuoteCountDocuments.mockResolvedValue(1);
    mockQuoteFindOne.mockReturnValue({
      skip: vi.fn().mockResolvedValue({ text: 'Збережена цитата з БД.' }),
    });

    const res = await GET(makeRequest('uk'));
    const body = await res.json();

    expect(body.quote).toBe('Збережена цитата з БД.');
    expect(body.fallback).toBe(true);
  });

  // ── 9. AI кидає помилку → fallback із БД ────────────────────────────────
  it('якщо AI кидає помилку — повертає цитату з БД', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockRejectedValue(new Error('API rate limit'));

    mockQuoteCountDocuments.mockResolvedValue(2);
    mockQuoteFindOne.mockReturnValue({
      skip: vi.fn().mockResolvedValue({ text: 'Резервна цитата.' }),
    });

    const res = await GET(makeRequest('uk'));
    const body = await res.json();

    expect(body.quote).toBe('Резервна цитата.');
    expect(body.fallback).toBe(true);
  });

  // ── 10. AI кидає помилку, БД порожня → error-повідомлення UK ─────────────
  it('якщо AI і БД без цитат — повертає error-текст UK', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockRejectedValue(new Error('some error'));
    mockQuoteCountDocuments.mockResolvedValue(0);

    const res = await GET(makeRequest('uk'));
    const body = await res.json();

    expect(body.fallback).toBe(true);
    expect(body.quote).toContain('вогню');
    expect(body.quote).toContain('пізніше');
  });

  // ── 11. AI кидає помилку, БД порожня → error-повідомлення EN ─────────────
  it('якщо AI і БД без цитат — повертає error-текст EN', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockRejectedValue(new Error('some error'));
    mockQuoteCountDocuments.mockResolvedValue(0);

    const res = await GET(makeRequest('en'));
    const body = await res.json();

    expect(body.fallback).toBe(true);
    expect(body.quote).toContain('fire');
    expect(body.quote).toContain('later');
  });

  // ── 12. PerDay помилка → "завтра" / "tomorrow" ───────────────────────────
  it('PerDay помилка → timeHint "завтра" для UK', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockRejectedValue(new Error('Quota exceeded PerDay'));
    mockQuoteCountDocuments.mockResolvedValue(0);

    const res = await GET(makeRequest('uk'));
    const body = await res.json();

    expect(body.quote).toContain('завтра');
  });

  it('PerDay помилка → timeHint "tomorrow" для EN', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockRejectedValue(new Error('Quota exceeded PerDay'));
    mockQuoteCountDocuments.mockResolvedValue(0);

    const res = await GET(makeRequest('en'));
    const body = await res.json();

    expect(body.quote).toContain('tomorrow');
  });

  // ── 13. retry in Xs → "через X сек" / "in X sec" ───────────────────────
  it('retry in 30s → timeHint "через 30 сек" для UK', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockRejectedValue(new Error('Please retry in 30s'));
    mockQuoteCountDocuments.mockResolvedValue(0);

    const res = await GET(makeRequest('uk'));
    const body = await res.json();

    expect(body.quote).toContain('через 30 сек');
  });

  it('retry in 90s → timeHint "через ~2 хв" для UK', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockRejectedValue(new Error('Please retry in 90s'));
    mockQuoteCountDocuments.mockResolvedValue(0);

    const res = await GET(makeRequest('uk'));
    const body = await res.json();

    expect(body.quote).toContain('~2 хв');
  });

  // ── 14. Quote.create кидає помилку → не ламає відповідь ─────────────────
  it('помилка збереження в БД не ламає успішну відповідь', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockResolvedValue({ text: 'Цитата.' });
    mockQuoteCreate.mockRejectedValue(new Error('DB write failed'));

    const res = await GET(makeRequest('uk'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.quote).toBe('Цитата.');
  });

  // ── 15. Перевірка структури contents з прикладами ────────────────────────
  it('contents будуються правильно: user → model → user (фінальний промпт)', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockResolvedValue({ text: 'Цитата.' });
    mockQuoteCreate.mockResolvedValue({});

    await GET(makeRequest('uk'));

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const contents = callArgs.contents;

    // Приклади: 2 пари user/model = 4 елементи + 1 фінальний user
    expect(contents).toHaveLength(5);
    expect(contents[0].role).toBe('user');
    expect(contents[1].role).toBe('model');
    expect(contents[4].role).toBe('user');
    expect(contents[4].parts[0].text).toContain('мотивації');
  });

  it('contents для EN мають англійський фінальний промпт', async () => {
    mockPromptConfigFindOne.mockResolvedValue(null);
    mockGenerateContent.mockResolvedValue({ text: 'Quote.' });
    mockQuoteCreate.mockResolvedValue({});

    await GET(makeRequest('en'));

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const contents = callArgs.contents;
    const lastContent = contents[contents.length - 1];

    expect(lastContent.parts[0].text).toContain('motivation');
  });
});
