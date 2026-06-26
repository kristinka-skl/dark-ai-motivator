"use client";

import { useState } from "react";
import styles from "@/app/page.module.css";

const translations = {
  uk: {
    title: "Темна Мотивація",
    loadingText: "Куємо слова у вогні...",
    placeholder: "Натисни кнопку, щоб отримати іскру.",
    btnLoading: "Генерація",
    btnText: "Отримати мотивацію",
    errorText: "Навіть темрява іноді дає збій. Спробуй ще раз."
  },
  en: {
    title: "Dark Motivation",
    loadingText: "Forging words in fire...",
    placeholder: "Click the button to ignite the spark.",
    btnLoading: "Forging",
    btnText: "Get motivation",
    errorText: "Even darkness fails sometimes. Try again."
  }
};

export default function QuoteClient() {
  const [quote, setQuote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'uk' | 'en'>('uk');
  const [isError, setIsError] = useState(false);

  const t = translations[lang];

  const generateQuote = async () => {
    setLoading(true);
    setIsError(false);
    try {
      const response = await fetch(`/api/generate-quote?lang=${lang}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error("Failed to generate quote");
      }
      const data = await response.json();
      setQuote(data.quote);
    } catch (error) {
      console.error(error);
      setQuote(t.errorText);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.langSwitcher}>
        <button 
          className={`${styles.langBtn} ${lang === 'uk' ? styles.active : ''}`} 
          onClick={() => { setLang('uk'); setQuote(null); setIsError(false); }}
        >
          UK
        </button>
        <button 
          className={`${styles.langBtn} ${lang === 'en' ? styles.active : ''}`} 
          onClick={() => { setLang('en'); setQuote(null); setIsError(false); }}
        >
          EN
        </button>
      </div>

      <h1 className={styles.title}>{t.title}</h1>
      
      <div className={`${styles.card} ${isError ? styles.errorCard : ''}`} style={{ position: 'relative' }}>
        {loading && quote ? (
          <>
            {/* Прихована стара цитата для збереження висоти картки */}
            <p className={styles.quote} style={{ visibility: 'hidden' }}>
              {isError && "⚠️ "}{quote}
            </p>
            {/* Текст завантаження абсолютно відцентрований поверх */}
            <p className={styles.quote} style={{ position: 'absolute', width: '100%', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', margin: 0 }}>
              {t.loadingText}
            </p>
          </>
        ) : loading ? (
          <p className={styles.quote}>{t.loadingText}</p>
        ) : quote ? (
          <p key={quote} className={`${styles.quote} ${styles.quoteContent}`}>
            {isError && "⚠️ "}{quote}
          </p>
        ) : (
          <p className={`${styles.quote} ${styles.placeholder}`}>{t.placeholder}</p>
        )}
      </div>

      <button 
        className={styles.button} 
        onClick={generateQuote}
        disabled={loading}
      >
        {loading ? (
          <>
            {t.btnLoading}
            <span className={styles.dot}>.</span>
            <span className={styles.dot}>.</span>
            <span className={styles.dot}>.</span>
          </>
        ) : t.btnText}
      </button>
    </main>
  );
}
