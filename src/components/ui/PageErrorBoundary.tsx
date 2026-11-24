import React from 'react';

export class PageErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    const messages = {
      uz: ['Sahifani ochib boʻlmadi', 'Qayta yuklash'],
      ru: ['Не удалось открыть страницу', 'Перезагрузить'],
      en: ['This page couldn’t load', 'Reload page'],
    };
    const lang = document.documentElement.lang;
    const [title, reload] = messages[lang as keyof typeof messages] ?? messages.uz;

    return (
      <main className="zaven-page-container py-12 text-center text-gray-900 dark:text-gray-100">
        <h1 className="mb-4 text-lg font-bold" role="alert">{title}</h1>
        <button
          type="button"
          className="min-h-11 rounded-lg bg-[#0F3D2E] px-4 font-semibold text-white"
          onClick={() => window.location.reload()}
        >
          {reload}
        </button>
      </main>
    );
  }
}
