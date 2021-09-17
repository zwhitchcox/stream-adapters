const {
    newStreamDuplexFromReadableWritablePair,
    newReadableWritablePairFromDuplex,
    newReadableStreamFromStreamReadable,
    newWritableStreamFromStreamWritable,
    newStreamWritableFromWritableStream,
    newStreamReadableFromReadableStream,
} = require('./lib/conversions');

const {
    toWeb,
    toNode,
} = require('./lib/inferred');

const {
    pipeline,
} = require('./lib/pipeline');

module.exports = {
    newStreamDuplexFromReadableWritablePair,
    newReadableWritablePairFromDuplex,
    newReadableStreamFromStreamReadable,
    newWritableStreamFromStreamWritable,
    newStreamWritableFromWritableStream,
    newStreamReadableFromReadableStream,
    toNode,
    toWeb,
    pipeline,
}
