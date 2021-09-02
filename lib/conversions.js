const {
  ReadableStream,
  WritableStream,
  Readable,
  Writable,
  Duplex,
  // finished,
  CountQueuingStrategy,
} = require('./isomorphic-streams');
const {
  finished,
} = require('stream')

const {
  createDeferredPromise,
  isDestroyed,
  destroy,
  isWritable,
  isReadable,
  isWritableEnded,
  isReadableEnded,
  isReadableStream,
  isWritableStream,
} = require('./util');

const {
  validateBoolean,
  validateObject
} = require('./validators')

const { AbortError, invalidArgType, invalidArgValue, prematureClose } = require('./errors');

// const { pthen, pfinally } = Promise.prototype;


function newWritableStreamFromStreamWritable(streamWritable) {
  if (typeof streamWritable?._writableState !== 'object') {
    throw invalidArgType(
      'streamWritable',
      'stream.Writable',
      streamWritable);
  }

  if (isDestroyed(streamWritable) || !isWritable(streamWritable)) {
    const writable = new WritableStream();
    writable.close();
    return writable;
  }

  const highWaterMark = streamWritable.writableHighWaterMark;
  const strategy =
    streamWritable.writableObjectMode ?
      new CountQueuingStrategy({ highWaterMark }) :
      { highWaterMark };

  let controller;
  let backpressurePromise;
  let closed;

  function onDrain() {
    if (backpressurePromise !== undefined)
      backpressurePromise.resolve();
  }

  const cleanup = finished(streamWritable, (error) => {
    if (error?.code === 'ERR_STREAM_PREMATURE_CLOSE') {
      const err = new AbortError();
      err.cause = error;
      error = err;
    }

    cleanup();
    streamWritable.on('error', () => {});
    if (error != null) {
      if (backpressurePromise !== undefined)
        backpressurePromise.reject(error);
      if (closed !== undefined) {
        closed.reject(error);
        closed = undefined;
      }
      controller.error(error);
      controller = undefined;
      return;
    }

    if (closed !== undefined) {
      closed.resolve();
      closed = undefined;
      return;
    }
    controller.error(new AbortError());
    controller = undefined;
  });

  streamWritable.on('drain', onDrain);

  return new WritableStream({
    start(c) { controller = c; },

    async write(chunk) {
      if (streamWritable.writableNeedDrain || !streamWritable.write(chunk)) {
        backpressurePromise = createDeferredPromise();
        return pfinally(
          backpressurePromise.promise, () => {
            backpressurePromise = undefined;
          });
      }
    },

    abort(reason) {
      destroy(streamWritable, reason);
    },

    close() {
      if (closed === undefined && !isWritableEnded(streamWritable)) {
        closed = createDeferredPromise();
        streamWritable.end();
        return closed.promise;
      }

      controller = undefined;
      return PromiseResolve();
    },
  }, strategy);
}

function newStreamWritableFromWritableStream(writableStream, options = {}) {
  if (!isWritableStream(writableStream)) {
    throw invalidArgType(
      'writableStream',
      'WritableStream',
      writableStream);
  }

  validateObject(options, 'options');
  const {
    highWaterMark,
    decodeStrings = true,
    objectMode = false,
    signal,
  } = options;

  validateBoolean(objectMode, 'options.objectMode');
  validateBoolean(decodeStrings, 'options.decodeStrings');

  const writer = writableStream.getWriter();
  let closed = false;

  const writable = new Writable({
    highWaterMark,
    objectMode,
    decodeStrings,
    signal,

    writev(chunks, callback) {
      function done(error) {
        try {
          callback(error);
        } catch (error) {
          setImmediate(() => destroy(writable, error));
        }
      }

      writer.ready.then(
        () => {
          return Promise.all(chunks.map((chunk) => writer.write(chunk))).then(
            done,
            done);
        },
        done);
    },

    write(chunk, encoding, callback) {
      if (typeof chunk === 'string' && decodeStrings && !objectMode) {
        chunk = Buffer.from(chunk, encoding);
        chunk = new Uint8Array(
          chunk.buffer,
          chunk.byteOffset,
          chunk.byteLength);
      }

      function done(error) {
        try {
          callback(error);
        } catch (error) {
          destroy(writable, error);
        }
      }

        writer.ready.then(() => {
          return writer.write(chunk).then(done, done);
        },
        done);
    },

    destroy(error, callback) {
      function done() {
        try {
          callback(error);
        } catch (error) {
          setImmediate(() => { throw error; });
        }
      }

      if (!closed) {
        if (error != null) {
            writer.abort(error).then(
            done,
            done);
        } else {
            writer.close().then(
            done,
            done);
        }
        return;
      }

      done();
    },

    final(callback) {
      function done(error) {
        try {
          callback(error);
        } catch (error) {
          setImmediate(() => destroy(writable, error));
        }
      }

      if (!closed) {
          writer.close().then(
          done,
          done);
      }
    },
  });

    writer.closed.then(
    () => {
      closed = true;
      if (!isWritableEnded(writable))
        destroy(writable, prematureClose());
    },
    (error) => {
      closed = true;
      destroy(writable, error);
    });

  return writable;
}

