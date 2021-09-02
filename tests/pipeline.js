const { pipeline } = require("../lib/pipeline");
const { PassThrough } = require('stream');
const { ReadableStream } = require("../lib/isomorphic-streams/node");

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

const rs = new ReadableStream({
  MySource
})
const pt = new PassThrough

pipeline(rs, pt, (err) => {
  console.log(err)
})