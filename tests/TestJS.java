import static org.junit.Assert.assertNotNull;

import java.util.List;

import jsq.config.Config;
import jsq.fetcher.history.GenericJSFetcher;

import org.junit.Test;


public class TestJS {

	@Test
	public void testArivaAktie() throws Exception {
		//GenericJSFetcher fetcher = new GenericJSFetcher("js/finanzennet.js");
		GenericJSFetcher fetcher = new GenericJSFetcher("js/ariva.js");
		assertNotNull(fetcher);
		System.out.println(fetcher);
		//fetcher.prepare("LYX0AG", 2020, 12, 15, 2021, 1, 11);
		//fetcher.prepare("DE0007100000", 2013, 1, 15, 2013, 1, 31);
		//fetcher.prepare("US88160R1014", 2020, 1, 01, 2021, 1, 31); 
		//fetcher.prepare("LU0119124781", 1995, 1, 1, 2014, 6, 25);
		//fetcher.prepare("DE0005933931", 2000, 1, 1, 2021, 1, 13); 
		//fetcher.prepare("603474", 1995, 1, 1, 2014, 6, 25); 
		fetcher.prepare("XC0009655157", 2010, 1, 1, 2021, 1, 13);
		
		//LU0274211217 db x-tr.EO STOXX 50
		//fetcher.prepare("LU0274211217", 1995, 1, 1, 2014, 6, 25); // Fond
		while (fetcher.hasMoreConfig()) {
			List<Config> config = fetcher.getConfigs();
			// Set always the first option
			for (Config c : config) {
				System.out.println("Config " + c.toString());
				System.out.println("Setting " + c.getBeschreibung() + " to " + c.getOptions().get(0));
				c.addSelectedOptions(c.getOptions().get(0));
			}
			fetcher.process(config);
		}
		System.out.println("Quotes:");
		System.out.println(fetcher.getHistQuotes());
		System.out.println("HistEvents:");
		System.out.println(fetcher.getHistEvents());
		System.out.println("StockDetails");
		System.out.println(fetcher.getStockDetails());
		assertNotNull(fetcher.getStockDetails());
	}
	
	@Test
	public void testArivaEtf() throws Exception {
		//GenericJSFetcher fetcher = new GenericJSFetcher("js/finanzennet.js");
		GenericJSFetcher fetcher = new GenericJSFetcher("js/ariva.js");
		assertNotNull(fetcher);
		System.out.println(fetcher);
		//fetcher.prepare("A113FM", 2020, 12, 15, 2021, 1, 11);
		//fetcher.prepare("LYX0AG", 2020, 12, 15, 2021, 1, 11);
		//fetcher.prepare("DE0007100000", 2013, 1, 15, 2013, 1, 31);
//		fetcher.prepare("DE0007236101", 2013, 1, 15, 2013, 1, 31); 
		//fetcher.prepare("LU0119124781", 1995, 1, 1, 2014, 6, 25);
		fetcher.prepare("IE00B9CQXS71", 2021, 3, 1, 2021, 3, 8); 
		//fetcher.prepare("603474", 1995, 1, 1, 2014, 6, 25); 
		
		//LU0274211217 db x-tr.EO STOXX 50
		//fetcher.prepare("LU0274211217", 1995, 1, 1, 2014, 6, 25); // Fond
		while (fetcher.hasMoreConfig()) {
			List<Config> config = fetcher.getConfigs();
			// Set always the first option
			for (Config c : config) {
				System.out.println("Config " + c.toString());
				System.out.println("Setting " + c.getBeschreibung() + " to " + c.getOptions().get(0));
				c.addSelectedOptions(c.getOptions().get(0));
			}
			fetcher.process(config);
		}
		System.out.println("Quotes:");
		System.out.println(fetcher.getHistQuotes());
		System.out.println("HistEvents:");
		System.out.println(fetcher.getHistEvents());
		System.out.println("StockDetails");
		System.out.println(fetcher.getStockDetails());
		assertNotNull(fetcher.getStockDetails());
	}

	public static void main(String [] args) throws Exception {
		TestJS js = new TestJS();
		js.testArivaAktie();
		js.testArivaEtf();
	}

}
