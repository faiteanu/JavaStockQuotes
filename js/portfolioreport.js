// Script for Hibiscus Depot Viewer
// Original version by b3nn0
// Updated 17.12.2024 by dirkhe and faiteanu
// Updated 18.01.2025 by dirkhe

var ArrayList = java.util.ArrayList;
var Logger = Packages.de.willuhn.logging.Logger;

var fetcher;
var webClient;


var s,y1,m1,d1,y2,m2,d2;

function getAPIVersion() {
	return "1";
};

function getVersion() {
	return "2025-01-18";
};

function getName() {
	return "PortfolioReport";
};

function getURL() {
	return "https://www.portfolio-report.net/";
};



function prepare(fetch, search, startyear, startmon, startday, stopyear, stopmon, stopday) {
	Logger.info("prepare...");
	fetcher = fetch;
	s = search;
	y1 = startyear; m1 = startmon; d1 = startday;
	y2 = stopyear; m2 = stopmon; d2 = stopday;

    var cfgliste = new ArrayList();

	// Währung
	var currencies = new Packages.jsq.config.Config("Waehrung");
	currencies.addAuswahl("EUR", new String("waehrung"));
	currencies.addAuswahl("USD", new String("waehrung"));

	cfgliste.add(currencies);

	return cfgliste;
}

function process(config) {
	Logger.info("process...");
	var currency = "EUR";
	for (i = 0; i < config.size(); i++) {
			var cfg = config.get(i);
			for (j = 0; j < cfg.getSelected().size(); j++) {
				var o = cfg.getSelected().get(j);
				if (cfg.getBeschreibung().equals("waehrung")) {
          			currency = o.toString();
        		}
			}
		}

	var webClient = fetcher.getWebClient(false);

	var page = webClient.getPage("https://api.portfolio-report.net/v1/securities/search?q=" + s);
	var json = JSON.parse(page.getWebResponse().getContentAsString());
	var uuid = json[0]["uuid"];

	var startDate = new Date(y1, m1, d1);

	var start = startDate.toISOString().substring(0, 10);
	page = webClient.getPage("https://api.portfolio-report.net/securities/uuid/" + uuid + "/prices/" + currency + "?from=" + start);
	var jsondata = page.getWebResponse().getContentAsString();

	var data = JSON.parse(jsondata);

	var res = new ArrayList();
	for (var i = 0; i < data.length; i++) {
		var price = data[i];
		var dc = new Packages.jsq.datastructes.Datacontainer();
		dc.put("currency", currency);
		dc.put("date", Packages.jsq.tools.VarTools.parseDate(price["date"], "yyyy-MM-dd"));
		dc.put("last", Packages.jsq.tools.VarTools.stringToBigDecimal(price["close"]));

		//dc.put("first", Packages.jsq.tools.VarTools.stringToBigDecimal(record.get("Open")));
		//dc.put("last", Packages.jsq.tools.VarTools.stringToBigDecimal(price["close"]));
		//dc.put("low", Packages.jsq.tools.VarTools.stringToBigDecimal(record.get("Low")));
		//dc.put("high", Packages.jsq.tools.VarTools.stringToBigDecimal(record.get("High")));
		//dc.put("currency", defaultcur);
		res.add(dc);
	}
	fetcher.setHistQuotes(res);
}