function newReadableStreamFromStreamReadable(streamReadable) {
  if (typeof streamReadable?._readableState !== 'object') {
    throw invalidArgType(
      'streamReadable',
      'stream.Readable',
      streamReadable);
  }

  if (isDestroyed(streamReadable) || !isReadable(streamReadable)) {
    const readable = new ReadableStream();
    readable.cancel();
    return readable;
  }

  const objectMode = streamReadable.readableObjectMode;
  const highWaterMark = streamReadable.readableHighWaterMark;
  const strategy =
    objectMode ?
      new CountQueuingStrategy({ highWaterMark }) :
      { highWaterMark };

  let controller;

  function onData(chunk) {
    // Copy the Buffer to detach it from the pool.
    if (Buffer.isBuffer(chunk) && !objectMode)
      chunk = new Uint8Array(chunk);
    controller.enqueue(chunk);
    if (controller.desiredSize <= 0)
      streamReadable.pause();
  }

  streamReadable.pause();

  const cleanup = finished(streamReadable, (error) => {
    if (error?.code === 'ERR_STREAM_PREMATURE_CLOSE') {
      const err = new AbortError();
      err.cause = error;
      error = err;
    }

    cleanup();
    streamReadable.on('error', () => {});
    if (error)
      return controller.error(error);
    controller.close();
  });

  streamReadable.on('data', onData);

  return new ReadableStream({
    start(c) { controller = c; },

    pull() { streamReadable.resume(); },

    cancel(reason) {
      destroy(streamReadable, reason);
    },
  }, strategy);
}

function newStreamReadableFromReadableStream(readableStream, options = {}) {
  if (!isReadableStream(readableStream)) {
    throw invalidArgType(
      'readableStream',
      'ReadableStream',
      readableStream);
  }

  validateObject(options, 'options');
  const {
    highWaterMark,
    encoding,
    objectMode = false,
    signal,
  } = options;

  if (encoding !== undefined && !Buffer.isEncoding(encoding))
    throw invalidArgValue(encoding, 'options.encoding');
  validateBoolean(objectMode, 'options.objectMode');

  const reader = readableStream.getReader();
  let closed = false;

  const readable = new Readable({
    objectMode,
    highWaterMark,
    encoding,
    signal,

    read() {
        reader.read().then(
        (chunk) => {
          if (chunk.done) {
            // Value should always be undefined here.
            readable.push(null);
          } else {
            readable.push(chunk.value);
          }
        },
        (error) => destroy(readable, error));
    },

    destroy(error, callback) {
      function done() {
        try {
          callback(error);
        } catch (error) {
          setImmediate(() => { throw error; });
        }
      }

      if (!closed) {
          reader.cancel(error).then(
          done,
          done);
        return;
      }
      done();
    },
  });

    reader.closed.then(
    () => {
      closed = true;
      if (!isReadableEnded(readable))
        readable.push(null);
    },
    (error) => {
      closed = true;
      destroy(readable, error);
    });

  return readable;
}

function newReadableWritablePairFromDuplex(duplex) {
  if (typeof duplex?._writableState !== 'object' ||
      typeof duplex?._readableState !== 'object') {
    throw invalidArgType('duplex', 'stream.Duplex', duplex);
  }

  if (isDestroyed(duplex)) {
    const writable = new WritableStream();
    const readable = new ReadableStream();
    writable.close();
    readable.cancel();
    return { readable, writable };
  }

  const writable =
    isWritable(duplex) ?
      newWritableStreamFromStreamWritable(duplex) :
      new WritableStream();

  if (!isWritable(duplex))
    writable.close();

  const readable =
    isReadable(duplex) ?
      newReadableStreamFromStreamReadable(duplex) :
      new ReadableStream();

  if (!isReadable(duplex))
    readable.cancel();

  return { writable, readable };
}

