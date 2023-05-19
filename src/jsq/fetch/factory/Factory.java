package jsq.fetch.factory;

import java.net.InetSocketAddress;
import java.util.ArrayList;
import java.util.List;

import org.htmlunit.ProxyConfig;

import jsq.fetcher.history.BaseFetcher;
import jsq.fetcher.history.GenericJSFetcher;
import jsq.fetcher.history.Yahoo;

public class Factory {

	private static ProxyConfig pc;

	private static List<BaseFetcher> historylist;

	public synchronized static List<BaseFetcher> getHistoryFetcher() {
		if (historylist == null) {
			historylist = new ArrayList<BaseFetcher>();
			historylist.add(new Yahoo());
		}
		return historylist;
	}

	public synchronized static  void setProxy(String host, int port) {
	      pc = new ProxyConfig();
	      pc.setProxyHost(host);
	      pc.setProxyPort(port);
	}
	
	public synchronized static ProxyConfig getProxyConfig() {
		return pc;
	}
	
	public synchronized static void addJSFetcher(String string) throws Exception {
		if (historylist == null) {
			getHistoryFetcher();
		}
		historylist.add(new GenericJSFetcher(string));
	}
	
	public synchronized static void addJavaFetcher(BaseFetcher n) {
		List<BaseFetcher> liste = getHistoryFetcher();
		liste.add(n);
	}
}
