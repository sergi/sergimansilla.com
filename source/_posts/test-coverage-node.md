---
title: 'Add code coverage to your Node.js projects'
date: Wed, 19 Jun 2013 21:13:00 +0000
draft: false
tags: [coverage, istanbul, javascript, lcov, node.js, programming, testing]
---

**Note: This blog post is inspired on [Xavier Seignard's blog post](http://xseignard.github.io/2013/04/25/quality-analysis-on-node.js-projects-with-mocha-istanbul-and-sonar/). He gives a longer introduction on it, and integrates it together with [Sonar](http://www.sonarqube.org/). You should check it out.**

Code coverage is convenient to get an overview of how well-tested your program is. I'm going to show you how to set up code coverage using [Mocha](http://visionmedia.github.io/mocha/), [Istanbul](https://github.com/gotwarlost/istanbul) and [LCOV](http://ltp.sourceforge.net/coverage/lcov.php) in two easy steps.

<!-- more -->

Step 1: Install dependencies
----------------------------

First we'll install [LCOV](http://ltp.sourceforge.net/coverage/lcov.php), which is a graphical frontend for the `gcov` tool and can parse the output of code coverage `info` files. The gcov format is a universal format for code coverage stats.

In OSX (using [homebrew](http://mxcl.github.io/homebrew/)):

```
brew install lcov
```

In linux (Ubuntu):

```
apt-get install lcov
````

 Declare the remaining dependencies in the `package.json` of your project:

```json
"devDependencies": {
  "mocha": "~1.10.0",
  "istanbul": "~0.1.36",
  "mocha-istanbul": "~0.2.0"
}
```

Step 2: Set up a Makefile
-------------------------

With everything installed, we just need to automate generation of the coverage report. I am using a `Makefile` to do that, but it could be a simple script. After all, it is just executing bash commands.

Create a file named `Makefile` in the root of our project folder and declare some variables containing the location of executables and a filter for test files:

```bash
#!/bin/bash

MOCHA=node\_modules/.bin/mocha
ISTANBUL=node\_modules/.bin/istanbul
# test files must end with ".test.js"
TESTS=$(shell find test/ -name "\*.test.js")
```

Next, we make a case for generating a coverage report:

```bash
coverage:
# check if reports folder exists, if not create it
@test -d reports || mkdir reports
$(ISTANBUL) instrument --output lib-cov lib
# move original lib code and replace it by the instrumented one
mv lib lib-orig && mv lib-cov lib
# tell istanbul to only generate the lcov file
ISTANBUL\_REPORTERS=lcovonly $(MOCHA) -R mocha-istanbul $(TESTS)
# place the lcov report in the report folder,
# remove instrumented code and put back lib at its place
mv lcov.info reports/
rm -rf lib
mv lib-orig lib genhtml reports/lcov.info --output-directory reports/
```

In the preceding code, Istanbul instruments our source code in the `lib` folder, so anything outside of `lib` won't be taken into account by the report. The original folder is not modified, just renamed temporarily while the report is generated. Next, `lib` is restored to its original name and we get rid of other folders generated in the process.

You should change `lib` to the location of your source code.

As a nice final touch, we can add two extra actions to our Makefile, `clean` and `test`:
```bash
clean:
rm -rf reports

test:
$(MOCHA) -R spec $(TESTS)
```
With this, we now have available a `coverage` action in the Makefile, and we can execute the following in the root of our project folder:
```
make coverage
```
and Istanbul will generate a complete report in the `report` folder. You can now go there and open `index.html` to see your coverage by lines, functions and files.

Happy testing!