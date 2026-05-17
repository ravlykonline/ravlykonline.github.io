/**
 * Frame-busting guard — runs synchronously before any other script.
 *
 * GitHub Pages does not support custom HTTP headers, so the CSP
 * `frame-ancestors` directive (which only works via HTTP header) cannot be
 * used to block clickjacking. This script is the practical mitigation:
 * if this page is ever loaded inside an <iframe>, it immediately replaces
 * the top-level location with itself, breaking out of the frame.
 */
if (window.top !== window.self) {
    window.top.location.replace(window.self.location.href);
}
