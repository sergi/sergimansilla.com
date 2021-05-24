---
title: 'Real World Observables'
date: Tue, 03 May 2016 18:33:21 +0000
draft: false
tags: [ftp, javascript, node.js, nodejs, observables, programming, repl, rxjs]
---

Reactive code examples can be mind-blowing. Powerful, succint, robust...they seem to handle many concurrency scenarios without breaking a sweat. But let's be honest, examples from 30-minute conference talks and short blog posts rarely reflect the messy real world™.

In any case, developers get all pumped up about reactive goodness and want to use it in their projects. Alas, they quickly find out that it's not all reactive unicorns and rainbows, and that thinking of state in traditional programs as a sequence of events is not trivial.

I will attempt to shed some light on how to do that by writing a real world example in a few lines of RxJS: An FTP client.

<!-- more -->

An FTP client??
---------------

What is this, an article for dinosaurs? Are we also going to write it in COBOL, and use punch cards?? Go ahead, laugh at my choice for a "real world" program. I'll wait. The venerable FTP protocol should have died an honorable death long time ago, and it's admittedly pretty awful by today's standards. But hey, it's 2016 and FTP is still here, clinging to life and still used for transferring files all around the world. And it's an easy enough protocol to understand (disclaimer: I implemented [a popular FTP library for Node](http://github.com/sergi/jsftp) in the past).

So, in this article we'll toast to FTP by making a simple client (no passive/active mode, no TLS, for the sake of brevity) that should work with most FTP servers out there.

Let's get to it, and get off my lawn.

FTP internals crash-course
--------------------------

In the FTP protocol, the client sends a command with 0 or more parameters separated by spaces. The server then sends a response back with a numeric code and a message. We use the code to know the result of executing our command.

This is an example raw FTP session (user commands are in bold):

```
$ telnet ftp.kernel.org 21
Trying 198.145.20.140...
Connected to ftp.all.kernel.org.
Escape character is '^]'.
220 Welcome to kernel.org
user anonymous
331 Please specify the password.
pass anonymous
230 Login successful.
cwd pub/linux
250 Directory successfully changed.
stat .
213-Status follows:
drwxr-xr-x   14 ftp      ftp          4096 Nov 11  2014 .
drwxr-xr-x    9 ftp      ftp          4096 Dec 01  2011 ..
drwxrwxr-x    7 ftp      ftp          4096 Nov 10  2002 daemons
drwxrwxr-x    5 ftp      ftp          4096 Mar 03  2001 devel
drwxrwxr-x    5 ftp      ftp          4096 Nov 19  2007 docs
drwxr-xr-x   24 ftp      ftp          4096 Feb 23  2015 kernel
drwxr-xr-x   13 ftp      ftp          4096 Jan 03  2012 libs
drwxr-xr-x    6 ftp      ftp          4096 Aug 07  2014 network
drwxr-xr-x    3 ftp      ftp          4096 Jan 23  2011 status
drwxr-xr-x   21 ftp      ftp          4096 Jun 17  2015 utils
213 End of status
```

The server reads one command and returns its response before running the next one. By working sequentially, it makes it harder to manage in an asynchronous environment like Node.js, because we need to keep the state of each sent command and match it with responses coming from the server to make sure that we don't mix responses up. Fortunately for us, this is a non-issue when using reactive programming.

### Response format

For stuff like retrieving directory listings, the server needs to return multiline responses. The response rules are very clear:

*   The last line of a response always begins with three ASCII digits and a space
*   Any other line is considered part of a multi-line response

For example, the following six lines contain two responses:

```
150-This is the first line of a mark
123-This line does not end the mark; note the hyphen
150 This line ends the mark
226-This is the first line of the second response
226 This line does not end the response; note the leading space
226 This is the last line of the response, using code 226
```

To parse responses, we create a helper function `parseFtpResponses`:

```javascript
const RE_RES = /^(\d\d\d)\s.*/;
const RE_MULTI = /^(\d\d\d)-/;

function parseFtpResponses(prev, cur) {
  let response = '';
  let accumulated = prev.accumulated;

  if (RE_MULTI.test(accumulated)) {
    if (RE_RES.test(cur)) {
      response = accumulated + '\n' + cur;
      accumulated = '';
    } else {
      accumulated = accumulated + '\n' + cur;
    }
  } else if (RE_MULTI.test(cur)) {
    accumulated = cur;
  } else {
    response = cur;
  }

  return { response, accumulated };
}
```

This function is the only part of the program that keeps any kind of state, but since it is local state it can't [cause us any trouble](http://programmers.stackexchange.com/a/148109). Used in a `reduce` or a `scan` operator, `parseFtpResponses` will transform separate strings to a sequence of FTP responses.

Node streams to Observables
---------------------------

These are the modules we'll use for this experiment:

```javascript
// We use Node sockets to connect to the FTP server
import Net from "net";
import Rx from "rx";
// Convert Observables from and to streams, which are
// the interface that Node.js sockets implement
import { fromStream, writeToStream } from "rx-node";
```

Let's now create the `Ftp` class:

```javascript
class Ftp {
  constructor(host = "localhost", port = 21) {
    this._ftpSocket = Net.createConnection(port, host);
    this._ftpSocket.setEncoding("utf8");

    this.responses = fromStream(this._ftpSocket);
  }
}
```

`responses` is an Observable that wraps the connection to the FTP server `_ftpSocket` and emits its data. Easy peasy.

Of course, `_ftpSocket` will spew raw data in utf8. It's our task to make sense of it. But because `responses` is an Observable, it's easy to transform its data. We'll start by making the Observable emit only whole lines of text, delimited by `CRLF` characters, as specified by the [FTP RFC](https://www.ietf.org/rfc/rfc959.txt):

