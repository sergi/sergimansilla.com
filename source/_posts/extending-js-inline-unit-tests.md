---
title: 'Extending JavaScript with inline unit tests'
date: Sat, 09 Nov 2013 21:56:57 +0000
draft: false
permalink: extending-js-inline-unit-tests
tags: [javascript, macros, programming, pyret, racket, sweetjs, testing]
---

I’ve been checking out [Pyret](http://www.pyret.org), the new language from the same guys that made [Racket](http://racket-lang.org/). Even if it is designed to be for education, it has a syntax I love and some really cool features, like the possibility of adding in-line unit tests to your functions.

This feature in particular looks like this:

```
fun square(n):
  n * n
where:
  square(2) is 4
  square(4) is 16
  square(8) is 64 1+1
end
```

Neat, huh? The `where` clause opens up the block of unit tests for that function, which are executed at run-time.

So obviously I decided to give it a try and implement something similar for JavaScript using [sweet.js](http://sweetjs.org/). This allows me to kill two birds with one stone because I have also been meaning to catch up with the latest developments that sweet.js has made [since last year](https://speakerdeck.com/sergi/extending-javascript-the-easy-way) (among other improvements, we can now rewrite reserved keywords in our macros!).

The objective is to be able to write something like this in JavaScript:

```js
function square(n) {
  return n * n;
} where {
  square(2) is 4 square(3) is 5
}
```

This code should execute the assertions as soon as we load the JavaScript file, and throw exceptions (or warn us somehow) in case the tests don't pass.

After wrestling a little bit with the syntax and some misleading error messages I came up with the following macro:

```
let function = macro {
  rule {
    $name ($params ...) {
      $body ...
    } where {
      $($wname($wparams ...) is $val)
      ...
    }
  } => {
    function $name ($params ...) {
      $body ...
    }
    (function(){
      function assert(condition, message) {
        if (!condition) {
          throw message || "Assertion failed";
        }
      }
      (assert($($wname ($wparams ...)) === $val)) (;) ...
    })()
  }
  rule {_ $name ($params ...) { $body ...} } => {
    function $name ($params ...) {
      $body ...
    }
  }
}
```

This allows us to keep the current syntax for function definitions, but also add a case that accepts our new `where` syntax. The generated JavaScript for the `square` function above looks then like this:

```js
function square(n$5588) {
  return n$5588 * n$5588;
} (function () {
  function assert(condition$5589, message$5590) {
    if (!condition$5589) {
      throw message$5590 || 'Assertion failed';
    }
  }
  assert(square(2) === 4); assert(square(3) === 5);
}());
```

And so we have some rudimentary unit testing for functions in JavaScript! Time to eat a reward cookie.

Caveats
-------

This macro was made in less than 20 minutes, so consider it as a very quick-and-dirty solution, and it has a few caveats:

*   It doesn't give the nice errors that Pyret gives.
*   It will only accept expressions in the form `function(param) is expression`, so it is limited in expressivity (I believe that Pyret does the same, though)

I will keep playing with sweet.js to make the macro more robust, as it could become pretty helpful when it is more complete. Anyhow, please keep in mind that this is not code you should use in production right away! But I hope it shows the power of macros in JavaScript. And this was even a very simple one.

Using macros
------------

I believe macros and sweet.js shouldn't be in libraries intended to be used by third parties without careful consideration, but that being said, they are definitely a powerful weapon for using in internal code. A good example is to use them in unit tests suites, internal DSLs, build tooling or other utilities.

I will also not enter the debate of whether people using macros to extend JavaScript is a good idea :) It is fun for sure, though!

Kudos to Mozilla and [Tim Disney](https://github.com/disnet) for coming up with such a cool project.

P.S. Upon checking on Tim's Github projects I found out that he is actually working on a contract library for JavaScript, [contracts.js](https://github.com/disnet/contracts.js). Check it out!

**Update:** Tim suggested to use `rule` instead of `case`, since our scenario doesn't need the complexity that `case` offers. He also suggested to provide the `assert` function inside the IIFE. I updated the code with these suggestions.