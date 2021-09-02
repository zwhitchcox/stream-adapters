// Ported from https://github.com/mafintosh/end-of-stream with
// permission from the author, Mathias Buus (@mafintosh).

'use strict';

const {
  AbortError,
  prematureClose,
} = require('./errors');
const {
  validateAbortSignal,
  validateFunction,
  validateObject,
} = require('./validators');

const {
  isClosed,
  isReadable,
  isReadableNodeStream,
  isReadableFinished,
  isWritable,
  isWritableNodeStream,
  isWritableFinished,
  isNodeStream,
  willEmitClose: _willEmitClose,
  isIterable,
  once,
} = require('./util');

function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}

const nop = () => {};

function eos(stream, options, callback) {
  if (arguments.length === 2) {
    callback = options;
    options = {};
  } else if (options == null) {
    options = {};
  } else {
    validateObject(options, 'options');
  }
  validateFunction(callback, 'callback');
  validateAbortSignal(options.signal, 'options.signal');

  callback = once(callback);

  const readable = options.readable ||
    (options.readable !== false && isReadableNodeStream(stream));
  const writable = options.writable ||
    (options.writable !== false && isWritableNodeStream(stream));

  if (isNodeStream(stream)) {
    // Do nothing...
  } else {
    // TODO: Webstreams.
    // TODO: Throw INVALID_ARG_TYPE.
  }

  const wState = stream._writableState;
  const rState = stream._readableState;

  const onlegacyfinish = () => {
    if (!stream.writable) onfinish();
  };

  // TODO (ronag): Improve soft detection to include core modules and
  // common ecosystem modules that do properly emit 'close' but fail
  // this generic check.
  let willEmitClose = (
    _willEmitClose(stream) &&
    isReadableNodeStream(stream) === readable &&
    isWritableNodeStream(stream) === writable
  );

  let writableFinished = isWritableFinished(stream, false);
  const onfinish = () => {
    writableFinished = true;
    // Stream should not be destroyed here. If it is that
    // means that user space is doing something differently and
    // we cannot trust willEmitClose.
    if (stream.destroyed) willEmitClose = false;

    if (willEmitClose && (!stream.readable || readable)) return;
    if (!readable || readableFinished) callback.call(stream);
  };

  let readableFinished = isReadableFinished(stream, false);
  const onend = () => {
    readableFinished = true;
    // Stream should not be destroyed here. If it is that
    // means that user space is doing something differently and
    // we cannot trust willEmitClose.
    if (stream.destroyed) willEmitClose = false;

    if (willEmitClose && (!stream.writable || writable)) return;
    if (!writable || writableFinished) callback.call(stream);
  };

  const onerror = (err) => {
    callback.call(stream, err);
  };

  let closed = isClosed(stream);

  const onclose = () => {
    closed = true;

    const errored = wState?.errored || rState?.errored;

    if (errored && typeof errored !== 'boolean') {
      return callback.call(stream, errored);
    }

    if (readable && !readableFinished) {
      if (!isReadableFinished(stream, false))
        return callback.call(stream,
                             prematureClose());
    }
    if (writable && !writableFinished) {
      if (!isWritableFinished(stream, false))
        return callback.call(stream,
                             prematureClose());
    }

    callback.call(stream);
  };

  const onrequest = () => {
    stream.req.on('finish', onfinish);
  };

  if (isRequest(stream)) {
    stream.on('complete', onfinish);
    if (!willEmitClose) {
      stream.on('abort', onclose);
    }
    if (stream.req) onrequest();
    else stream.on('request', onrequest);
  } else if (writable && !wState) { // legacy streams
    stream.on('end', onlegacyfinish);
    stream.on('close', onlegacyfinish);
  }

  // Not all streams will emit 'close' after 'aborted'.
  if (!willEmitClose && typeof stream.aborted === 'boolean') {
    stream.on('aborted', onclose);
  }

  stream.on('end', onend);
  stream.on('finish', onfinish);
  if (options.error !== false) stream.on('error', onerror);
  stream.on('close', onclose);

  if (closed) {
    setImmediate(onclose);
  } else if (wState?.errorEmitted || rState?.errorEmitted) {
    if (!willEmitClose) {
      setImmediate(onclose);
    }
  } else if (
    !readable &&
    (!willEmitClose || isReadable(stream)) &&
    (writableFinished || !isWritable(stream))
  ) {
    setImmediate(onclose);
  } else if (
    !writable &&
    (!willEmitClose || isWritable(stream)) &&
    (readableFinished || !isReadable(stream))
  ) {
    setImmediate(onclose);
  } else if ((rState && stream.req && stream.aborted)) {
    setImmediate(onclose);
  }

  const cleanup = () => {
    callback = nop;
    stream.removeListener('aborted', onclose);
    stream.removeListener('complete', onfinish);
    stream.removeListener('abort', onclose);
    stream.removeListener('request', onrequest);
    if (stream.req) stream.req.removeListener('finish', onfinish);
    stream.removeListener('end', onlegacyfinish);
    stream.removeListener('close', onlegacyfinish);
    stream.removeListener('finish', onfinish);
    stream.removeListener('end', onend);
    stream.removeListener('error', onerror);
    stream.removeListener('close', onclose);
  };

  if (options.signal && !closed) {
    const abort = () => {
      // Keep it because cleanup removes it.
      const endCallback = callback;
      cleanup();
      endCallback.call(stream, new AbortError());
    };
    if (options.signal.aborted) {
      setImmediate(abort);
    } else {
      const originalCallback = callback;
      callback = once((...args) => {
        options.signal.removeEventListener('abort', abort);
        originalCallback.apply(stream, args);
      });
      options.signal.addEventListener('abort', abort);
    }
  }

  return cleanup;
}

module.exports = eos;