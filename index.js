const {
    newStreamDuplexFromReadableWritablePair,
    newReadableStreamFromStreamReadable,
    newWritableStreamFromStreamWritable,
    newStreamWritableFromWritableStream,
    newReadableStreamFromStreamReadable,
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
    newReadableStreamFromStreamReadable,
    newWritableStreamFromStreamWritable,
    newStreamWritableFromWritableStream,
    newReadableStreamFromStreamReadable,
    toNode,
    toWeb,
    pipeline,
}
