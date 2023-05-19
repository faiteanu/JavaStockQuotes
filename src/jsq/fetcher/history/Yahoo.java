package jsq.fetcher.history;

import java.io.IOException;
import java.io.StringReader;
import java.net.URLEncoder;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import jsq.config.Config;
import jsq.datastructes.Datacontainer;
import jsq.fetch.factory.Factory;
import jsq.tools.HtmlUnitTools;
import jsq.tools.VarTools;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import org.htmlunit.FailingHttpStatusCodeException;
import org.htmlunit.Page;
import org.htmlunit.SilentCssErrorHandler;
import org.htmlunit.TextPage;
import org.htmlunit.ThreadedRefreshHandler;
import org.htmlunit.UnexpectedPage;
import org.htmlunit.WebClient;
import org.htmlunit.html.HtmlPage;
import org.htmlunit.html.HtmlTable;

public class Yahoo extends BaseFetcher  {

	private String history = "http://ichart.finance.yahoo.com/table.csv?ignore=.csv"
			+ "&s=%1$s" 
			+ "&a=%2$s&b=%3$s&c=%4$s&d=%5$s&e=%6$s&f=%7$s&g=d"; 

	private WebClient webClient;

	private String currency;

	
	@Override
	public String getName() {
		return "Yahoo Finance!";
	}	
	
	@Override
	public String getURL() {
		return "http://www.yahoo.de";
	}	
	
	/**
	 * 
	 * @param wkn
	 * @return
	 * @throws Exception 
	 */
	@Override
	public void prepare(String search, int beginYear, int beginMon, int beginDay, int stopYear, int stopMon, int stopDay) throws Exception {
		super.prepare(search, beginYear, beginMon, beginDay, stopYear, stopMon, stopDay);
		webClient = new WebClient();
		if (Factory.getProxyConfig() != null) {
			webClient.getOptions().setProxyConfig(Factory.getProxyConfig());
		}
		webClient.setCssErrorHandler(new SilentCssErrorHandler());
		webClient.setRefreshHandler(new ThreadedRefreshHandler());
		webClient.getOptions().setJavaScriptEnabled(false); 
		try {
			HtmlPage page = webClient.getPage("https://de.finance.yahoo.com/q?s=" +  URLEncoder.encode(search, "UTF-8") + "&ql=1");

			HtmlTable datatable = HtmlUnitTools.getTableByPartContent(page, "Ticker");
			if (datatable == null) {
				throw new IllegalStateException("Table 'Hist. Ereignisse' not found!");
			}

			List<? extends Map<String, String>> liste = HtmlUnitTools.analyse(datatable);

			List<Config> configs = new ArrayList<Config>();
			Config config = new Config("Handelsplatz");
			for (Map<String, String> x : liste) {
				config.addAuswahl(x.get("Börsenplatz") + " [" + x.get("Ticker") + "]",
						x.get("Ticker"));
			}
			configs.add(config);
			setConfig(configs);

		} catch (FailingHttpStatusCodeException | IOException e) {
			e.printStackTrace();
		} finally {
		}

	}
	@Override
	public void process(List<Config> config) {
		super.process(config);
		try {
			String ticker = URLEncoder.encode((String) config.get(0).getSelected().get(0).getObj(), "UTF-8");
			getData(ticker);


			Date start = getStartdate();
			Date stop = getStopdate();
			String url = String.format(history, ticker, 
					start.getMonth(), start.getDate(), start.getYear() + 1900,
					stop.getMonth(), stop.getDate(), stop.getYear() + 1900);
			TextPage page = webClient.getPage(url);
			evalCSV(page.getContent(), currency);
		} catch (FailingHttpStatusCodeException  | IOException e) {
			e.printStackTrace();
		}
	}
	
	private void evalCSV(String s, String defaultcur) throws IOException {
		DateFormat df = new SimpleDateFormat("yyyy-MM-dd", Locale.GERMAN);
		CSVFormat format = CSVFormat.RFC4180.withHeader().withDelimiter(',').withIgnoreEmptyLines(true);
		CSVParser parser = new CSVParser(new StringReader(s), format);
		ArrayList<Datacontainer> resultQuotes = new ArrayList<Datacontainer>();
		for(CSVRecord record : parser){
			Datacontainer dc = new Datacontainer();
			try {
				dc.data.put("date", df.parse(record.get("Date")));
				dc.data.put("first", VarTools.stringToBigDecimal(record.get("Open")));
				dc.data.put("last", VarTools.stringToBigDecimal(record.get("Close")));
				dc.data.put("low", VarTools.stringToBigDecimal(record.get("Low")));
				dc.data.put("high", VarTools.stringToBigDecimal(record.get("High")));
				dc.data.put("currency", defaultcur);
				resultQuotes.add(dc);
			} catch (ParseException e) {
				e.printStackTrace();
			}
		}
		setHistQuotes(resultQuotes);
		parser.close();
	}


	private void getData(String ticker) throws FailingHttpStatusCodeException, IOException {
		UnexpectedPage page = webClient.getPage("http://de.finance.yahoo.com/d/quotes.csv?s=" + ticker + "&f=c4n0s");
		CSVFormat format = CSVFormat.RFC4180.withHeader().withDelimiter(',').withIgnoreEmptyLines(true);
		CSVParser parser = new CSVParser(new StringReader("c4,n0,s\n" + page.getWebResponse().getContentAsString()), format);
		List<CSVRecord> records = parser.getRecords();
		if (records.size() == 0) {
			parser.close();
			return;
		}
		currency = records.get(0).get("c4");
		Datacontainer dc = new Datacontainer();
		dc.put("name", records.get(0).get("n0"));
		dc.put("ticker", records.get(0).get("s"));
		setStockDetails(dc);
		parser.close();
	}

	
}
