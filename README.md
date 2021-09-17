# stream-adapters

WhatWG web streams and conversion utilities for node.js, browser-ready.

With the release of the web streams api for node, people are bound to be
interoperating between the two, which as the motivation for this utility library.

This package is meant to be operable from a node instance or a browser.

If you are going to be working on the browser or an older instance of node
without the `WebStream API`, you will need the polyfills:

* stream-browserify
* web-streams-polyfill

This code is mostly taken the [node internals](https://github.com/nodejs/node/blob/master/lib/internal/webstreams/adapters.js), and just made to work on both browser and server. All credit should go to @jasnell for the code written here.

Note: This is an experimental api built on top of another experimental api. Use with caution.


## Installation
```
npm install stream-adapters
```

with peer dependencies:

```
npm install --savea-dev stream-adapters stream-browserify web-streams-polyfill
```

## Usage

The `toNode` method converts any underlying stream to a Node stream.

If it's a `ReadableStream`, it will be converted to a `stream.Readable`.
If it's a `WritableStream`, it will be converted to a `stream.Writable`.

```js
class MySource {
  constructor(value = new Uint8Array(10)) {
    this.value = value;
  }

  start(c) {
    this.started = true;
    this.controller = c;
  }

  pull(controller) {
    controller.enqueue(this.value);
    controller.close();
  }

  cancel(reason) {
    this.canceled = true;
    this.cancelReason = reason;
  }
}

const rs = new ReadableStream(MySource);

toNode(rs) // creates a node read stream
```

It can also take a `ReadableStream` and a `WritableStream` and create a `stream.Duplex`.

```js
const rs = new ReadableStream(MySource);
const ws = new WritableStream(MySource);

toNode({readable: rs, writable: ws}, {highWaterMark: 16}) // creates a stream.Duplex
```

Likewise, streams can be converted to web streams with the `toWeb` methods.

```js
const sr = Readable.from("hello world")
toWeb(sr) // creates ReadableStream
const sw = getStreamWritableSomehow()
toWeb(sw) // creates WritableStream
```

And you can create a `ReadableStream` and `WritableStream` from a `stream.Duplex`, like so:

```js
const duplex = new PassThrough();
toWeb(duplex) // returns { readable, writable }, a ReadableStream and WritableStream
```

There is also a pipeline that will convert all streams to node as it pipes them.

```js
const rs = new ReadableStream(MySource);
const duplex = new PassThrough();
const ws = getWritableStreamSomehow();
pipeline(rs, duplex, ws, err => { // this will convert all streams to node streams
  if (err) {
    console.error(err)
  }
})
```

This api will likely change though, so I wouldn't recommend you use it.
I just have to implement it, but the pipeline will convert the source to the output
of the last stream in the pipeline.

There are a few other utility functions exported for your convenience if you want to be more explicit:

```
newStreamDuplexFromReadableWritablePair
newReadableStreamFromStreamReadable
newWritableStreamFromStreamWritable
newStreamWritableFromWritableStream
newReadableStreamFromStreamReadable
```

I'll leave it as an exercise to the reader to figure out what they do ;)

### Credits

The code in here was mostly written by @jasnell, I just adapted it to support multiple environments from the node internals.
