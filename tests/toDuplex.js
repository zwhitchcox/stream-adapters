const common = require('./common');

const assert = require('assert');

const {
  TransformStream,
} = require('stream/web');

const { newStreamDuplexFromReadableWritablePair } = require('../lib/conversions');

const {
  finished,
  pipeline,
  Readable,
  Writable,
} = require('stream');

{
  const transform = new TransformStream();
  const duplex = newStreamDuplexFromReadableWritablePair(transform);

  assert(transform.readable.locked);
  assert(transform.writable.locked);

  duplex.destroy();

}

{
  const error = new Error('boom');
  const transform = new TransformStream();
  const duplex = newStreamDuplexFromReadableWritablePair(transform);

  assert(transform.readable.locked);
  assert(transform.writable.locked);

  duplex.destroy(error);
  duplex.on('error', common.mustCall((reason) => {
    assert.strictEqual(reason, error);
  }));
}

{
  const transform = new TransformStream();
  const duplex = new newStreamDuplexFromReadableWritablePair(transform);

  duplex.end();
  duplex.resume();

}

{
  const ec = new TextEncoder();
  const dc = new TextDecoder();
  const transform = new TransformStream({
    transform(chunk, controller) {
      const text = dc.decode(chunk);
      controller.enqueue(ec.encode(text.toUpperCase()));
    }
  });
  const duplex = new newStreamDuplexFromReadableWritablePair(transform, {
    encoding: 'utf8',
  });

  duplex.end('hello');
  duplex.on('data', common.mustCall((chunk) => {
    assert.strictEqual(chunk, 'HELLO');
  }));
  duplex.on('end', common.mustCall());

}

{
  const ec = new TextEncoder();
  const dc = new TextDecoder();
  const transform = new TransformStream({
    transform: common.mustCall((chunk, controller) => {
      const text = dc.decode(chunk);
      controller.enqueue(ec.encode(text.toUpperCase()));
    })
  });
  const duplex = new newStreamDuplexFromReadableWritablePair(transform, {
    encoding: 'utf8',
  });

  finished(duplex, common.mustCall());

  duplex.end('hello');
  duplex.resume();
}

{
  const ec = new TextEncoder();
  const dc = new TextDecoder();
  const transform = new TransformStream({
    transform: common.mustCall((chunk, controller) => {
      const text = dc.decode(chunk);
      controller.enqueue(ec.encode(text.toUpperCase()));
    })
  });
  const duplex = new newStreamDuplexFromReadableWritablePair(transform, {
    encoding: 'utf8',
  });

  const readable = new Readable({
    read() {
      readable.push(Buffer.from('hello'));
      readable.push(null);
    }
  });

  const writable = new Writable({
    write: common.mustCall((chunk, encoding, callback) => {
      assert.strictEqual(dc.decode(chunk), 'HELLO');
      assert.strictEqual(encoding, 'buffer');
      callback();
    })
  });

  finished(duplex, common.mustCall());
  pipeline(readable, duplex, writable, common.mustCall());
}
