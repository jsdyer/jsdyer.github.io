# Protocol Cabinet

A pocket reference for three network protocols. Compare a successful DNS lookup with a missing name, fetch an HTTP document and revalidate a cached copy, or follow SMTP through mail delivery and a rejected recipient.

Open [the demo](https://coolcode.ca/protocol-cabinet/) or open `index.html` locally. Pick a protocol and an exchange, then step forward or jump directly to a message. Each message has field notes explaining what to look for. The protocol and exchange are shareable in the URL fragment, such as `#http/cached`.

The static page runs on GitHub Pages and works without a build step. The messages and addresses are fixtures. DNS appears as selected decoded fields. HTTP and SMTP display line breaks as text. All interactions run locally in the browser.

## Editing

Add or revise exchanges in `exchanges.js`. Each step supplies a direction, title, payload, explanation, and annotated field. The interface generates its exchange and message selectors from these fixtures.

## References

- [DNS message format, RFC 1035](https://www.rfc-editor.org/rfc/rfc1035#section-4)
- [Negative DNS caching, RFC 2308](https://www.rfc-editor.org/rfc/rfc2308)
- [HTTP/1.1 message format, RFC 9112](https://www.rfc-editor.org/rfc/rfc9112#section-2)
- [HTTP conditional requests, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110#section-13)
- [SMTP, RFC 5321](https://www.rfc-editor.org/rfc/rfc5321#section-3)
