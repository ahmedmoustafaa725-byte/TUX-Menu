const ROKT_FONT_NAME = "RoktIcons";
const ROKT_FONT_URL = "https://apps.rokt.com/icons/rokt-icons.woff";

function markFontUsage() {
  const helper = document.createElement("span");
  helper.textContent = "\u00A0";
  helper.style.position = "absolute";
  helper.style.opacity = "0";
  helper.style.pointerEvents = "none";
  helper.style.width = "0";
  helper.style.height = "0";
  helper.style.overflow = "hidden";
  helper.style.whiteSpace = "nowrap";
  helper.style.fontFamily = ROKT_FONT_NAME;
  helper.setAttribute("aria-hidden", "true");
  document.body.append(helper);
  window.setTimeout(() => helper.remove(), 3000);
}

async function ensureRoktFont() {
  if (!("fonts" in document)) {
    return;
  }

  try {
    const fontFace = new FontFace(
      ROKT_FONT_NAME,
      `url(${ROKT_FONT_URL}) format('woff')`,
      { style: "normal", weight: "400", display: "swap" }
    );

    const loadedFont = await fontFace.load();
    document.fonts.add(loadedFont);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", markFontUsage, { once: true });
    } else {
      markFontUsage();
    }
  } catch (error) {
    console.warn("Failed to load Rokt icon font", error);
  }
}

ensureRoktFont();
