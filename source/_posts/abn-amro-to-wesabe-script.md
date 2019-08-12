---
title: 'ABN Amro to Wesabe script'
date: Wed, 25 Feb 2009 22:37:40 +0000
draft: false
permalink: abn-amro-to-wesabe-script
tags: [programming]
---

[Wesabe](http://www.wesabe.com) is a great service. And a very big part of its greatness resides in the fact that it retrieves your bank accounts data automatically from their sources whenever you log in into the page.

That is, if you don’t have a Dutch bank account.

The reason for this is that the security of Internet banking in The Netherlands is quite strong, probably much more than the ones in the US (where most Wesabe users are from). Every bank customer owns a little device in which you have to put your bank card in, type your PIN number, type a number given to you by the bank website, and type back the code calculated by the device. Only then you can access your personal bank website. Once in the site, you will have to repeat this process for every transaction or order that you make.

I much rather prefer this increased security when it comes to Internet banking as it adds an extra layer of security that makes it much more difficult to hack illegally into people’s bank accounts, but this also means that Wesabe (obviously) won’t be able to access the data in my bank website automatically.

Thus, the process for the suffered dutch-account-owners/Wesabe users (category in which I happen to fall in), is the following:

*   Download [ABN Amro’s](http://www.abnamro.nl) own QIF (Quicken Interchange Format) format for transactions
*   Convert it to QIF (Quicken Interchange Format)
*   Log into Wesabe
*   Upload the QIF (Quicken Interchange Format) file
*   Enter my account current balance manually, for it is not stored in the QIF (Quicken Interchange Format) file

No need to say that this is a very annoying and time consuming process…

So, after having to do that for the nth time, I decided to write a python script to automatize the process as much as I could. The process now becomes:

*   Download ABN Amro’s own CSV format for transactions
*   Execute script

Which is slightly a less annoying process to me. Its usage is dead simple:
```
>abn2wesabe.py STATEMENTFILE.TAB
```
You can look at the script source code [here](http://code.google.com/p/assorted-scripts/source/browse/trunk/abn2wesabe.py) or download it directly from [here](http://assorted-scripts.googlecode.com/svn/trunk/abn2wesabe.py).

Many thanks to [Johan Kool](http://www.johankool.nl), who gave me permission to me use part of his [ABN Amro 2 QIF Converter](http://www.johankool.nl/software/abnamro2qif/") script to convert ABN bank statements to QIF (Quicken Interchange Format) files. 

**Disclaimer**: This script does not check the validity of the certificate issued by Wesabe, so if any virus, malware, or plain user stupidity causes it to do damage of ANY kind to a computer or a human being, I will accept no responsibility for it. In other words: this software **could** post your financial data to undesired sites, delete all the files in your computer, insult you, burn your house and cause all kinds of innumerable misfortunes to whomever uses it, and I don’t want to be the one to blame. If you are afraid of using it, don’t. You are warned.