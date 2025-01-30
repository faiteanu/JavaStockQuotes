// Script for Hibiscus Depot Viewer
// Updated 03.01.2025 by @dirkhe
// Updated 18.01.2025 by @dirkhe - Logging added

var ArrayList = java.util.ArrayList;

var fetcher;
var wc;
var boerseSelect;
var searchButton;
//var tablePath;

function getAPIVersion() {
  return "1";
}

function getVersion() {
  return "2025-01-18";
}

function getDate(year, month, day) {
  return new java.util.Date(year - 1900, month - 1, day);
}

function getURL() {
  return "http://www.finanzen.net";
}

function getName() {
  return "Finanzen.net";
}

function prepare(
  fetch,
  search,
  startyear,
  startmon,
  startday,
  stopyear,
  stopmon,
  stopday
) {
  fetcher = fetch;

  wc = fetcher.getWebClient(true);
  wc.getOptions().setThrowExceptionOnFailingStatusCode(false);
  Packages.de.willuhn.logging.Logger.debug("load  http://www.finanzen.net/suchergebnis.asp?frmAktiensucheTextfeld=" + search);
  page = wc.getPage(
    "http://www.finanzen.net/suchergebnis.asp?frmAktiensucheTextfeld=" + search
  );

  try {
    Packages.de.willuhn.logging.Logger.debug("suche Link Kurse");
    links = page.getAnchorByText("Kurse");
    page = links.click();
    Packages.de.willuhn.logging.Logger.debug("suche Select historic-prices-stock-market");
    boerseSelect = page.getElementById("historic-prices-stock-market");
    Packages.de.willuhn.logging.Logger.debug("suche Button request-historic-price");
    searchButton = page.getElementById("request-historic-price");

    input = page.getElementById("fromDate");
    input.setValue(input.getMin());

    input = page.getElementById("toDate");
    input.setValue(input.getMax());
  } catch (e) {
    try {
      Packages.de.willuhn.logging.Logger.debug("suche Link historische Kurse");
      links = page.getAnchorByText("Historische Kurse");
      page = links.click();
    } catch (error) {      
      Packages.de.willuhn.logging.Logger.debug("suche Link Kurse & Realtime");
      links = page.getAnchorByText("Kurse & Realtime");
      page = links.click();
      Packages.de.willuhn.logging.Logger.debug("suche Link historische Kurse");
      links = page.getAnchorByText("Historische Kurse");
      page = links.click();
    }
    Packages.de.willuhn.logging.Logger.debug("suche Select strBoerse");
    boerseSelect = page.getElementByName("strBoerse");
    Packages.de.willuhn.logging.Logger.debug("suche search-Button");
    searchButton = boerseSelect.getFirstByXPath("../../div/button");

    input = page.getElementByName("dtDate1");
    input.setValue(input.getMin());

    input = page.getElementByName("dtDate2");
    input.setValue(input.getMax());
  }

  var liste = new ArrayList();
  if (!page) {
    Packages.de.willuhn.logging.Logger.error("Konnte Kurse Link nicht finden");
  } else {
    // Handelsplätze extrahieren
    
    var cfg = new Packages.jsq.config.Config("Handelsplatz");
    var listeHandelsplaetze = boerseSelect.getOptions(); // List of HtmlOption
    for (var i = 0; i < listeHandelsplaetze.size(); i++) {
      var platz = listeHandelsplaetze.get(i);
      cfg.addAuswahl(platz.getText(), platz.getValueAttribute());
    }
    liste.add(cfg);   
  }


  return liste;
}

function process(config) {
  var res = new ArrayList();
  var currency = "EUR";
  var boerse = "";
  for (i = 0; i < config.size(); i++) {
    var cfg = config.get(i);
    for (j = 0; j < cfg.getSelected().size(); j++) {
      var o = cfg.getSelected().get(j);
      if (cfg.getBeschreibung().equals("Handelsplatz")) {
        boerse = o.getObj().toString();
      } /* else if (cfg.getBeschreibung().equals("waehrung")) {
		currency = o.getObj().toString();
	  }*/
    }
  }

  if (!boerseSelect) {
    Packages.de.willuhn.logging.Logger.error("Börsenauswahl nicht gefunden");
  } else {
    option = boerseSelect.getOptionByValue(boerse);
    boerseSelect.setSelectedAttribute(option, true);
  }

  page = searchButton.click();
  wc.waitForBackgroundJavaScript(10000);
  tab = Packages.jsq.tools.HtmlUnitTools.getTableByPartContent(page, "Datum");
  if (!tab) {
    Packages.de.willuhn.logging.Logger.error("Börsenauswahl nicht gefunden");
  } else {
    list = Packages.jsq.tools.HtmlUnitTools.analyse(tab);
    Packages.de.willuhn.logging.Logger.info(list.size() + " Kurse gefunden");

    
    for (i = 0; i < list.size(); i++) {
      try {
        hashmap = list.get(i);
        last = hashmap.get("Schluss");
        if (!last || last.equals("-")) {
          // happens for the current day
          continue;
        }
        var dc = new Packages.jsq.datastructes.Datacontainer();
        dc.put(
          "date",
          Packages.jsq.tools.VarTools.parseDate(
            hashmap.get("Datum"),
            "dd.MM.yyyy"
          )
        );
        dc.put(
          "first",
          Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(
            hashmap.get("Eröffnung") || ""
          )
        );
        dc.put(
          "last",
          Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(last)
        );
        dc.put(
          "low",
          Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(
            hashmap.get("Tagestief") || ""
          )
        );
        dc.put(
          "high",
          Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(
            hashmap.get("Tageshoch") || ""
          )
        );
        dc.put("currency", currency);
        res.add(dc);
      } catch (error) {
        Packages.de.willuhn.logging.Logger.error("Fehler beim Kurse auslesen: " + error + "\n" + hashmap);
      }
    }
  }
  fetcher.setHistQuotes(res);
}

function search(fetch, search) {
  fetcher = fetch;

  wc = fetcher.getWebClient(true);
  page = wc.getPage(
    "http://www.finanzen.net/suchergebnis.asp?frmAktiensucheTextfeld=" + search
  );
}