```js
this.responses = fromStream(this._ftpSocket)
  .flatMap(res => {
    // Splits both \n and \r\n cases
    let lines = res.split("\n").map(line => line.trim());
    return Rx.Observable.from(lines);
  })
  .scan(parseFtpResponses, { command: "", accumulated: "" })
  .filter(value => value.command.length > 0)
  .map(value => value.command);
```

The `flatMap` operator replaces data emitted in `fromStream` with whole lines of text, separated by newline characters. We then apply `parseResponses` to the sequence of lines, to obtain whole FTP responses, and finally we discard empty responses with `filter` and extract the `response` value with `map`.

So, `responses` now emits nice and groomed server responses. With `responses` finished we actually have the bulk of our client library already coded. We just need a couple more things.

### Writing to the socket

Requests is a [Subject](http://reactivex.io/documentation/subject.html) where we can push commands, and will output the same commands to us (Remember that a Subject acts as an Observer and as an Observable at the same time).

```javascript
this.requests = new Rx.Subject();
```
And we create the only method in the `Ftp` class, the `command` method, which will push commands to the `requests` Subject:

```javascript
command(cmd) {
  cmd = cmd.trim() + '\r\n';
  this.requests.onNext(cmd);
}
```

And whenever a new command is emitted by `requests`, we push it in the socket.

```javascript
writeToStream(this.requests, this._ftpSocket, 'utf8');
```

### Zip it up!

And here comes my favorite part in this whole bunch of code. Since every command receives one reply (except for some commands return "marks", but we'll ignore those in this post), we simply pair every request emitted with every response returned:

```javascript
this.tuples = Rx.Observable.zip(this.requests, res.skip(1));
```

The [`zip`](http://rxmarbles.com/#zip) operator pairs values from 2 or more observables in the order they are emitted. It guarantees that every command is paired with the response that comes afterwards. Notice how we use `skip` to dismiss the first response from the server. That's because FTP servers emit a welcome message when a client connects. We're not interested in that message, and it would mess up our zipping.

That's it! You can see the complete code for the library here.

The REPL
--------

Let's use the library we've just created and code a nice REPL that looks like this:

```
$ node client.js
ftp#localhost:21> user sergi
331 User sergi accepted, provide password.
ftp#localhost:21> pass p4ssw0rd
230 User sergi logged in.
ftp#localhost:21> cwd ~/projects/simple_ftp
250 CWD command successful.
ftp#localhost:21> stat .
211-status of .:

total 1
-rw-r--r--    1 sergi  staff    44 Dec  3 12:59 .babelrc
drwxr-xr-x   13 sergi  staff   442 Apr 26 12:44 .git
-rw-r--r--    1 sergi  staff  1294 Jan 21 11:26 Makefile
drwxr-xr-x    5 sergi  staff   170 Jan 22 15:34 build
-rw-r--r--    1 sergi  staff    69 Nov 20 16:22 jsconfig.json
drwxr-xr-x    4 sergi  staff   136 Jan 22 16:02 lib
drwxr-xr-x  264 sergi  staff  8976 Apr 26 12:42 node_modules
-rw-r--r--    1 sergi  staff   428 Jan 21 13:13 package.json
drwxr--r--    4 sergi  staff   136 Nov 20 16:24 typings
211 End of Status
ftp#localhost:21> feat
211-Features supported

MDTM
MLST Type*;Size*;Modify*;Perm*;Unique*;
REST STREAM
SIZE
TVFS
211 End
ftp#localhost:21>
```

Pretty slick! Fortunately, Node.js comes with the `repl` library, which makes creating these kind of programs a breeze:

```js
const repl = require("repl");
const Rx = require("rx");
const Ftp = require("./simple_ftp"); // Our library!
const client = new Ftp();

let responses = client.tuples.map(t => t[1]);
// This Subject will emit
let callbacks = new Rx.Subject();

repl.start({
  prompt: "ftp#" + client.host + ":" + client.port + "> ",
  input: process.stdin,
  output: process.stdout,
  eval: (cmd, context, filename, callback) => {
    client.command(cmd);
    callbacks.onNext(callback);
  }
});

responses.zip(callbacks).subscribe(result => {
  let [cmdResult, callback] = result;
  callback(cmdResult);
});
```

In this code we simply get ahold of the Ftp stream of request/response tuples, taking only the responses. We then make a new Subject where we'll push the callbacks that the REPL `eval` property uses to signal that a command has been introduced. We tell the REPL to use stdin/stdout for input and output, respectively. Every time the user introduces a command, it will call `Ftp.command` with it, and push the callback in the `callbacks` Subject.

Finally, we use our friend `zip` again to pair responses from the server with their respective callback, and we subscribe to the Observable generated by `zip`, where we run each command callback with its corresponding response from the server.

Conclusion
----------

This article may need a couple of reads until everything makes sense. In short, RxJS programming is all about thinking in streams of data (Observables) that keep as little state as possible, and that can be continuously transformed to achieve the desired output.

If you want to know more about the possibilities of Reactive Programming, I wrote a book about it with everything you need to know to write reactive JavaScript applications :) Go check it out!

<iframe src="https://pragprog.com/products/buy_now_insert/smreactjs5" style="border:0;" border="0px" seamless="" width="155px" height="182px">Loading…</iframe>

Find the complete code for this article [here](https://github.com/sergi/simple_ftp). Discussion of this article in [Hacker News](https://news.ycombinator.com/item?id=11624078).
