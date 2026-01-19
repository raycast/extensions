import { showToast, Toast, open, LaunchProps } from "@raycast/api";

interface Arguments {
  isbn: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { isbn } = props.arguments;

  if (!isbn) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Keine ISBN angegeben",
      message: "Bitte gib eine ISBN ein",
    });
    return;
  }

  const cleanIsbn = isbn.replace(/[-\s]/g, "");

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
    title: "Suche Inhaltsverzeichnis...",
  });

  try {
    const searchUrl = `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=isbn%3D${cleanIsbn}&recordSchema=MARC21-xml&maximumRecords=1`;
    const response = await fetch(searchUrl);
    const xmlText = await response.text();
    const idnMatch = xmlText.match(/<controlfield tag="001">(\d+X?)<\/controlfield>/);
    
    if (!idnMatch) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Buch nicht gefunden",
      });
      return;
    }

    const idn = idnMatch[1];
    const tocUrl = `https://d-nb.info/${idn}/04`;
    
    const tocCheck = await fetch(tocUrl, { method: "HEAD" });
    
    if (tocCheck.ok) {
      await open(tocUrl);
      await showToast({
        style: Toast.Style.Success,
        title: "Inhaltsverzeichnis geöffnet",
        message: `IDN: ${idn}`,
      });
    } else {
      await open(`https://d-nb.info/${idn}`);
      await showToast({
        style: Toast.Style.Success,
        title: "Katalog geöffnet",
        message: "Kein Inhaltsverzeichnis verfügbar",
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