function newStreamDuplexFromReadableWritablePair(pair = {}, options = {}) {
  validateObject(pair, 'pair');
  const {
    readable: readableStream,
    writable: writableStream,
  } = pair;

  if (!isReadableStream(readableStream)) {
    throw invalidArgType(
      'pair.readable',
      'ReadableStream',
      readableStream);
  }
  if (!isWritableStream(writableStream)) {
    throw invalidArgType(
      'pair.writable',
      'WritableStream',
      writableStream);
  }

  validateObject(options, 'options');
  const {
    allowHalfOpen = false,
    objectMode = false,
    encoding,
    decodeStrings = true,
    highWaterMark,
    signal,
  } = options;

  validateBoolean(objectMode, 'options.objectMode');
  if (encoding !== undefined && !Buffer.isEncoding(encoding))
    throw invalidArgValue(encoding, 'options.encoding');

  const writer = writableStream.getWriter();
  const reader = readableStream.getReader();
  let writableClosed = false;
  let readableClosed = false;

  const duplex = new Duplex({
    allowHalfOpen,
    highWaterMark,
    objectMode,
    encoding,
    decodeStrings,
    signal,

    writev(chunks, callback) {
      function done(error) {
        try {
          callback(error);
        } catch (error) {
          // In a next tick because this is happening within
          // a promise context, and if there are any errors
          // thrown we don't want those to cause an unhandled
          // rejection. Let's just escape the promise and
          // handle it separately.
          setImmediate(() => destroy(duplex, error));
        }
      }

        writer.ready.then(
        () => {
            Promise.all(
                chunks.map((chunk) => writer.write(chunk))).then(
            done,
            done);
        },
        done);
    },

    write(chunk, encoding, callback) {
      if (typeof chunk === 'string' && decodeStrings && !objectMode) {
        chunk = Buffer.from(chunk, encoding);
        chunk = new Uint8Array(
          chunk.buffer,
          chunk.byteOffset,
          chunk.byteLength);
      }

      function done(error) {
        try {
          callback(error);
        } catch (error) {
          destroy(duplex, error);
        }
      }

        writer.ready.then(
        () => {
            writer.write(chunk).then(
            done,
            done);
        },
        done);
    },

    final(callback) {
      function done(error) {
        try {
          callback(error);
        } catch (error) {
          setImmediate(() => destroy(duplex, error));
        }
      }

      if (!writableClosed) {
          writer.close().then(
          done,
          done);
      }
    },

    read() {
        reader.read().then(
        (chunk) => {
          if (chunk.done) {
            duplex.push(null);
          } else {
            duplex.push(chunk.value);
          }
        },
        (error) => destroy(duplex, error));
    },

    destroy(error, callback) {
      function done() {
        try {
          callback(error);
        } catch (error) {
          // In a next tick because this is happening within
          // a promise context, and if there are any errors
          // thrown we don't want those to cause an unhandled
          // rejection. Let's just escape the promise and
          // handle it separately.
          setImmediate(() => { throw error; });
        }
      }

      async function closeWriter() {
        if (!writableClosed)
          await writer.abort(error);
      }

      async function closeReader() {
        if (!readableClosed)
          await reader.cancel(error);
      }

      if (!writableClosed || !readableClosed) {
          Promise.all([
            closeWriter(),
            closeReader(),
          ]).then(
          done,
          done);
        return;
      }

      done();
    },
  });

    writer.closed.then(
    () => {
      writableClosed = true;
      if (!isWritableEnded(duplex))
        destroy(duplex, new ERR_STREAM_PREMATURE_CLOSE());
    },
    (error) => {
      writableClosed = true;
      readableClosed = true;
      destroy(duplex, error);
    });

    reader.closed.then(
    () => {
      readableClosed = true;
      if (!isReadableEnded(duplex))
        duplex.push(null);
    },
    (error) => {
      writableClosed = true;
      readableClosed = true;
      destroy(duplex, error);
    });

  return duplex;
}


module.exports = {
  newWritableStreamFromStreamWritable,
  newReadableStreamFromStreamReadable,
  newStreamWritableFromWritableStream,
  newStreamReadableFromReadableStream,
  newReadableWritablePairFromDuplex,
  newStreamDuplexFromReadableWritablePair,
};
