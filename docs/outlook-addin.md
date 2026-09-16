# OnePulse Outlook-tillegg

Outlook-tillegget legger til knappen **Send til OnePulse** når en bruker leser en
e-post. Knappen åpner OnePulse-panelet og oppretter forbedringsforslaget direkte:

- E-postens emne blir forslagets tittel.
- E-postens tekst og avsender blir beskrivelse.
- Forslaget får status `Ny`, kilde `Outlook`, forventet effekt `Liten` og
  kompleksitet `Krevende`.
- Outlooks meldings-ID hindrer at samme bruker importerer samme e-post flere
  ganger.

## Ta tillegget i bruk

1. Publiser OnePulse til et stabilt HTTPS-domene.
2. Last ned manifestet fra:
   `https://<publisert-domene>/api/outlook/manifest.xml`
3. I Microsoft 365 administrasjonssenter velger du **Innstillinger → Integrerte
   apper → Last opp egendefinert app** og laster opp manifestet.
4. Tildel appen til ønskede brukere eller grupper.
5. Brukerne åpner en mottatt e-post og velger **Send til OnePulse** i Outlook.
6. Første gang må brukeren logge inn i OnePulse i sidepanelet. Senere importer
   opprettes direkte.

Tillegget ber bare om Outlook-tillatelsen `ReadItem`. Det får tilgang til den
e-posten brukeren aktivt har åpnet, ikke hele postboksen.