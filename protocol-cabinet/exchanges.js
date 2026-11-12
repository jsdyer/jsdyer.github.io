// Fixtures describe application-layer messages. Each step can be inspected independently.
function message(direction, title, payload, explanation, field, meaning) {
  return { direction, title, payload, explanation, field, meaning };
}

const dnsQuery = "Laptop → Resolver";
const dnsReply = "Resolver → Laptop";
const httpRequest = "Browser → Web server";
const httpResponse = "Web server → Browser";
const mailRequest = "Sending server → Receiving server";
const mailResponse = "Receiving server → Sending server";

function addressQuery(name) {
  return message(dnsQuery, "Ask for an address",
    `ID 0x41a7   QUERY   RD\n\nQUESTION\n${name}  IN  A`,
    "The laptop asks its resolver for the IPv4 address of one name. The resolver can use its cache or look up the answer.",
    "A", "This record type holds an IPv4 address. IN is the Internet class.");
}

const greeting = message(mailResponse, "Receive the greeting",
  "220 mail.club.example ESMTP ready",
  "The sending server has opened a connection. The receiving server speaks first and announces its name.",
  "220", "The receiver is ready to start an SMTP conversation.");
const hello = message(mailRequest, "Introduce the sender",
  "EHLO sender.example",
  "The sending server introduces itself and asks which SMTP extensions the receiver supports.",
  "EHLO", "The name following the command identifies the sending host.");
const extensions = message(mailResponse, "Read the capabilities",
  "250-mail.club.example\n250 SIZE 1048576",
  "The receiver advertises a message size limit of 1,048,576 bytes.",
  "250- / 250 ", "A hyphen continues a multiline reply. A space follows the status code on the final line.");
const sender = message(mailRequest, "Set the return address",
  "MAIL FROM:<editor@sender.example>",
  "The sender supplies the return address for this delivery. A later delivery failure can be reported there.",
  "MAIL FROM", "The envelope return address can differ from the From header inside the message.");
const senderOK = message(mailResponse, "Accept the sender",
  "250 OK",
  "The receiver has accepted this envelope sender and is ready for a recipient.",
  "250", "A success reply applies to the command it answers.");
const quit = message(mailRequest, "End the session",
  "QUIT",
  "The sender requests an orderly end to the SMTP session.",
  "QUIT", "The receiver sends one final reply before closing the connection.");
const goodbye = message(mailResponse, "Close the connection",
  "221 mail.club.example closing connection",
  "The receiver acknowledges the sign-off and closes this session.",
  "221", "This reply ends the conversation.");

