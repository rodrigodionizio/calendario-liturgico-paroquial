// Sentry error monitoring — substitua SENTRY_DSN pela DSN real do seu projeto em sentry.io
(function () {
  var DSN = 'SENTRY_DSN_PLACEHOLDER';
  if (!DSN || DSN === 'SENTRY_DSN_PLACEHOLDER') return;

  var s = document.createElement('script');
  s.src = 'https://browser.sentry-cdn.com/8.42.0/bundle.min.js';
  s.crossOrigin = 'anonymous';
  s.onload = function () {
    Sentry.init({
      dsn: DSN,
      environment: location.hostname === 'localhost' ? 'development' : 'production',
      release: 'sacristia-digital@4.0.0',
      tracesSampleRate: location.hostname === 'localhost' ? 0 : 0.1,
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
      ],
    });
  };
  document.head.appendChild(s);
})();
