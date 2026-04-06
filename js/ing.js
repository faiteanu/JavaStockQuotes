// Script for Hibiscus Depot Viewer
// Original version by Maxr1998

var Logger = Packages.de.willuhn.logging.Logger;
var ArrayList = java.util.ArrayList;
var JDate = java.util.Date;
var BigDecimal = java.math.BigDecimal;

var fetcher;
var isin;
var exchangeCodeMap = {}

function getAPIVersion() {
    return "1";
};

function getVersion() {
    return "2026-03-21";
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
    isin = search;

    const webClient = fetcher.getWebClient(false);
    webClient.getOptions().setThrowExceptionOnFailingStatusCode(false);

    try {
        Logger.debug("Requesting time ranges");
        //const pageTimeRanges = webClient.getPage("https://component-api.wertpapiere.ing.de/api/v1/components-ng/chart?isins=" + isin);
        const pageTimeRanges = webClient.getPage("https://component-api.wertpapiere.ing.de/api/v1/components/charttool/" + isin);
        const responseTimeRanges = JSON.parse(pageTimeRanges.getWebResponse().getContentAsString());

        Logger.debug("Requesting exchanges and currency");
        const pageExchanges = webClient.getPage("https://component-api.wertpapiere.ing.de/api/v1/instrument-header?isinOrSearchTerm=" + isin + "&isKnownIsin=true&includeAvailableExchanges=true");
        const responseExchanges = JSON.parse(pageExchanges.getWebResponse().getContentAsString());
    }
    catch(error) {
        Logger.error("ISIN " + isin + " nicht gefunden bei " + getName());
    }

    // Zeitraum
    var historyConfig = new Packages.jsq.config.Config("Historie");
    const periods = responseTimeRanges["chartPeriodTranslations"];
    periods.forEach(period => {
        if (period["chartPeriod"] != "Intraday") {
            historyConfig.addAuswahl(period["translation"], period["chartPeriod"]);
        }
    });

    // Kursdetails: Hoch,Tief, Eröffnung
    var ohlcConfig = new Packages.jsq.config.Config("Kursdetails");
    ohlcConfig.addAuswahl("Keine", new Boolean(false));
    ohlcConfig.addAuswahl("Hoch-/Tief-/Eröffnungskurse", new Boolean(true));

    // Handelsplatz
    const exchanges = responseExchanges["exchanges"];
    Logger.debug("Found " + exchanges.length + " exchanges");

    var exchangeConfig = new Packages.jsq.config.Config("Handelsplatz");
    exchanges.forEach(exchange => {
        exchangeConfig.addAuswahl(exchange["exchangeName"], exchange["exchangeCode"]);
        Logger.debug("currency " + exchange["currencySymbol"] + " found at " + exchange["exchangeCode"] + " (" + exchange["exchangeName"] + ")");
        // remember infos of exchange for process()
        exchangeCodeMap[exchange["exchangeCode"]] = exchange;
    });

    var cfgliste = new ArrayList();
    cfgliste.add(historyConfig);
    cfgliste.add(ohlcConfig);
    cfgliste.add(exchangeConfig);

    return cfgliste;
}

function process(config) {
    // default config
    var history = "OneMonth";
    var ohlc = "";
    var exchange = {
        "exchangeCode": "TGT",
        "exchangeName": "Direkthandel",
        "exchangeId": 2779,
        "currencySymbol": "EUR",
        "currencyId": 814
    };
    // read from saved config
    for (i = 0; i < config.size(); i++) {
        var cfg = config.get(i);
        Logger.info(cfg.toString());
        for (j = 0; j < cfg.getSelected().size(); j++) {
            var o = cfg.getSelected().get(j);
            if (cfg.getBeschreibung().equals("Historie")) {
                history = o.getObj();
            } else if (cfg.getBeschreibung().equals("Handelsplatz")) {
                const exchangeCode = o.getObj();
                if (exchangeCode in exchangeCodeMap) {
                    exchange = exchangeCodeMap[exchangeCode];
                    Logger.debug("currency at exchange " + exchangeCode + " is " + exchange["currencySymbol"]);
                }
            } else if (cfg.getBeschreibung().equals("Kursdetails")) {
                ohlc = o.getObj().valueOf() ? "&ohlc=true" : "";
            }
        }
    }


    // Fetch data
    var res = new ArrayList();

    Logger.info("Fetching history " + history + " of " + isin + " at " + exchange["exchangeCode"]);
    const webClient = fetcher.getWebClient(false);
    //const url = "https://component-api.wertpapiere.ing.de/api/v1/charts/shm/" + isin + "?timeRange="+ history + "&exchangeId=" + exchangeId + "&currencyId=" + currencyId;
    const url = "https://component-api.wertpapiere.ing.de/api/v1/charts/charttooldata/" + isin + "?timeRange=" + history + "&exchangeId=" + exchange["exchangeId"] + "&exchangeCode=" + exchange["exchangeCode"] + "&currencyId=" + exchange["currencyId"] + ohlc;
    Logger.debug("request " + url)
    const page = webClient.getPage(url);
    const response = JSON.parse(page.getWebResponse().getContentAsString());
    const data = response["instruments"][0]["data"];
    const keys = response["instruments"][0]["keys"]; // meaning of elements in data ordered in the same way 
    const keyMapping = {"x": "date",
                        "y": "last",
                        "open": "first",
                        "high": "high",
                        "low": "low",
                        "close": "last"
    }; // translate keys to internal id in Datacontainer
    const noMapping = "nomapping"

    Logger.info("Fetched " + data.length + " results.");

    Logger.debug("keys=" + keys);
    let oldDate = new JDate();
    data.forEach(row => {
        // transform each row to a dict to match values with keys
        item = Object.fromEntries(
            keys.map((key, i) => [(key in keyMapping ? keyMapping[key] : noMapping), row[i]])
        );
        Logger.trace("item=" + JSON.stringify(item));
        // no need to consider response["instruments"][0]["currentTimezoneOffset"], since quotes are given in UTC
        const date = new JDate(item["date"]);

        // Ensure there's only one result per day; assume historyItems are sorted by date
        if (res.isEmpty() || (date.getDate() != oldDate.getDate())) {
            var dc = new Packages.jsq.datastructes.Datacontainer();
            Object.entries(item).forEach(([mappedKey, value]) => {
                if (!["date", noMapping].includes(mappedKey)) {
                    // add only values, where key could be mapped and is not date
                    dc.put(mappedKey, new BigDecimal(value));
                }
            });

            // if we found any value for mapable keys, we add the dc
            if (!dc.getMap().isEmpty()) {
                dc.put("currency", exchange["currencySymbol"]);
                dc.put("date", date);
                res.add(dc);
            }
        }
        oldDate = date;
    });

    if (res.length > 0) {
        Logger.info("Received " + res.length + " historic quotes.");
    }
    else {
        Logger.error("No historic quotes found. " + (data.length > 0 ? "Maybe key mapping has changed." : ""));
    }

    fetcher.setHistQuotes(res);
}
