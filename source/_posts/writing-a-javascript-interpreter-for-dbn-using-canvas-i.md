---
title: 'Writing a JavaScript interpreter for DBN using PEG.js and canvas (Part I)'
date: Tue, 03 Aug 2010 08:03:43 +0000
draft: false
permalink: writing-a-javascript-interpreter-for-dbn-using-canvas-i
tags: [canvas, dbn, html5, interpreter, javascript, javascript, language, lexer, parser, peg, pegjs, programming, token]
---

**_In this first part of the article, I will define a grammar for DBN (Design By Numbers) and generate a parser for it that outputs an AST (Abstract Syntax Tree), so I can interpret the syntax tree it later on with JavaScript and draw it into an HTML5 Canvas._** 

[John Maeda](http://en.wikipedia.org/wiki/John_Maeda) created the DBN language as a tool to teach programming to non-developers. It was quite an influential language; in fact it was the precursor of the popular [processing](http://en.wikipedia.org/wiki/Processing_%28programming_language%29) language, developed by Maeda’s students [Casey Reas](http://en.wikipedia.org/wiki/Casey_Reas) and Ben Fry, taking many ideas from DBN. Unfortunately, DBN (Design By Numbers) hasn’t been open-sourced and the documentation of it is almost nonexisting, let alone any official specification of the language. There is only [one book](http://www.amazon.com/Design-Numbers-John-Maeda/dp/0262632446) written about it (although a [blurry copy](http://books.google.com/books?id=cptXSf5kS_IC&printsec=frontcover&dq=design+by+numbers&hl=en&ei=9ShZTIDxLsu6OO6D1bAJ&sa=X&oi=book_result&ct=result&resnum=1&ved=0CCoQ6AEwAA#v=onepage&q&f=false) exists in google books, censored enough to miss very important parts), and the DBN software amounts to a [Java applet](http://dbn.media.mit.edu/dbn/applet.html) in the official website and a Java program that you can run on your own computer. All this lack of proper information was a challenge enough to get me interested on building a JavaScript interpreter for it (this, and my deep hatred for Java applets) and a good excuse to play with some cool JavaScript technologies.

Crash course in PEG.js grammar definitions
------------------------------------------

[PEG.js](http://pegjs.majda.cz/) is a parser generator for JavaScript. Given a proper grammar definition of the language, it will generate a parser for it that you can use wherever. If you want to quickly test the grammar output as you go, use [PEG.js online version](http://pegjs.majda.cz/online), it is immensely useful on the early stages of grammar definition. Also, keep in mind that what I explain here is a 10.000 foot overview of PEG.js and it is by no means a tutorial; if you want to learn real language grammar definition with PEG.js you **must** read the [real documentation](http://pegjs.majda.cz/documentation) for it, and have some idea about parsers, lexers, tokens and their friends.

### 1. Defining the basics

Before we start, one thing worth noting is that PEG.js doesn’t have a separate stage for “lexing”. The lexer is integrated seamlessly in the generated parser, so we don’t have to worry about it. Ok, so the first thing to do is to define the building blocks for the language. Note that the parser doesn’t take anything for granted, so we will have to define how our language handles whitespace as well.

```
variable
 = v:([a-zA-Z_][a-zA-Z0-9_]*) { // The first character must not be a number
     return {
       type: "string",
       value: v.join("")
     }
   }

integer
  = digits:[0-9]+ {
      return {
        type: "integer",
        value: parseInt(digits.join(""), 10)
      }
    }

point // Matches expressions of the form [value1 value2]
= "[" left:value ws right:value "]" {
    return {
        type: "point",
        x:left,
        y:right
      }
    }

special // Matches expressions of the form = "<" _ left:variable args:(ws value)+ ">" {
    return {
      type: "special",
      args: [left, args.map(function(a) { return a[1] })]
    }
  }

additive
  = left:muldiv _ sign:[+-] _ right:additive {
      return {
        type: "command",
        name:sign,
        args:[left,right]
      }
    }
  / muldiv

muldiv
  = left:primary _ sign:[*/] _ right:muldiv {
      return {
        type: "command",
        name: sign,
        args:[left, right]
      }
    }
  / primary

primary
 = (variable / integer / special)
 / "(" _ additive:additive _ ")" { return additive }

value
= variable / integer / additive / point / special

comment // Matches single-line comments
 = "//" (!lb .)*

ws
 = [ \\t]

_ // Matches any number of whitespace/comments in a row
 = (ws / comment)* 
```

As you can see, the language is very clear and takes inspiration from regular expressions. The above peg grammar defines strings, integers (DBN has no decimals), points in a 2D canvas, and basic arithmetic (the latter adapted from the arithmetic grammar given at the PEG.js site as example). A rule is composed of several parts: its name, the matching expression and the optional _parser action_, which is enclosed between brackets and transforms the output of the rule. For example, for the `point` rule:

```
point
 = "[" left:value ws right:value "]" // <-- This is the matching expression
   // The following code is the parser action
   {
     return {
       type: "point",
       x:left,
       y:right
     }
   }

```

This rule checks for a “[” character followed by a `value` rule (which is defined separately), followed by a whitespace rule (also defined separately), followed by another `value` rule and a closing “]”. In most non-trivial rules we include a _parser action_, which is the JavaScript code inside the brackets. The parser action can access the matched values of the rule and modify them using JavaScript before the output is returned. Here I return an object that contains the two values inside a point, which were labeled `left` and `right` in the matching expression so they are accessed from the parser action. Without a parser action the output would be a JavaScript array with all the matches in the matching expression, so with the input `[4 2]` we would get the output `[“[”, “a”, " “, ”b“, ”]"]`. The `point` rule references two other rules, `value` and `ws`, which look like this:

```
value // matches any of the standard values in DBN
= variable / integer / additive / point / special

ws // Matches space and tab characters
= [ \\t]

```

`value` will try to sequentially match any of the expressions separated by “/”, and it will return the first sucessful match. The whitespace `ws` rule uses a RegExp construct to match any single space or tab character.

### 2. DBN Commands

Now we will define the “meat” of our grammar. Fortunately enough, DBN is a language with a rather simple syntax. A basic program could look like this:

```
paper 30

repeat A 0 300
{
    pen 50
    line 0 55 100 55
    line 0 20 100 20

    pen 100
    line (A*2) 0 (A*2) 20
    line (A/3)  55 (A/3) 100
    paper 30
}

```

This program runs the instructions inside the `repeat` loop, which is equivalent to a classical `for` loop. It loops from 0 to 300 while assigning the current iteration value to the variable A and drawing different lines on the canvas. As we see above, a basic command in DBN takes the following form: **code>command_name value_1 value_2 value_n** And a rule `command` to parse it:

```
command
 = _ cmd:[A-Za-z0-9?]+ args:((ws+ value)+)? _ lb+ {
     return {
       type: "command",
       name: cmd.join("").toLowerCase(),
       args: args ? args.map(function(a) { return a[1] }) : null
     }
   }

```

Let’s break the matching expresion down: `_`  
Match 0 or more whitespace characters. `cmd:[A-Za-z0-9?]+`  
Match an alphanumeric word that might include the ‘?’ char, and label it as “cmd”. `args:((ws+ value)+)?`  
Match 0 or more DBN `value` expressions preceded by a whitespace and label them as “args”. `lb+`  
Match at least one linebreak. In case an expression `command` is matched, we will pass the `cmd` and the `args` results to the parsing expression, who will return an object with some particular properties that manipulate the values in the way we want. In that case we just do some basic filtering to the arrays resulting from the matches. An important thing to note down is that any match gotten using the operators `[]` `*` or `+` will return an array with as many coincidences as there are in the matching expression. That means that we will have to take care of filtering these arrays so we obtain the results we want. A clear example is the `cmd` variable, which returns an array with all the characters of the command name matched, so in the parsing expression we have to join it to form a real string.

### 3. DBN Blocks

Our grammar can already process DBN commands, but this is pretty limited functionality. Any interesting program will at least have loops and block commands, and we still can’t parse these. In order to process block commands we will create the new rules `block` and `block_command`:

```
block
 = "{" lb* e:(block_command / command)+ lb* _ "}" { return e }

block_command
 = e:command _ b:block lb* {
     e.block = b;
     return e;
}

```

In `block` we match any group of `commands` or nested `block_commands` that are inside braces, taking into account the possible whitespaces that we might find. In `block_command` the matching expression is very straightforward, but there is an interesting bit in the parsing expression, where we attach `b` to `c` as a property, and we return `c` after that, so the result is a JavaScript object with the properties `type`: “command”, array of parameters `args` and that `block` property we just added, which contains the commands inside the block.

### Conclusion

And we’re finished! Our grammar can now parse DBN programs and generate its JSON AST (Abstract Syntax Tree). Parsing the basic program that I wrote above as an example generates [this tree](http://gist.github.com/508528#file_ast.js). You can find the complete grammar file [here](http://github.com/sergi/Design-By-Canvas/blob/master/grammar.pegjs). As you can see, using PEG.js is a very clean and concise way to define language grammars. And best of all, we can use JavaScript for doing it which is pretty awesome. Moreover, the generated parser for it is pure JavaScript and thus independent from the PEG.js library itself. In fact, using the [online version](http://pegjs.majda.cz/online) of it, you can just download the generated parser without even having to download the library itself. I am sure very soon we will hear of apps that use PEG.js in very creative ways, surely involving [node](http://nodejs.org) (as it seems to be the trend now) or some other cool technologies. JavaScript is definitely ready for prime time. In the second part of this article I will create the interpreter that turns the AST into JavaScript code that paints directly into canvas. Stay tuned!