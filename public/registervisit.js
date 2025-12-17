/**
 * ContextVM Analytics Tracker (hardened local copy)
 *
 * Standalone visitor registration with basic safety checks:
 * - Validates UUID format before sending
 * - Only allows http(s) tracker URLs (defaults to same-origin)
 * - Short request timeout and credentials omitted to avoid leaking cookies
 *
 * Configure via data attributes on the script tag:
 *   data-site-uuid="YOUR_SITE_UUID"
 *   data-tracker-url="https://analytics.example.com" (optional, defaults to same origin)
 *   data-debug="true" to enable console logging
 */
(function () {
  'use strict';

  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const DEFAULT_TIMEOUT_MS = 5000;

  function detectDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua))
      return 'mobile';
    return 'desktop';
  }

  function getPagePath() {
    return window.location.pathname + window.location.search;
  }

  function validateSiteUuid(siteUuid) {
    if (!siteUuid || !UUID_REGEX.test(siteUuid)) {
      console.warn('[ContextVM Analytics] Invalid site UUID; visit not sent.');
      return false;
    }
    return true;
  }

  function resolveTrackerUrl(urlFromAttr) {
    try {
      if (!urlFromAttr) return new URL('/track', window.location.origin).toString();
      const candidate = new URL(urlFromAttr, window.location.origin);
      if (candidate.protocol !== 'https:' && candidate.protocol !== 'http:') {
        console.warn('[ContextVM Analytics] Tracker URL must be http(s); using same-origin instead.');
        return new URL('/track', window.location.origin).toString();
      }
      return new URL('/track', candidate.origin).toString();
    } catch (_err) {
      console.warn('[ContextVM Analytics] Tracker URL malformed; using same-origin instead.');
      return new URL('/track', window.location.origin).toString();
    }
  }

  async function trackPageVisit(config) {
    const { siteUuid, trackerUrl, debug = false } = config;

    if (!validateSiteUuid(siteUuid)) return;

    const endpoint = resolveTrackerUrl(trackerUrl);
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
      : null;

    const payload = {
      siteUuid,
      pagePath: getPagePath(),
      deviceType: detectDeviceType(),
      userAgent: navigator.userAgent,
    };

    try {
      if (debug) console.log('[ContextVM Analytics] Sending visit', { endpoint, payload });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'omit',
        keepalive: true,
        referrerPolicy: 'no-referrer',
        signal: controller ? controller.signal : undefined,
      });

      if (!response.ok) throw new Error(`Tracking failed: ${response.status}`);
      if (debug) console.log('[ContextVM Analytics] Visit recorded');
    } catch (error) {
      if (debug) console.error('[ContextVM Analytics] Error recording visit:', error);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // Expose safe global API
  window.ContextVMAnalytics = Object.freeze({
    track: (options = {}) => trackPageVisit(options),
  });

  // Auto-track if data attributes are present on the current script tag
  if (typeof document !== 'undefined') {
    const scriptTag = document.currentScript;
    if (scriptTag) {
      const siteUuid = scriptTag.getAttribute('data-site-uuid') || '';
      const trackerUrl = scriptTag.getAttribute('data-tracker-url') || '';
      const debug = scriptTag.getAttribute('data-debug') === 'true';

      if (validateSiteUuid(siteUuid)) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () =>
            trackPageVisit({ siteUuid, trackerUrl, debug })
          );
        } else {
          trackPageVisit({ siteUuid, trackerUrl, debug });
        }
      }
    }
  }
})();
