---
title: 'YQL mashup with GWT'
date: Sun, 16 Nov 2008 22:40:04 +0000
draft: false
permalink: yql-mashup-with-gwt
tags: [gwt, java, javascript, programming]
---

Yahoo came up with YQL a few weeks ago, and I think it is a very interesting idea. It is basically a SQL-like language that allows developers to retrieve structured data from multiple Yahoo web services without having to deal with each service particularities; developers can query any service in a generic way, just like they would do retrieving rows and columns from a SQL database.

<!-- more -->

An example of YQL query to retrieve the 5 first results returned by the search engine with the keyword “pizza” would be:

```sql
select title, abstract from search.web where query="pizza"
```

which returns a response in the format that you specify (either XML or JSON) that includes some metadata about the query itself and the actual requested results in a format like this:

```json
"results": {
    "result": [
    {
     "abstract": "Official site for the international **pizza** chain, with online ordering, etc.",
     "title": "**Pizza** Hut"
    },
    {
     "abstract": "**...** site for the delivery chain offering thin crust, deep dish, etc.",
     "title": "Domino's **Pizza**"
    },
    ...
    ]
}
```

As you can see it is a very intuitive way to interact with web services (if only they were not all from Yahoo) for everybody that knows a bit of SQL.

If you want to try other queries or see examples of its use with other services you can use the [YQL Console](http://developer.yahoo.com/yql/console/).

Querying YQL with Google Web Toolkit
------------------------------------

So how would we query YQL with GWT? As it turns out, very easily. I'm going to create a GWT component that queries flickr through YQL and retrieves the first 9 occurrences related to the keyword entered in a textbox and presents them in a Grid, like the one on the left.

### Authentication

YQL uses 2-legged OAuth authentication like most OpenSocial containers, so we will have to have this into account when making the request. Fortunately there are good OAuth libraries available for every language. In my example I will use the ones made by Google, available at [http://oauth.googlecode.com](http://oauth.googlecode.com). I copied them to the /public folder and I referenced them from the module xml file instead of loading them directly in the html, which is more GWT-ish. 

When I browsed the web for OAuth libraries I stumbled upon [Paul Donnelly’s blog](http://paul.donnelly.org), who made a simple Javascript function for processing the parameters returned by OAUth libraries in the fashion that YQL wants, so instead of doing it with pure Java I took advantage of the toolkit’s JSNI classes and I just made a dumb OAuth class with a single static container method makeSignedRequest that wraPaul’s very slightly modified function so that it references the OAuth object properly.

### Calling back

Note: This section is explained in much more detail at [Dan Morrill’s JSON tutorial](http://code.google.com/support/bin/answer.py?answer=65632&topic=11368). 

Now that we have an OAuth class that will deal with the authentication, we only have to worry about the actual communication. Before getting our hands dirty with it, I will explain a bit some particularities of YQL and GWT that are necessary to get the mashup working properly. GWT doesn’t directly allow fetching JSON data from an external domain for security reasons (any JSON data is a Javascriobject after all, and although it should be used only for data transport, it can contain executable code as well), so I will use a [bridge method](http://code.google.com/support/bin/answer.py?answer=55954&topic=10213) setup to fetch it from Yahoo’s domain. 

When we send a request to YQL through OAuth, we send some important parameters with it: our personal YQL key and YQL secret (generated when we request a new application account), and the URL in which we specify the encoded query, the response format we want and the callback function name that YQL will use in its response. The request method looks like this:

```java
public void executeQuery(String keyword)
{
    String callback = this.reserveCallback();

    // Generate a function in the page with the known name we just created
    flyqlr.setup(this, callback);

    // Encode the URL using GWT's |URL.encode| and replace remaining unencoded characters
    String query = URL.encode("select * from flickr.photos.search where text = '" + keyword + "' limit 9")
                  .replaceAll("'", "%22").replaceAll("=", "%3D");

    // Makes the request using OAuth, which calls our just created callback
    // and adds the response as a scrito the page
    this.addScript(OAuth.makeSignedRequest(
        flyqlr.Y\_KEY, flyqlr.Y\_SECRET, flyqlr.YQL\_URL
            + "q=" + query + "&format=json" + "&callback=" + callback));
}
```

The first thing that the method does is to generate a unique name for our future function and pass it as a parameter to the setup static method, which is the JSNI “bridge” method mentioned above, and that looks like this:

```java
public native static void setup(flyqlr f, String callback) /*-{
  $wnd[callback] = function(data) {
    f.@com.sergi.client.flyqlr::process(Lcom/google/gwt/core/client/JavaScriptObject;)(data);
  }
}-*/;
```
This method creates a new function inside the window object ($wnd in JSNI slang) named after the callback parameter. This function calls the Java method process with a parameter data which contains the JSON string returned by YQL. When we know that our callback exists in the window we can safely compose the query and make the OAuth request. Notice that the latest parameter of the request string is callback, which tells YQL services our callback function’s name. The addScript method just creates a script tag and injects its argument as its content and appends the tag to the page which executes its contents straight away, thus executing our callback.

### Processing the response

At this point we have the JSON data returned by the YQL server, passed as a parameter to our process method, which looks like the following:

```java
public void process(JavaScriptObject jso)
{
    JSONObject json = new JSONObject(jso);
    JSONArray ary = json.get("query").isObject().get("results").isObject().get("photo").isArray();

    this.updateGrid(ary);
}
```

This method is pretty straightforward, it simply converts the JavaScriptObject to a JSON one so we can extract from it the specific information that we want in form of JSONArray and pass it to updateGrid, which renders the retrieved photos:

```java
public void updateGrid(JSONArray ary)
{
    for (int i = 0; i < ary.size(); ++i)
    {
    JSONObject photo = ary.get(i).isObject();

    Image img = new Image
        (   // Constructs the flickr image URL from JSON data
        "http://farm"+photo.get("farm").isString().stringValue() + ".static.flickr.com" +
        "/" + photo.get("server").isString().stringValue() +
        "/" + photo.get("id").isString().stringValue() +
        "\_" + photo.get("secret").isString().stringValue() +
        "\_s.jpg"
        );
    img.setWidth("75");
    this.theGrid.setWidget((int)Math.ceil(i/3), ((i+1) % 3), img);
    }
}
```

updateGrid constructs the 9 element grid and composes the flickr pictures URLs out of the data that we extracted from YQL. We are done!! 

Although I am not sure about using GWT to build a complete website, I love its potential for building independent small components that hook on any web page. Even with an example like the one above in which the request is not a direct Rcall from Java, AJAX is ridiculously easy to use from GWT, and it provides a whole set of widgets ready to use. Besides, there are very interesting and impressive addons to GWT like [GWT-Ext](http://code.google.com/p/gwt-ext) which boosts its possibilities on the UI side. This, and the goodness of developing the whole thing in one single robust language (most of the time) makes it a very attractive option for building web front-ends. 

[flyqlr.java](http://sergimansilla.com/public/flyqlr/flyqlr/src/com/sergi/client/flyqlr.java)  
[OAuth.java](http://sergimansilla.com/public/flyqlr/flyqlr/src/com/sergi/client/OAuth.java)