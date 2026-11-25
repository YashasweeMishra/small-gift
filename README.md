# For Sarthuuu — Birthday Website

A responsive, static HTML/CSS/JavaScript birthday experience. No Node.js or build step is required.

## Run locally
1. Extract the ZIP.
2. Open the folder in VS Code.
3. Start `index.html` with the Live Server extension, or run a local server:
   - Python: `python -m http.server 5500`
   - Then open `http://localhost:5500`

Microphone access generally requires `localhost` or HTTPS. If it does not work, the **Blow the candles** button is the fallback.

## Add your photographs
Copy photos into `images/` and name them:
- `memory1.jpg`
- `memory2.jpg`
- `memory3.jpg`
- `memory4.jpg`
- `memory5.jpg`

You can add more gallery items by copying a `.gallery-item` block in `index.html`. The upload button previews selected images for the current browser session; it does not upload them to a server or save them permanently.

## Add your Hindi shayari
Open `index.html`, find `id="hindiPoem"`, and replace the bracketed placeholder paragraphs with your complete Hindi shayari. Keep each stanza in its own `<p>...</p>` element. The exact Hindi text was not included in the brief, so editable placeholders are provided.

## Add background music
Place a licensed audio file at `assets/ambient.mp3`. The music button will then play/pause it after the visitor clicks the button. Keep the volume low and use music you have permission to use.

## Customize
- Colors, layout, typography and responsive styles: `style.css`
- Candle, microphone, gallery and music interactions: `script.js`
- Page content and section order: `index.html`

Decorative bottles are styled as elegant sparkling-celebration bottles rather than alcohol branding.

### Adjusting photo location
Open **Edit Website** and find **Photos for every page**. Under each photo upload field, use **Photo location** to choose Left, Center, or Right. Press **Save changes** to keep the selected placement in that browser.
