import { showToast, Toast, open, LaunchProps, getPreferenceValues } from "@raycast/api";

interface Arguments {
  isbn: string;
}

interface Preferences {
  contentType: "toc" | "text" | "both";
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { isbn } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();

  if (!isbn) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Keine ISBN angegeben",
      message: "Bitte gib eine ISBN-10 oder ISBN-13 ein",
    });
    return;
  }

  // ISBN bereinigen (Bindestriche und Leerzeichen entfernen)
  const cleanIsbn = isbn.replace(/[-\s]/g, "");

  // Validierung
  if (!/^\d{10}(\d{3})?$/.test(cleanIsbn)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Ungültige ISBN",
      message: "Die ISBN muss 10 oder 13 Ziffern enthalten",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Suche DNB-Inhalte...",
  });

  try {
    // DNB SRU API Abfrage
    const searchUrl = `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=isbn%3D${cleanIsbn}&recordSchema=MARC21-xml&maximumRecords=1`;
    
    const response = await fetch(searchUrl);
    const xmlText = await response.text();

    // IDN aus der XML-Antwort extrahieren
    const idnMatch = xmlText.match(/<controlfield tag="001">(\d+X?)<\/controlfield>/);
    
    if (!idnMatch) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Buch nicht gefunden",
        message: "Keine DNB-IDN für diese ISBN gefunden",
      });
      return;
    }

    const idn = idnMatch[1];
    
    // URLs definieren
    const tocUrl = `https://d-nb.info/${idn}/04`;  // Inhaltsverzeichnis
    const textUrl = `https://d-nb.info/${idn}/34`; // Inhaltstext
    const catalogUrl = `https://d-nb.info/${idn}`;

    // Verfügbarkeit prüfen
    const checkContent = async (url: string): Promise<boolean> => {
      try {
        const response = await fetch(url, { method: "HEAD" });
        return response.ok;
      } catch {
        return false;
      }
    };

    const tocAvailable = await checkContent(tocUrl);
    const textAvailable = await checkContent(textUrl);

    // Je nach Präferenz öffnen
    const openedUrls: string[] = [];
    
    if (preferences.contentType === "toc" || preferences.contentType === "both") {
      if (tocAvailable) {
        await open(tocUrl);
        openedUrls.push("Inhaltsverzeichnis");
      }
    }
    
    if (preferences.contentType === "text" || preferences.contentType === "both") {
      if (textAvailable) {
        await open(textUrl);
        openedUrls.push("Inhaltstext");
      }
    }

    // Feedback
    if (openedUrls.length > 0) {
      await showToast({
        style: Toast.Style.Success,
        title: `${openedUrls.join(" & ")} geöffnet`,
        message: `IDN: ${idn}`,
      });
    } else {
      // Fallback zum Katalog
      await open(catalogUrl);
      const available = [];
      if (tocAvailable) available.push("Verzeichnis verfügbar (/04)");
      if (textAvailable) available.push("Text verfügbar (/34)");
      
      await showToast({
        style: Toast.Style.Success,
        title: "Katalog-Eintrag geöffnet",
        message: available.length > 0 ? available.join(", ") : "Keine Inhalte verfügbar",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Fehler",
      message: error instanceof Error ? error.message : "Unbekannter Fehler",
    });
  }
}