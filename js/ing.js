// Script for Hibiscus Depot Viewer
// Original version by Maxr1998

var Logger = Packages.de.willuhn.logging.Logger;
var ArrayList = java.util.ArrayList;
var JDate = java.util.Date;
var BigDecimal = java.math.BigDecimal;

var fetcher;
var s;

function getAPIVersion() {
    return "1";
};

function getVersion() {
    return "2025-01-31";
};

function getName() {
    return "ING Wertpapiere";
};

function getURL() {
    return "https://wertpapiere.ing.de";
};

function prepare(fetch, search, startyear, startmon, startday, stopyear, stopmon, stopday) {
    Logger.info("Configuring...");
    fetcher = fetch;
    s = search;

    var cfgliste = new ArrayList();

    // Zeitraum
    var timeRange = new Packages.jsq.config.Config("Zeitraum");
    timeRange.addAuswahl("Eine Woche", new String("OneWeek"));
    timeRange.addAuswahl("Ein Monat", new String("OneMonth"));
    timeRange.addAuswahl("Ein Jahr", new String("OneYear"));
    timeRange.addAuswahl("Fuenf Jahre", new String("FiveYears"));
    timeRange.addAuswahl("Maximum", new String("Maximum"));

    // Handelsplatz
    var exchange = new Packages.jsq.config.Config("Handelsplatz");
    exchange.addAuswahl("Direkthandel", new String("2779"));
    exchange.addAuswahl("Xetra", new String("44"));
    exchange.addAuswahl("Frankfurt", new String("13"));
    exchange.addAuswahl("Duesseldorf", new String("14"));
    exchange.addAuswahl("Muenchen", new String("15"));
    exchange.addAuswahl("Stuttgart", new String("16"));
    exchange.addAuswahl("Hamburt", new String("17"));
    exchange.addAuswahl("Berlin", new String("18"));
    exchange.addAuswahl("Hannover", new String("19"));
    exchange.addAuswahl("USA (Nasdaq)", new String("537"));

    cfgliste.add(timeRange);
    cfgliste.add(exchange);

    return cfgliste;
}

function process(config) {
    var timeRange = "OneYear";
    var exchange = "2779" // Direkthandel
    for (i = 0; i < config.size(); i++) {
        var cfg = config.get(i);
        Logger.info(cfg.toString());
        for (j = 0; j < cfg.getSelected().size(); j++) {
            var o = cfg.getSelected().get(j);
            if (cfg.getBeschreibung().equals("Zeitraum")) {
                timeRange = o.getObj();
            } else if (cfg.getBeschreibung().equals("Handelsplatz")) {
                exchange = o.getObj();
            }
        }
    }

    var webClient = fetcher.getWebClient(false);

    Logger.info("Fetching metadata for " + s);

    // Fetch ID
    var page = webClient.getPage("https://component-api.wertpapiere.ing.de/api/v1/components/instrumentheader/" + s);
    var metadata = JSON.parse(page.getWebResponse().getContentAsString());
    var id = metadata["id"];

    Logger.info("Stock " + s + " has ID " + id + ", fetching prices...");

    // Fetch data
    page = webClient.getPage("https://component-api.wertpapiere.ing.de/api/v1/charts/shm/" + id + "?timeRange=" + timeRange + "&exchangeId=" + exchange + "&currencyId=814");
    var response = JSON.parse(page.getWebResponse().getContentAsString());
    var data = response["instruments"][0]["data"];

    Logger.info("Fetched " + data.length + " results.");

    if (data.length === 0) {
        fetcher.setHistQuotes(new ArrayList());
        return;
    }

    var res = new ArrayList();
    for (var i = 1; i < data.length; i++) {
        var dataPoint = data[i - 1];
        var date = new JDate(dataPoint[0]);
        var price = new BigDecimal(dataPoint[1]);
        var newDate = new JDate(data[i][0]);
        // Ensure there's only one result per day
        if (date.getDay() != newDate.getDay()) {
            var dc = new Packages.jsq.datastructes.Datacontainer();
            dc.put("currency", "EUR");
            dc.put("date", date);
            dc.put("last", price);
            res.add(dc);
        }
    }
    fetcher.setHistQuotes(res);
}
