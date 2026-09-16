# OnePulse Outlook-tillegg

Outlook-tillegget legger til knappen **Nytt forslag** i Outlook-båndet. Knappen
åpner et lite OnePulse-skjema med samme innhold som skjemaet i hovedappen:

- type forslag
- kort tittel
- beskrivelse og eventuelt løsningsforslag
- forventet effekt og utviklingskompleksitet

Forslaget lagres med status `Ny` og kilde `Outlook`.

Brukeren logger ikke inn i OnePulse. Tillegget bruker Microsoft Nested App
Authentication til å bekrefte identiteten automatisk fra Outlook-økten.

## Ta tillegget i bruk

1. Opprett en Single Page Application i Microsoft Entra ID for virksomhetens
   tenant.
2. Legg til Microsoft Graph-tillatelsen `User.Read`.
3. Legg til en SPA broker redirect URI etter Microsofts gjeldende krav for
   Nested App Authentication.
4. Registrer appens klient-ID og tenant-ID som `MICROSOFT_ENTRA_CLIENT_ID` og
   `MICROSOFT_ENTRA_TENANT_ID` i OnePulse.
5. Publiser OnePulse til et stabilt HTTPS-domene.
6. Last ned manifestet fra:
   `https://<publisert-domene>/api/outlook/manifest.xml`
7. I Microsoft 365 administrasjonssenter velger du **Innstillinger → Integrerte
   apper → Last opp egendefinert app** og laster opp manifestet.
8. Tildel appen til ønskede brukere eller grupper og gi administratorgodkjenning
   til Microsoft Graph-tillatelsen.
9. Brukerne velger **Nytt forslag** i Outlook, fyller ut skjemaet og sender inn.

Tillegget leser ikke e-postinnhold eller postboksen. Microsoft Graph-tillatelsen
`User.Read` brukes bare til å hente navn og e-postadresse for innmelderen.