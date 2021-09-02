const ERR_INVALID_ARG_TYPE = 'ERR_INVALID_ARG_TYPE';
const ERR_INVALID_ARG_VALUE = 'ERR_INVALID_ARG_VALUE';
const ERR_STREAM_PREMATURE_CLOSE = 'ERR_STREAM_PREMATURE_CLOSE';
const ERR_INVALID_RETURN_VALUE = 'ERR_INVALID_RETURN_VALUE';
const ERR_MISSING_ARGS = 'ERR_MISSING_ARGS';
const ERR_STREAM_DESTROYED = 'ERR_STREAM_DESTROYED';


const invalidArgType = (name, expected, actual) => {
  const err = new Error("Expected: " + expected + " for " + name + ", got: " + actual);
  err.code = ERR_INVALID_ARG_TYPE;
  return err;
}

const invalidArgValue = (invalid, name) => {
  const err = new Error("Invalid argument: " + invalid + " for " + name );
  err.code = ERR_INVALID_ARG_VALUE;
  return err;
}

const invalidReturnValue = (name, input, value) => {
  const err = new Error("Invalid return value for " + name + " when received " + input + " returned " + value );
  err.code = ERR_INVALID_RETURN_VALUE;
  return err;
}

const streamDestroyed = (name) => {
  const err = new Error("Cannot call " + name + " after stream destroyed.");
  err.code = ERR_STREAM_DESTROYED;
  return err;
}

const missingArgs = (...args) => {
  const err = new Error("Missing args " + args.join("&&"));
  err.code = ERR_MISSING_ARGS;
  return err;
}

const prematureClose = () => {
  const err = new Error("stream closed prematurely.");
  err.code = ERR_STREAM_PREMATURE_CLOSE;
  return err;

}

class AbortError extends Error {
  constructor() {
    super('The operation was aborted');
    this.code = 'ABORT_ERR';
    this.name = 'AbortError';
  }
}

module.exports = {
  AbortError,
  prematureClose,
  missingArgs,
  streamDestroyed,
  invalidArgType,
  invalidArgValue,
  invalidReturnValue,
}