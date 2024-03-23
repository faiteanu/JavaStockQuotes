// Script for Hibiscus Depot Viewer
// Updated 05.10.2022 by @faiteanu
// Original version by @mikekorb
// Hotfix 21.03.2023 Karl Heesch
// Hotfix 07.03.2024 @gnampf1


var Logger = Packages.de.willuhn.logging.Logger;
var ArrayList = java.util.ArrayList;

var fetcher; 
var webClient;
var url;
var kursUrl;
var secu;	// KH: zugefügt

var y1,m1,d1,y2,m2,d2;

function getAPIVersion() {
	return "1";
};

function getVersion() {
	return "2024-03-07";
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
	url = getURL();

	try {
		page = webClient.getPage(url + "/user/login/?ref=Lw==");
		form = page.getHtmlElementById("kc-form-login");
		form.getInputByName("username").type("MeinUserName"); // Hier Username eintragen
		form.getInputByName("password").type("MeinPasswort"); // Hier Passwort eintragen
		page = page.getHtmlElementById("submit").click();
	} catch (error) {
		Logger.info("Error on Login: " + error);
		Logger.info("Page war " + page.asXml());
	}

	var cfgliste = new ArrayList();
	

	page = webClient.getPage(url + "/search/livesearch.m?searchname=" + search);
	
	secu = page.getContent().match(/<input type="hidden" id="liveSearchRowAG1" value="([^"]+)"/)[1];	// KH: hinzugefügt.

	var link = page.getContent().match(/<a href="([^"]+)"/);
	if (link){
		if(link[1].indexOf("secu=") > 0){
			// fonds use a different URL from shares
			kursUrl = url + "/quote/historic.m?" + link[1].substring(link[1].indexOf("secu="));		
		}else{
			url += link[1];
			kursUrl = url + "/historische_kurse";			
		}
      	print(kursUrl);
		page = webClient.getPage(kursUrl);
		extractBasisdata(page);

		//Handelsplatz
		
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
				if (options.get(i).includes("wählen")) {
					continue;
				}
				cfg.addAuswahl(options.get(i), new String("waehrung"));
			}
			cfgliste.add(cfg);
		}

	}
	return cfgliste;
};

function process(config) {
	print("Processing");
	var defaultcur = "EUR";
	var handelsplatz = "";
	var boerse_id="";
	var currency_id="";
	//var secu = "";

	for (i = 0; i < config.size(); i++) {
		var cfg = config.get(i);
		for (j = 0; j < cfg.getSelected().size(); j++) {
			var o = cfg.getSelected().get(j);
			if (o.getObj().toString().equals("waehrung")) {
				defaultcur = o.toString(); 
				var found = 0;
            
				select = getSelect(o.getObj(), page);
				optionslist = select.getOptions(); 
				for (var k = 0; k < optionslist.size(); k++) {
					var option = optionslist.get(k);
					if (option.getText().trim().equals(o.toString())) {
						print("Selecting " + option.getText());
						currency_id = option.getValueAttribute();
						option.setSelected(true);
						found = 1;
					}
				}
				if (found == 0) {
					print("Warnung: Link für " + o.getObj() + " nicht gefunden!");
				}
			} else if (o.getObj().toString().equals("handelsplatz")) {
				handelsplatz = o.toString(); 
				var found = 0;
            
				select = getSelect(o.getObj(), page);
				optionslist = select.getOptions(); 
				for (var k = 0; k < optionslist.size(); k++) {
					var option = optionslist.get(k);
					if (option.getText().trim().equals(o.toString())) {
						print("Selecting " + option.getText());
						boerse_id= option.getValueAttribute();
						option.setSelected(true);
						found = 1;
					}
				}
				if (found == 0) {
					print("Warnung: Link für " + o.getObj() + " nicht gefunden!");
				}
			}
		}
	}
	if (boerse_id){
    	//var histUrl= getURL() + "/quote/historic/historic.csv?secu=" + Packages.jsq.tools.HtmlUnitTools.getFirstElementByXpath(page, "//input[@name='secu']").getValueAttribute() 
    	var histUrl= getURL() + "/quote/historic/historic.csv?secu=" + secu		// KH: Zeile geändert
			+ "&boerse_id=" + boerse_id + "&clean_split=0&clean_payout=0&clean_bezug=0&currency=" + currency_id + "&min_time=" + d1 + "." + m1 + "." + y1 
			+"&max_time=" + d2 + "." + m2 + "." + y2 + "&trenner=%3B&go=Download";
    	print(histUrl);
		text = webClient.getPage(histUrl);
    	defaultcur = Packages.jsq.tools.CurrencyTools.correctCurrency(defaultcur);
		evalCSV(text.getContent(), defaultcur);
	}
	extractEvents(page, handelsplatz);

};


