"use client";

import { useState } from "react";
import styles from "@/app/page.module.css";

const translations = {
  uk: {
    title: "Темна Мотивація",
    loadingText: "Куємо слова у вогні...",
    placeholder: "Натисни кнопку, щоб отримати іскру.",
    btnLoading: "Генерація...",
    btnText: "Отримати мотивацію",
    errorText: "Навіть темрява іноді дає збій. Спробуй ще раз."
  },
  en: {
    title: "Dark Motivation",
    loadingText: "Forging words in fire...",
    placeholder: "Click the button to ignite the spark.",
    btnLoading: "Forging...",
    btnText: "Get motivation",
    errorText: "Even darkness fails sometimes. Try again."
  }
};

export default function QuoteClient() {
  const [quote, setQuote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'uk' | 'en'>('uk');

  const t = translations[lang];

  const generateQuote = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.langSwitcher}>
        <button 
          className={`${styles.langBtn} ${lang === 'uk' ? styles.active : ''}`} 
          onClick={() => { setLang('uk'); setQuote(null); }}
        >
          UK
        </button>
        <button 
          className={`${styles.langBtn} ${lang === 'en' ? styles.active : ''}`} 
          onClick={() => { setLang('en'); setQuote(null); }}
        >
          EN
        </button>
      </div>

      <h1 className={styles.title}>{t.title}</h1>
      
      <div className={styles.card}>
        {loading ? (
          <p className={styles.quote}>{t.loadingText}</p>
        ) : quote ? (
          <p className={styles.quote}>{quote}</p>
        ) : (
          <p className={`${styles.quote} ${styles.placeholder}`}>{t.placeholder}</p>
        )}
      </div>

      <button 
        className={styles.button} 
        onClick={generateQuote}
        disabled={loading}
      >
        {loading ? t.btnLoading : t.btnText}
      </button>
    </main>
  );
}
