JavaStockQuotes
===============

Java libary for fetching historical stock quotes.

It supports JavaScript Plugins to add more sources.

The information are returned as a List of Datacontainer (HashMap)

Used Labels for Quotes:

|Name | Description | Java Class | Format |
| --- | --- | --- | --- |
|	date|Date		|Date
|	first|First Price    |BigDecimal
|	last|       Last Price		|BigDecimal
|	low |         Lowest trade|	BigDecimal
|	high |        Highest trade |BigDecimal
|	currency	| Currency | String | three letter code, see ISO 4217

Used Labels for Events:

|Name | Description | Java Class | Format |
| --- | --- | --- | --- |
|	date|Date		|Date |
|	ratio| Split Ratio    | String | x:y (e.g. "8:7") 
|	value|	| BigDecimal
|	currency	| Currency  |String|three letter code, see ISO 4217
|	action |         |	String | See jsq.datastructes.Const for Strings


# Referenzen
Diese Bibliothek wird verwendet vom [Hibiscus Depot Viewer](https://github.com/littleyoda/hibiscus.depotviewer).