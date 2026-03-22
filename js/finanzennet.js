// Script for Hibiscus Depot Viewer
// Updated 03.01.2025 by @dirkhe
// Updated 18.01.2025 by @dirkhe - Logging added
// Updated 07.02.2026 by @jan-san

/** start date for historic rates when no min date is set on the input */
const DEFAULT_START_DATE = '2020-01-01';

var ArrayList = java.util.ArrayList;
let logger = Packages.de.willuhn.logging.Logger;

var fetcher;
var wc;
var boerseSelect;
var searchButton;
//var tablePath;

function getAPIVersion() {
  return "1";
}

function getVersion() {
  return "2026-03-18";
}

function getURL() {
  return "http://www.finanzen.net";
}

function getAktienSucheUrl(search) {
  return "http://www.finanzen.net/suchergebnis.asp?frmAktiensucheTextfeld=" + search;
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
  const url = getAktienSucheUrl(search);
  logger.debug("load " + url);
  page = wc.getPage(url);

  try {
    logger.debug("suche Link Kurse");
    links = page.getAnchorByText("Kurse");
    page = links.click();
    logger.debug("suche Select historic-prices-stock-market");
    boerseSelect = page.getElementById("historic-prices-stock-market");
    logger.debug("suche Button request-historic-price");
    searchButton = page.getElementById("request-historic-price");

    input = page.getElementById("fromDate");
    if (input.getMin()) {
      input.setValue(input.getMin());
    } else {
      input.setValue(DEFAULT_START_DATE);
    }

    input = page.getElementById("toDate");
    input.setValue(input.getMax());
  } catch (e) {
    logger.debug("versuche Alternative aufgrund " + e);
    try {
      logger.debug("suche Link historische Kurse");
      links = page.getAnchorByText("Historische Kurse");
      page = links.click();
    } catch (error) {
      logger.debug("versuche Alternative aufgrund " + error);
      try {
        logger.debug("suche Link Kurse & Realtime");
        links = page.getAnchorByText("Kurse & Realtime");
        page = links.click();
        logger.debug("suche Link historische Kurse");
        links = page.getAnchorByText("Historische Kurse");
        page = links.click();
      } catch (error2) {
        logger.debug("versuche Alternative aufgrund " + error2);
        // navigate to historic rates for "Zertifikate"
        logger.debug("suche Link Historisch");
        links = page.getAnchorByText("Historisch");
        page = links.click();
      }
    }
    try {
      try {
        logger.debug("suche Select strBoerse");
        boerseSelect = page.getElementByName("strBoerse");

        input = page.getElementByName("dtDate1");
        input.setValue(input.getMin());

        input = page.getElementByName("dtDate2");
        input.setValue(input.getMax());
      }
      catch (error2) {
        logger.debug("versuche Alternative aufgrund " + error2);
        logger.debug("suche Select exchange");
        boerseSelect = page.getElementByName("exchange");

        input = page.getElementByName("date-from");
        input.setValue(input.getMin());

        input = page.getElementByName("date-to");
        input.setValue(input.getMax());
      }

      logger.debug("suche search-Button");
      searchButton = boerseSelect.getFirstByXPath("../../div/button");
    } catch (error) {
      logger.debug("versuche Alternative aufgrund " + error);
      // retrieve historic rates for "Zertifikate"
      logger.debug("suche Select historic-prices-stock-market");
      boerseSelect = page.getElementById("historic-prices-stock-market");
      logger.debug("suche search-Button");
      searchButton = page.getElementById("request-historic-price");

      input = page.getElementById("derivative-historical-start-date");
      input.setValue(DEFAULT_START_DATE);

      input = page.getElementById("derivative-historical-end-date");
      input.setValue(input.getMax());
    }
  }

  var liste = new ArrayList();
  if (!page) {
    logger.error("Konnte Kurse Link nicht finden");
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

  logger.debug("extrahierte Handelsplätze: " + liste);
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
    logger.error("Börsenauswahl nicht gefunden");
  } else {
    option = boerseSelect.getOptionByValue(boerse);
    boerseSelect.setSelectedAttribute(option, true);
  }

  logger.debug("frage Kurse ab...")
  page = searchButton.click();
  wc.waitForBackgroundJavaScript(10000);
  tab = Packages.jsq.tools.HtmlUnitTools.getTableByPartContent(page, "Datum");
  if (!tab) {
    logger.error("Börsenauswahl nicht gefunden");
  } else {
    list = Packages.jsq.tools.HtmlUnitTools.analyse(tab);
    logger.info(list.size() + " Kurse gefunden");
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
        logger.error("Fehler beim Kurse auslesen: " + error + "\n" + hashmap);
      }
    }
  }
  fetcher.setHistQuotes(res);
}

function search(fetch, search) {
  fetcher = fetch;

  wc = fetcher.getWebClient(true);
  page = wc.getPage(getAktienSucheUrl(search));
}