function extractEvents(page, handelsplatz) {

	var dict = {};
	dict["Gratisaktien"] = Packages.jsq.datastructes.Const.STOCKDIVIDEND;
	dict["Dividende"] = Packages.jsq.datastructes.Const.CASHDIVIDEND;
	dict["Ausschüttung"] = Packages.jsq.datastructes.Const.CASHDIVIDEND;
	dict["Split"] = Packages.jsq.datastructes.Const.STOCKSPLIT;
	dict["Allg. Korrektur"] = Packages.jsq.datastructes.Const.STOCKSPLIT;
	dict["Reverse Split"] = Packages.jsq.datastructes.Const.STOCKREVERSESPLIT;
	dict["Bezugsrecht"] = Packages.jsq.datastructes.Const.SUBSCRIPTIONRIGHTS;

	if(kursUrl.indexOf("secu=") > 0){
		// fonds use a different URL from shares
		eventUrl = getURL() + "/quote/kapitalmassnahmen.m?clean_split=0&" + kursUrl.substring(kursUrl.indexOf("secu="));		
	}else{
		eventUrl = url + "/dividende-split/?clean_split=0";
	}
	
  	print(eventUrl);
	page = webClient.getPage(eventUrl);
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

		// filter events with neither ratio nor amount
		if ((hashmap.get("Verhältnis") == null || hashmap.get("Verhältnis").trim() == "") && (hashmap.get("Betrag") == null || hashmap.get("Betrag") == "")) {
			continue;
		}

		var dc = new Packages.jsq.datastructes.Datacontainer();
		// Teilweise unterscheiden sich die Termine nach Handelsplätzen
		if (hashmap.get("Handelsplätze") != null && hashmap.get("Handelsplätze") != "") {
			hp =  java.util.Arrays.asList(hashmap.get("Handelsplätze").split(", "))
			if (!hp.contains(handelsplatz)) {
				// Nicht unser Handelsplatz
				continue;
			}
		}
		dc.put("date", d);
		var ratio = hashmap.get("Verhältnis");
		if(ratio !== undefined && ratio.trim() !== "" && ratio.indexOf(":") < 0){
			// convert float to ratio with colon
			ratio = Packages.jsq.tools.VarTools.stringToBigDecimalGermanFormat(ratio).toString() + ":1";
		}
		dc.put("ratio", ratio);
		action = dict[hashmap.get("Ereignis")];
		if (typeof action === "undefined") {
			print("Undef für " + hashmap);
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



function evalCSV(content, defaultcur)  {
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
	print(records.size() + " Kurse geladen");
	fetcher.setHistQuotes(res);
}

function getSelect(search,  page) {
	return page.getFirstByXPath("//select[contains(@class, '"  + search + "')]");
}

function getLinksForSelection(search,  page) {
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
	wkn && dc.put("wkn", wkn.getTextContent().trim().split(" ")[1]);
	
	isin = Packages.jsq.tools.HtmlUnitTools.getElementByPartContent(page, "ISIN:", "div");
	isin && dc.put("isin", isin.getTextContent().split(" ")[1]);

	name = Packages.jsq.tools.HtmlUnitTools.getFirstElementByXpath(page, "//h1");
	name && dc.put("name", name.getTextContent().trim());
	fetcher.setStockDetails(dc);
}

