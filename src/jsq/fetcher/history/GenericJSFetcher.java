package jsq.fetcher.history;

import java.io.File;
import java.io.FileReader;
import java.util.Calendar;
import java.util.Date;
import java.util.List;

import org.htmlunit.SilentCssErrorHandler;
import org.htmlunit.ThreadedRefreshHandler;
import org.htmlunit.WebClient;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.NativeJavaObject;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import jsq.config.Config;
import jsq.fetch.factory.Factory;

public class GenericJSFetcher extends BaseFetcher {
	private Calendar start;  
	private Calendar stop;
	
	private Scriptable scope;

	private File scriptFile;
	private long modifiedTs;

	/**
	 * Create a new generic fetcher from the JavaScript file passed in {@code filename}.
	 * @param filename
	 * @throws Exception
	 */
	public GenericJSFetcher(String filename) throws Exception {
		try {
			this.scriptFile = new File(filename);
			reloadScriptIfNeeded();
		} catch (Exception e) {
			e.printStackTrace();
			throw e;
		}
	}
	
	private Context enterContext() {
		Context context = Context.enter();
		context.setLanguageVersion(Context.VERSION_ES6);
		context.setOptimizationLevel(-1);
		context.getWrapFactory().setJavaPrimitiveWrap(false);
		return context;
	}

	private void reloadScriptIfNeeded() throws Exception {
		if (scriptFile.lastModified() == modifiedTs)
			return;
		modifiedTs = scriptFile.lastModified();
		
		Context context = enterContext();
		
		scope = context.initStandardObjects();
		Object jsFetcher = Context.javaToJS(this, scope);
		ScriptableObject.putProperty(scope, "fetcher", jsFetcher);
		
		
		// print function is not part of default rhino
		context.evaluateString(scope, "function print() { "
				+ "Packages.jsq.fetcher.history.GenericJSFetcher.print(Array.from(arguments).map((x) => x.toString()).join(' '))"
				+ "}", "", 1, null);
	
		FileReader reader = new FileReader(scriptFile);
		context.evaluateReader(scope, reader, scriptFile.getName(), 1, null);
		
		context.exit();
	}
	
	public static void print(Object o) {
		System.out.println(o.toString());
	}

	@Override
	public String getName() {
		return (String) callFunc("getName", null);
	}

	@Override
	public String getURL() {
		return (String) callFunc("getURL", null);
	}

	public String getAPIVersion() {
		return (String) callFunc("getAPIVersion", null);
	}
	public String getVersion() {
		return (String) callFunc("getVersion", null);
	}

	@Override
	public void prepare(String search, int beginYear, int beginMon,
			int beginDay, int stopYear, int stopMon, int stopDay) throws Exception {
		reloadScriptIfNeeded();

		super.prepare(search, beginYear, beginMon, beginDay, stopYear, stopMon, stopDay);
		start = Calendar.getInstance();
		start.setTime(getStartdate());
		stop = Calendar.getInstance();
		stop.setTime(getStopdate());
		try {
			Object x = callFunc("prepare", new Object[] { this, search, beginYear, beginMon, beginDay, stopYear, stopMon, stopDay });
			setConfig((List<Config>) x);
		} catch (Exception e) {
			e.printStackTrace();
			throw e;
		}
	}
	
	
	@Override
	public void process(List<Config> options) {
		super.process(options);
			try {
				callFunc("process", new Object[] { options} );
			} catch (Exception e) {
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
		java.util.logging.Logger.getLogger("org").setLevel(java.util.logging.Level.OFF);
		return webClient;
	}
	
	public boolean within(Date d) {
		return (d.getTime() >= getStartdate().getTime()) &&
				(d.getTime() <= getStopdate().getTime());
	}
	
	public Object callFunc(String funcname, Object[] args) {
		try {
			Context context = enterContext();
			if (args == null)
				args = new Object[0];
			Function f = (Function) scope.get(funcname, scope);
			Object result = f.call(context, scope, f, args);
			if (result instanceof NativeJavaObject)
				result = ((NativeJavaObject) result).unwrap();
			return result;
		} catch (Exception e) {
			e.printStackTrace();
		} finally {
			Context.exit();
		}
		return null;
	}
	public void search(String string) {
		try {
			Context context = enterContext();
			Function f = (Function) scope.get("search", scope);
			f.call(context, scope, f, new Object[] { string });
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} finally {
			Context.exit();
		}
	}
}
