// Script for Hibiscus Depot Viewer
// Updated 02.04.2020 by @faiteanu
// Original version by @mikekorb

try {
	load("nashorn:mozilla_compat.js");
	var prejava8 = false;
	var ArrayList = Java.type('java.util.ArrayList');

} catch (e) {
	// Rhino
	var prejava8 = true;
	var ArrayList = java.util.ArrayList;
};

importPackage(Packages.de.willuhn.logging);

var fetcher;
var webClient;


var y1, m1, d1, y2, m2, d2;

function getAPIVersion() {
	return "1";
};

function getVersion() {
	return "2020-04-02";
};

function getName() {
	return "Ariva";
};

function getURL() {
	return "http://www.ariva.de";
};



function prepare(fetch, search, startyear, startmon, startday, stopyear, stopmon, stopday) {
	fetcher = fetch;
	y1 = startyear; m1 = startmon; d1 = startday;
	y2 = stopyear; m2 = stopmon; d2 = stopday;

	webClient = fetcher.getWebClient(false);
	page = webClient.getPage("https://www.ariva.de/search/search.m?searchname=" + search);

	links = page.getAnchorByText("Kurse");
	page = links.click();

	links = page.getAnchorByText("Historische Kurse");
	page = links.click();

	extractBasisdata(page);

	page.getElementById("clean_split").setChecked(false);
	page.getElementById("clean_payout").setChecked(false);
	page.getElementById("clean_bezug").setChecked(false);

	//page = Packages.jsq.tools.HtmlUnitTools.getFirstElementByXpath(page, "//input[@class='submitButton' and @value='Anwenden']").click();

	//Handelsplatz
	var cfgliste = new ArrayList();
	options = getLinksForSelection("handelsplatz", page);
	if (options.size() > 0) {
		var cfg = new Packages.jsq.config.Config("Handelsplatz");
		for (i = 0; i < options.size(); i++) {
			cfg.addAuswahl(options.get(i), new String("handelsplatz"));
		}
		cfgliste.add(cfg);
	}
	// Währung
	options = getLinksForSelection("waehrung", page);
	if (options.size() > 0) {
		var cfg = new Packages.jsq.config.Config("Währung");
		for (i = 0; i < options.size(); i++) {
			if (options.get(i).contains("wählen")) {
				continue;
			}
			cfg.addAuswahl(options.get(i), new String("waehrung"));
		}
		cfgliste.add(cfg);
	}

	return cfgliste;
};

function process(config) {
	print("Processing");
	defaultcur = "EUR";
	handelsplatz = "";
	for (i = 0; i < config.size(); i++) {
		var cfg = config.get(i);
		for (j = 0; j < cfg.getSelected().size(); j++) {
			var o = cfg.getSelected().get(j);
			if (o.getObj().toString().equals("waehrung")) {
				defaultcur = o.toString();
			}
			if (o.getObj().toString().equals("handelsplatz")) {
				handelsplatz = o.toString();
			}
			var found = 0;

			select = getSelect(o.getObj(), page);
			optionslist = select.getOptions();
			for (var k = 0; k < optionslist.size(); k++) {
				var option = optionslist.get(k);
				if (option.getText().trim().equals(o.toString())) {
					print("Selecting " + option.getText());
					option.setSelected(true);
					found = 1;
				}
			}
			if (found == 0) {
				print("Warnung: Link für " + o.getObj() + " nicht gefunden!");
			}
		}
	}
	defaultcur = Packages.jsq.tools.CurrencyTools.correctCurrency(defaultcur);
	page.getElementById("minTime").setText(d1 + "." + m1 + "." + y1);
	page.getElementById("maxTime").setText(d2 + "." + m2 + "." + y2);

	//	submit = Packages.jsq.tools.HtmlUnitTools.getFirstElementByXpath(page, "//input[@class='submitButton' and @value='OK']");
	//	page = submit.click();

	submit = Packages.jsq.tools.HtmlUnitTools.getFirstElementByXpath(page, "//input[@class='submitButton' and @value='Download']");
	text = submit.click();
	evalCSV(text.getContent(), defaultcur);


	try {
		link = page.getAnchorByText("Historische Ereignisse");
	} catch (e) {
		Logger.info("Historische Ereignisse nicht gefunden");
		return;
	}

	//Logger.info("Link:" + link.asXml());
	try {
		page = link.click();
		page.getElementById("clean_split").setChecked(false);
		extractEvents(page, handelsplatz);
	} catch (e) {
		Logger.error("Historische Ereignisse nicht geladen: " + e);
	}

};


