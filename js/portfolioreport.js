var ArrayList = java.util.ArrayList;
var Logger = Packages.de.willuhn.logging.Logger;

var fetcher; 
var webClient;


var s,y1,m1,d1,y2,m2,d2;

function getAPIVersion() {
	return "1";
};

function getVersion() {
	return "2024-02-25";
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
    return new ArrayList();
}

function process(config) {
	Logger.info("process...");
	var webClient = fetcher.getWebClient(false); 

	var page = webClient.getPage("https://api.portfolio-report.net/securities/search/" + s);
	var json = JSON.parse(page.getWebResponse().getContentAsString());
	var uuid = json[0]["uuid"];

	var startDate = new Date(y1, m1, d1);

	var start = startDate.toISOString().substring(0, 10);
	page = webClient.getPage("https://api.portfolio-report.net/securities/uuid/" + uuid + "/markets/XETR?from=" + start);
	var jsondata = page.getWebResponse().getContentAsString();

	var data = JSON.parse(jsondata);

	var currency = data["currencyCode"];

	var res = new ArrayList();
	for (var i = 0; i < data["prices"].length; i++) {
		var price = data["prices"][i];
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

