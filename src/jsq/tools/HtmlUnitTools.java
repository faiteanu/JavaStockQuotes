package jsq.tools;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import org.htmlunit.html.DomElement;
import org.htmlunit.html.HtmlElement;
import org.htmlunit.html.HtmlPage;
import org.htmlunit.html.HtmlTable;
import org.htmlunit.html.HtmlTableRow;

public class HtmlUnitTools {

	/**
	 * Searches a Table that TextContent starts with startstring
	 * [table.getTextContent().trim().startsWith(startstring)]
	 * 
	 * @param page Page
	 * @return HTML Table or null if not found
	 */
	public static HtmlTable getTableByPartContent(HtmlPage page, String startstring) {
		List<DomElement> tablelist = page.getElementsByTagName("table");
		for (DomElement table : tablelist) {
			if (table.getTextContent().trim().startsWith(startstring)) {
				return (HtmlTable) table;
			}
		}
		return null;
	}

	/**
	 * Searches a Table that TextContent starts with startstring
	 * [table.getTextContent().trim().startsWith(startstring)]
	 * 
	 * @param page Page
	 * @return HTML Table or null if not found
	 */
	public static HtmlElement getElementByPartContent(HtmlPage page, String startstring, String tagname) {
		List<DomElement> tablelist = page.getElementsByTagName(tagname);
		for (DomElement table : tablelist) {
			if (table.getTextContent().trim().startsWith(startstring)) {
				return (HtmlElement) table;
			}
		}
		return null;
	}

	/**
	 * Puts the content of a table in a list of hashmap.
	 * One Hashmap for each row
	 * 
	 * @param datatable
	 * @return 
	 */
	public static List<HashMap<String, String>> analyse(HtmlTable datatable) {
		List<HashMap<String, String>> liste = new ArrayList<HashMap<String, String>>();
		int rows = datatable.getRows().size();
		HtmlTableRow header = datatable.getRows().get(0);
		for (int idx = 1; idx < rows; idx++) {
			HashMap<String, String> hash = new HashMap<String, String>();
			HtmlTableRow row = datatable.getRows().get(idx);
			if (row.getCells().size() != header.getCells().size()) {
				System.out.println("Spalten der aktuellen Zeile stimmten mit den Zeilen des Kopfes nicht überein." + row.getTextContent());
				continue;
			}
			for (int i = 0; i < row.getCells().size(); i++) {
				String d = row.getCells().get(i).getTextContent().trim();
				hash.put(header.getCells().get(i).getTextContent().trim(), 
						 (d.equals("") ? null : d));
			}
			liste.add(hash);
		}
		return liste;
	}

	public static HtmlElement getFirstElementByXpath(HtmlPage page, String xpath) {
		List x = page.getByXPath(xpath);
		if (x.size() == 0) {
			return null;
		}
		return (HtmlElement) x.get(0);
	}

	
}
