function validateBoolean(value, name) {
  if (typeof value !== 'boolean') {
    throw new Error('Expected a boolean value for ' + name + ', got ' + value);
  }
}

function validateObject(value, name) {
  if (typeof value !== 'object') {
    throw new Error('Expected an object for ' + name + ', got ' + value);
  }
}

const validateCallback = (callback) => {
  if (typeof callback !== 'function')
  throw new Error('Invalid callback, ' + callback);
};

const validateAbortSignal = (signal, name) => {
  if (signal !== undefined &&
      (signal === null ||
       typeof signal !== 'object' ||
       !('aborted' in signal))) {
    throw new Error("Not an abort signal on " + name + ", got " + signal);
  }
};

const validateFunction = (value, name) => {
  if (typeof value !== 'function')
    console.log(name + " expected a function, got " + value);
};

module.exports = {
  validateBoolean,
  validateObject,
  validateCallback,
  validateAbortSignal,
  validateFunction,
}