package jsq.fetcher.history;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.util.Calendar;
import java.util.Date;
import java.util.List;

import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;

import jsq.config.Config;
import jsq.fetch.factory.Factory;

import com.gargoylesoftware.htmlunit.SilentCssErrorHandler;
import com.gargoylesoftware.htmlunit.ThreadedRefreshHandler;
import com.gargoylesoftware.htmlunit.WebClient;

public class GenericJSFetcher extends BaseFetcher {

	private Invocable inv;
	
	
	private Calendar start;  
	private Calendar stop; 

	/**
	 * Create a new generic fetcher from the JavaScript file passed in {@code filename}.
	 * @param filename
	 * @throws Exception
	 */
	public GenericJSFetcher(String filename) throws Exception {
		try {
			File f = new File(filename);
			ScriptEngineManager manager = new ScriptEngineManager(null);  
			ScriptEngine engine = manager.getEngineByName("nashorn");
			engine.put("fetcher", this);
			engine.eval( new InputStreamReader(new FileInputStream(f),"utf-8"));

			inv = (Invocable) engine;  

		} catch (Exception e) {
			e.printStackTrace();
			throw e;
		}
	}
	@Override
	public String getName() {
		return (String) callFunc("getName");
	}

	@Override
	public String getURL() {
		return (String) callFunc("getURL");
	}

	public String getAPIVersion() {
		return (String) callFunc("getAPIVersion");
	}
	public String getVersion() {
		return (String) callFunc("getVersion");
	}

	@Override
	public void prepare(String search, int beginYear, int beginMon,
			int beginDay, int stopYear, int stopMon, int stopDay) throws Exception {
		super.prepare(search, beginYear, beginMon, beginDay, stopYear, stopMon, stopDay);
		start = Calendar.getInstance();
		start.setTime(getStartdate());
		stop = Calendar.getInstance();
		stop.setTime(getStopdate());
		try {
			Object x = inv.invokeFunction("prepare", this, search, beginYear, beginMon, beginDay, stopYear, stopMon, stopDay);
			setConfig((List<Config>) x);
		} catch (NoSuchMethodException | ScriptException e) {
			e.printStackTrace();
			throw e;
		}
	}
	
	
	@Override
	public void process(List<Config> options) {
		super.process(options);
			try {
				inv.invokeFunction("process", options);
			} catch (NoSuchMethodException | ScriptException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
	}

	public WebClient getWebClient(boolean useJavaScript) {
		WebClient webClient = new WebClient();
		if (Factory.getProxyConfig() != null) {
			webClient.getOptions().setProxyConfig(Factory.getProxyConfig());
		}
		webClient.setCssErrorHandler(new SilentCssErrorHandler());
		webClient.setRefreshHandler(new ThreadedRefreshHandler());
		webClient.getOptions().setJavaScriptEnabled(useJavaScript);
		webClient.getOptions().setThrowExceptionOnScriptError(false);
		java.util.logging.Logger.getLogger("com.gargoylesoftware").setLevel(java.util.logging.Level.OFF);
		return webClient;
	}
	
	public boolean within(Date d) {
		return (d.getTime() >= getStartdate().getTime()) &&
				(d.getTime() <= getStopdate().getTime());
	}
	
	public Object callFunc(String funcname) {
		try {
			return inv.invokeFunction(funcname);
		} catch (NoSuchMethodException | ScriptException e) {
			e.printStackTrace();
		} 
		return null;
	}
	public void search(String string) {
		try {
			inv.invokeFunction("search", this, string);
		} catch (NoSuchMethodException | ScriptException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
}
