
var ArrayList = java.util.ArrayList;

var fetcher; 
var wc;


function getAPIVersion() {
	return "1";
}

function getVersion() {
	return "2014-06-25";
}

function getDate(year, month, day) {
	return new java.util.Date(year-1900, month - 1, day);
}

function getURL() {
	return "http://www.finanzen.net";
};


function getName() {
	return "Finanzen.net";
};


function prepare(fetch, search, startyear, startmon, startday, stopyear, stopmon, stopday) {
	fetcher = fetch;
	
	wc = fetcher.getWebClient(true);
	page = wc.getPage("http://www.finanzen.net/suchergebnis.asp?frmAktiensucheTextfeld="+search);
	links = page.getAnchorByText("Historisch");
	page = links.click();
	
	// Handelsplätze extrahieren
	var liste = new ArrayList();
	var cfg = new Packages.jsq.config.Config("Handelsplatz");
	select = page.getElementByName("strBoerse"); // HtmlSelect Object
	listeHandelsplaetze = select.getOptions(); // List of HtmlOption
	for (var i=0; i<listeHandelsplaetze.size(); i++) {
	    var platz = listeHandelsplaetze.get(i);
	    cfg.addAuswahl(platz.getText(), platz.getValueAttribute());
	}
	liste.add(cfg);

	// Datum setzen
	select = page.getElementByName("inJahr1"); // HtmlSelect Object
	option = select.getOptionByValue(startyear);
	select.setSelectedAttribute(option, true);
	
	select = page.getElementByName("inMonat1"); // HtmlSelect Object
	option = select.getOptionByValue(startmon);
	select.setSelectedAttribute(option, true);

	select = page.getElementByName("inTag1"); // HtmlSelect Object
	option = select.getOptionByValue(startday);
	select.setSelectedAttribute(option, true);

	
	select = page.getElementByName("inJahr2"); // HtmlSelect Object
	option = select.getOptionByValue(stopyear);
	select.setSelectedAttribute(option, true);
	
	select = page.getElementByName("inMonat2"); // HtmlSelect Object
	option = select.getOptionByValue(stopmon);
	select.setSelectedAttribute(option, true);

	select = page.getElementByName("inTag2"); // HtmlSelect Object
	option = select.getOptionByValue(stopday);
	select.setSelectedAttribute(option, true);
	return liste;
};

function process(config) {

	select = page.getElementByName("strBoerse"); // HtmlSelect Object
	option = select.getOptionByValue(config.get(0).getSelected().get(0).getObj());
	select.setSelectedAttribute(option, true);
	
	buttons = page.getByXPath("//div[@class='button']");
	page = buttons.get(0).click();
	wc.waitForBackgroundJavaScript(20000);
	tab =  getElementByStartText(page.getByXPath("//table"), "Datum");
	list = Packages.jsq.tools.HtmlUnitTools.analyse(tab);
	
	var res = new ArrayList();
	for (i = 0; i < list.size(); i++) {
		hashmap = list.get(i);
		if (hashmap.get("Schluss").equals("-")) { // happens for the current day
			continue;
		}
		var dc = new Packages.jsq.datastructes.Datacontainer();
		dc.put("date", Packages.jsq.tools.VarTools.parseDate(hashmap.get("Datum"), "dd.MM.yyyy"));
		dc.put("first", Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(hashmap.get("Eröffnung")));
		dc.put("last", Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(hashmap.get("Schluss")));
		dc.put("low", Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(hashmap.get("Tagestief")));
		dc.put("high", Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(hashmap.get("Tageshoch")));
		dc.put("currency", "EUR");
		res.add(dc);
	}
	fetcher.setHistQuotes(res);
};

function getElementByStartText(elements, search) {
	for (var i=0; i < elements.size(); i++) {
	    var e = elements.get(i);
	    if (e.asText().substring(0, search.length) == search) {
	    	return e;
	    }
	}
	return null;
}

function search(fetch, search) {
	fetcher = fetch;
	
	wc = fetcher.getWebClient(true);
	page = wc.getPage("http://www.finanzen.net/suchergebnis.asp?frmAktiensucheTextfeld="+search);
	
}