const httpBody = "The reading room is open.";
const protocols = {
  dns: {
    name: "DNS", transport: "UDP · port 53", format: "Decoded DNS fields",
    cases: [
      {
        id: "address", label: "Look up an address", steps: [
          addressQuery("reader.club.example."),
          message(dnsReply, "Read the answer",
            "ID 0x41a7   NOERROR   QR RD RA\n\nANSWER\nreader.club.example.  300  IN  A  192.0.2.42",
            "The resolver returns an IPv4 address. The matching identifier lets the laptop associate this reply with its question.",
            "TTL 300", "The resource record may be cached for up to 300 seconds.")
        ]
      },
      {
        id: "missing", label: "Look up a missing name", steps: [
          addressQuery("attic.club.example."),
          message(dnsReply, "Read a negative answer",
            "ID 0x41a7   NXDOMAIN   QR RD RA\n\nANSWERS  0\nAUTHORITY\nclub.example. 60 IN SOA ns.club.example. hostmaster.club.example. (\n  2026111201 3600 600 86400 60 )",
            "The resolver reports that the requested name does not exist. It includes the zone’s start-of-authority record so clients can cache the negative result.",
            "NXDOMAIN", "The name itself is absent. An existing name that simply lacks an A record can instead return NOERROR with zero answers.")
        ]
      }
    ]
  },
  http: {
    name: "HTTP", transport: "TCP · port 80", format: "HTTP/1.1 text",
    cases: [
      {
        id: "page", label: "Fetch the reading-room notice", steps: [
          message(httpRequest, "Request a document",
            "GET /notice.txt HTTP/1.1\nHost: club.example\nAccept: text/plain\n\n",
            "The browser requests the reading-room notice and supplies the hostname of the site it wants to reach.",
            "Host", "A server can serve several sites at one address. This header identifies the requested site's hostname."),
          message(httpResponse, "Receive the document",
            `HTTP/1.1 200 OK\nDate: Thu, 12 Nov 2026 12:00:00 GMT\nContent-Type: text/plain\nContent-Length: ${httpBody.length}\nETag: "notice-v2"\n\n${httpBody}`,
            "The web server sends a successful response. The blank line separates the headers from the document body.",
            "Content-Length", "The value counts the body in bytes. This short notice uses only ASCII characters.")
        ]
      },
      {
        id: "cached", label: "Recheck a cached notice", steps: [
          message(httpRequest, "Send a conditional request",
            'GET /notice.txt HTTP/1.1\nHost: club.example\nIf-None-Match: "notice-v2"\n\n',
            "The browser already has a saved notice and its entity tag. It asks the server to send the notice again if the current tag differs.",
            "If-None-Match", "The quoted value came from an ETag header on an earlier response."),
          message(httpResponse, "Reuse the cached copy",
            'HTTP/1.1 304 Not Modified\nDate: Thu, 12 Nov 2026 12:04:00 GMT\nETag: "notice-v2"\n\n',
            "The tag still matches. The server ends its response after the headers and the browser can display the saved notice.",
            "304", "This response has no message body.")
        ]
      }
    ]
  },
  smtp: {
    name: "SMTP", transport: "TCP · port 25", format: "SMTP text",
    cases: [
      {
        id: "letter", label: "Deliver a club bulletin", steps: [
          greeting, hello, extensions, sender, senderOK,
          message(mailRequest, "Name the recipient", "RCPT TO:<desk@club.example>",
            "The sending server identifies the mailbox that should receive this delivery.",
            "RCPT TO", "A message can have several envelope recipients, each specified in its own command."),
          message(mailResponse, "Accept the recipient", "250 OK",
            "The receiver accepts this recipient. The message content comes in a later step.",
            "250", "The receiver still needs to accept the actual message data."),
          message(mailRequest, "Request the data phase", "DATA",
            "With an envelope sender and an accepted recipient, the sender asks to transmit the message.",
            "DATA", "The sender waits for permission before sending the headers and body."),
          message(mailResponse, "Invite the message", "354 Start mail input",
            "The receiver is ready to read the message. It will treat the following lines as message data.",
            "354", "This intermediate reply means the command needs more input."),
          message(mailRequest, "Transmit the bulletin",
            "Date: Thu, 12 Nov 2026 12:00:00 +0000\nFrom: editor@sender.example\nTo: desk@club.example\nSubject: Thursday bulletin\n\nThe reading room opens at noon.\n.",
            "The headers describe the letter. A blank line introduces the body. The final line tells SMTP that the message is complete.",
            "A line containing one dot", "This terminator belongs to SMTP and is removed before delivery."),
          message(mailResponse, "Accept the message", "250 Queued as 41A7",
            "The receiver takes responsibility for further delivery. Receiving this reply tells the sender the transfer succeeded.",
            "Queued as 41A7", "The queue identifier is an example chosen by this receiving server."),
          quit, goodbye
        ]
      },
      {
        id: "recipient", label: "Try an unknown recipient", steps: [
          greeting, hello, extensions, sender, senderOK,
          message(mailRequest, "Name an unknown recipient", "RCPT TO:<attic@club.example>",
            "The sending server asks for delivery to a mailbox this receiver does not recognize.",
            "RCPT TO", "The receiver evaluates each envelope recipient separately."),
          message(mailResponse, "Refuse the recipient", "550 No such mailbox",
            "The receiver declines the only recipient. The sender ends this transaction without sending the letter.",
            "550", "This is a permanent failure for this request. A different recipient address might work."),
          quit, goodbye
        ]
      }
    ]
  }
};
