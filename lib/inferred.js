const { newReadableStreamFromStreamReadable, newWritableStreamFromStreamWritable, newReadableWritablePairFromDuplex, newStreamDuplexFromReadableWritablePair, newStreamWritableFromWritableStream, newStreamReadableFromReadableStream } = require('./conversions');
const {
  isReadableStream,
  isWritableStream,
  isTransformStream,
  isDuplexNodeStream,
  isReadableNodeStream,
  isWritableNodeStream,
} = require('./util');

const toWeb = (stream) => {
  if (isReadableStream(stream) || isWritableStream(stream) || isTransformStream(stream)) {
    return stream;
  }
  if (isDuplexNodeStream(stream)) {
      return newReadableWritablePairFromDuplex(stream, stream2)
  }
  if (isReadableNodeStream(stream)) {
    return newReadableStreamFromStreamReadable(stream);
  }
  if (isWritableNodeStream(stream)) {
      return newWritableStreamFromStreamWritable(stream);
  }
  throw new Error('argument must be a stream stream.')
}

const toNode = (stream, options) => {
    if (isReadableNodeStream(stream) || isWritableNodeStream(stream) || isDuplexNodeStream(stream)) {
        return stream;
    }
    if (typeof stream === "object" && (stream.writable && stream.readable)) {
        return newStreamDuplexFromReadableWritablePair(stream, options)
    }
    if (isTransformStream(stream)) {
        throw new Error("Not yet implemented");
    }
    if (isReadableStream(stream)) {
        return newStreamReadableFromReadableStream(stream);
    }
    if (isWritableStream(stream)) {
        return newStreamWritableFromWritableStream(stream);
    }
    throw new Error("Unrecognized arguments, " + stream + options + " must be a stream")
}

module.exports = {
  toWeb,
  toNode,
}