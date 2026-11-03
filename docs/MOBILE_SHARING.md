# Mobile invoice and statement sharing

The delivery form prepares the private PDF before enabling delivery buttons. The native share call runs directly from the user's next tap with the prepared File, title and reviewed message; it performs no file fetch first, preserving the user activation needed by mobile browsers.

Share PDF to WhatsApp opens the operating system share menu. Users choose WhatsApp and then the contact. The website cannot select a WhatsApp contact through the native share API. WhatsApp/browser versions may handle the accompanying message differently; Copy message is provided for a caption or separate message.

The wa.me shortcut is explicitly labelled Open WhatsApp message only. It cannot attach a local file. Download PDF is a separate fallback for browsers without PDF file sharing; users attach the downloaded PDF as a document in WhatsApp. Unsupported sharing and cancellation never silently fall back to a text-only share.

Brevo's sender and reply-to remain accounts@lexchamber.co.za, display name LexChamber Accounts. Test sends do not go to live recipients.

Validation: 63 automated tests passed, including synchronous File sharing, exact PDF bytes and MIME type, unsupported sharing, cancellation and the fixed Brevo sender/attachment. Isolated browser QA confirmed preparation disables delivery buttons until ready and the share event includes the actual PDF and message. The native WhatsApp hand-off on an iPhone/Android device was not available in the test environment.