function extractEvents(page, handelsplatz) {

	var dict = {};
	dict["Gratisaktien"] = Packages.jsq.datastructes.Const.STOCKDIVIDEND;
	dict["Dividende"] = Packages.jsq.datastructes.Const.CASHDIVIDEND;
	dict["Ausschüttung"] = Packages.jsq.datastructes.Const.CASHDIVIDEND;
	dict["Split"] = Packages.jsq.datastructes.Const.STOCKSPLIT;
	dict["Bezugsrecht"] = Packages.jsq.datastructes.Const.SUBSCRIPTIONRIGHTS;

	//	{Datum=30.04.01, Verhältnis=2:1, Betrag=, Ereignis=Gratisaktien}
	//	{Datum=23.02.01, Verhältnis= , Betrag=0,82 EUR, Ereignis=Dividende}
	//	{Datum=04.01.99, Verhältnis=0,51129, Betrag=, Ereignis=Euro-Umstellung}
	//	{Datum=02.05.96, Verhältnis=1:10, Betrag=, Ereignis=Split}
	//	{Datum=29.07.91, Verhältnis=6:1, Betrag=20,45 EUR, Ereignis=Bezugsrecht}
	//	{Datum=31.01.14, Verhältnis= , Betrag=3,98 EUR, Ereignis=Ausschüttung}

	tab = Packages.jsq.tools.HtmlUnitTools.getElementByPartContent(page, "Datum", "table");
	list = Packages.jsq.tools.HtmlUnitTools.analyse(tab);

	var res = new ArrayList();
	for (i = 0; i < list.size(); i++) {
		hashmap = list.get(i);
		if (hashmap.get("Ereignis") == "Euro-Umstellung") {
			continue;
		}

		// filter date range
		d = Packages.jsq.tools.VarTools.parseDate(hashmap.get("Datum"), "dd.MM.yy");
		if (!fetcher.within(d)) {
			continue;
		}

		var dc = new Packages.jsq.datastructes.Datacontainer();
		// Teilweise unterscheiden sich die Termine nach Handelsplätzen
		if (hashmap.get("Handelsplätze") != null && hashmap.get("Handelsplätze") != "") {
			hp = java.util.Arrays.asList(hashmap.get("Handelsplätze").split(", "))
			if (!hp.contains(handelsplatz)) {
				// Nicht unser Handelsplatz
				continue;
			}
		}
		dc.put("date", d);
		dc.put("ratio", hashmap.get("Verhältnis"));
		action = dict[hashmap.get("Ereignis")];
		if (typeof action === "undefined") {
			println("Undef für " + hashmap);
		}
		dc.put("action", action);
		cur = null;
		amount = null;
		if (hashmap.get("Betrag") != null && hashmap.get("Betrag") != "") {
			betrag = hashmap.get("Betrag").split(" ");
			amount = Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(betrag[0]);
			cur = betrag[1];
		}
		dc.put("value", amount);
		dc.put("currency", cur);
		res.add(dc);
	}
	fetcher.setHistEvents(res);

}



function evalCSV(content, defaultcur) {
	var records = Packages.jsq.tools.CsvTools.getRecordsFromCsv(";", content);
	var res = new ArrayList();
	for (i = 0; i < records.size(); i++) {
		var record = records.get(i);
		var dc = new Packages.jsq.datastructes.Datacontainer();
		dc.put("date", Packages.jsq.tools.VarTools.parseDate(record.get("Datum"), "yyyy-MM-dd"));
		dc.put("first", Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(record.get("Erster")));
		dc.put("last", Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(record.get("Schlusskurs")));
		dc.put("low", Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(record.get("Tief")));
		dc.put("high", Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(record.get("Hoch")));
		dc.put("currency", defaultcur);
		res.add(dc);
	}
	fetcher.setHistQuotes(res);
}

function getSelect(search, page) {
	return page.getFirstByXPath("//select[contains(@class, '" + search + "')]");
}

function getLinksForSelection(search, page) {
	var ret = new ArrayList();
	select = getSelect(search, page);
	if (select) {
		optionslist = select.getOptions();
		for (var i = 0; i < optionslist.size(); i++) {
			var div = optionslist.get(i);
			content = div.getText().trim();
			ret.add(content);
		}
	}
	return ret;
}

function extractBasisdata(page) {
	var dc = new Packages.jsq.datastructes.Datacontainer();

	wkn = Packages.jsq.tools.HtmlUnitTools.getElementByPartContent(page, "WKN:", "div");
	dc.put("wkn", wkn.getTextContent().split(" ")[1]);

	isin = Packages.jsq.tools.HtmlUnitTools.getElementByPartContent(page, "ISIN:", "div");
	dc.put("isin", isin.getTextContent().split(" ")[1]);

	name = Packages.jsq.tools.HtmlUnitTools.getFirstElementByXpath(page, "//h1");
	dc.put("name", name.getTextContent().trim());
	fetcher.setStockDetails(dc);
}

