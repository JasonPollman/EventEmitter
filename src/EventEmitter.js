/**
 * A node.js like event emitter that works in the browser (IE 9+).
 * This module adheres to same interface as node's events' equivalent.
 * @author Jason Pollman <jasonjpollman@gmail.com>
 * @since 3/12/18
 */

const log = console;

// Since IE doesn't support symbols
const timestamp = Date.now();
const events = `__EVENT_EMITTER_EVENTS_${timestamp}__`;
const maxListeners = `__EVENT_EMITTER_MAX_LISTENERS_${timestamp}__`;

/**
 * Returns an object's "listener" property.
 * @param {object} target The target object to return the "listener" property of.
 * @returns {function} The object's listener property.
 */
const getListenerProperty = ({ listener }) => listener;

/**
 * Validates that the given value is a string or symbol and throws if not.
 * @param {any} value The value to inspect.
 * @returns {undefined}
 */
export function validateEventArgument(value) {
  if (typeof value !== 'string' && typeof value !== 'symbol') {
    throw new TypeError(
      'Argument for parameter "event" must be a string or symbol.',
    );
  }
}

/**
 * Validates that the given value is a function and throws if not.
 * @param {any} value The value to inspect.
 * @returns {undefined}
 */
export function validateListenerArgument(value) {
  if (typeof value !== 'function') {
    throw new TypeError(
      'Argument for parameter "listener" must be a function.',
    );
  }
}

/**
 * Array.prototype.findIndex isn't supported by IE.
 * @param {Array} collection The array to find the index value using the given callback.
 * @param {function} iteratee The callback to invoke for each element in the array.
 * @returns {number} The first index of the iteratee value that returns true (or -1).
 */
export function findIndex(collection, iteratee) {
  let index = -1;

  collection.some((value, key) => {
    if (!iteratee(value, key, collection)) return false;
    index = key;
    return true;
  });

  return index;
}

/**
 * IE doesn't support Object.assign.
 * @param {object} assignee The object to assign to.
 * @param {object} properties The collection of properties to assign to the object.
 * @export
 */
export function assign(assignee, properties) {
  const target = assignee;

  Object.keys(properties).forEach((property) => {
    target[property] = properties[property];
  });

  return target;
}

/**
 * Returns all the keys of an object who's value isn't `undefined`.
 * @param {object} object The object to get the keys of.
 * @returns {Array<string>} The set of keys who's values are not equal to `undefined`.
 * @export
 */
export function keysOfDefinedProperties(object) {
  const keys = [];

  Object.keys(object).forEach((key) => {
    if (object[key] !== undefined) keys.push(key);
  });

  return keys;
}

/**
 * Creates a new EventEmitter class that extends the given `Target` class..
 * @param {function} Target The target class to extend.
 * @returns {function} The EventEmitter class that extends `Target`.
 * @export
 */
export function emitter(Target = class {}) {
  return class EventEmitter extends Target {
    /**
     * The default number of "maxListeners".
     * @memberof EventEmitter
     * @static
     */
    static get defaultMaxListeners() {
      return typeof EventEmitter[maxListeners] === 'number' ? EventEmitter[maxListeners] : 10;
    }

    /**
     * Sets the default number of "maxListeners".
     * @memberof EventEmitter
     * @static
     */
    static set defaultMaxListeners(n) {
      EventEmitter[maxListeners] = Math.max(Number(n) || 0, 0);
    }

    /**
     * Creates an instance of EventEmitter.
     * @memberof EventEmitter
     */
    constructor(...args) {
      super(...args);

      Object.defineProperties(this, {
        [events]: {
          value: {},
          writable: true,
          enumerable: false,
          configurable: false,
        },
        [maxListeners]: {
          value: EventEmitter.defaultMaxListeners,
          writable: true,
          enumerable: false,
          configurable: false,
        },
      });
    }

    /**
     * True if the EventEmitter instance contains listeners for the given event.
     * @param {any} event The name of the event to assert existence.
     * @returns {boolean} True if it has listeners for the given event, false otherwise.
     */
    hasListenersForEvent(event) {
      return Boolean(this[events][event]);
    }

    /**
     * @returns {number} This EventEmitter's `maxListeners` property.
     * @memberof EventEmitter
     */
    getMaxListeners() {
      return this[maxListeners];
    }

    /**
     * Sets the `maxListener` count.
     * @param {number} n The value to set the max listener count to.
     * @returns {EventEmitter} The current event emitter instance for chaining.
     * @memberof EventEmitter
     */
    setMaxListeners(n) {
      this[maxListeners] = Math.max(Number(n) || 0, 0);
      return this;
    }

    /**
     * Emits ("triggers") an event, calling all of the registered listeners.
     * @param {string|symbol} event The event to emit.
     * @param {...any} args The arguments list to invoke to each listener with.
     * @returns {EventEmitter} The current event emitter instance for chaining.
     * @memberof EventEmitter
     */
    emit(event, ...args) {
      if (!this.hasListenersForEvent(event)) return this;

      [...this[events][event]].forEach(({ type, listener }) => {
        if (type === 'once') this.removeListener(event, listener);
        listener.call(this, ...args);
      });

      return this;
    }

    /**
     * Adds a "persistent" event listener.
     * @param {string|symbol} event The event to listen on.
     * @param {function} listener The callback to invoke when "event" is emitted.
     * @returns {EventEmitter} The current event emitter instance for chaining.
     * @memberof EventEmitter
     */
    addListener(event, listener, type = 'on') {
      validateEventArgument(event);
      validateListenerArgument(listener);

      if (!this.hasListenersForEvent(event)) this[events][event] = [];

      const listeners = this[events][event];
      listeners.push({ type, listener });

      // If the user has reached the "maxListeners" count print a warning.
      // This will only trigger once, so subsequent "addListener" calls
      // won't spam the console.
      if (listeners.length > this[maxListeners] && !this.maxListenersWarnedOnce) {
        this.maxListenersWarnedOnce = true;

        log.warn(
          `Possible EventEmitter memory leak detected. ${listeners.length} "${event.toString()}" ` +
          'listeners added. Use EventEmitter#setMaxListeners to increase this limit.',
        );
      }

      return this;
    }

    /**
     * Removes a listener from the specified event.
     * @param {string|symbol} event The event to remove the listener from.
     * @returns {EventEmitter} The current event emitter instance for chaining.
     * @memberof EventEmitter
     */
    removeListener(event, listener) {
      validateEventArgument(event);

      // Event doesn't exist, or nothing valid to remove.
      if (!this.hasListenersForEvent(event) || typeof listener !== 'function') return this;

      const listeners = this[events][event];
      const index = findIndex(listeners, wrapper => wrapper.listener === listener);

      if (index !== -1) {
        listeners.splice(index, 1);
        if (!listeners.length) this[events][event] = undefined;
      }

      return this;
    }

    /**
     * Removes all listeners for all events or the one specified by "event".
     * @param {string|symbol=} event The event to remove the listeners from.
     * @returns {EventEmitter} The current event emitter instance for chaining.
     * @memberof EventEmitter
     */
    removeAllListeners(event) {
      if (event !== null && event !== undefined) {
        this[events][event] = undefined;
      } else {
        this[events] = {};
      }

      return this;
    }

    /**
     * Adds a "one time" listener.
     * @param {string|symbol} event The event to listen on.
     * @param {function} listener The callback to invoke when "event" is emitted.
     * @returns {EventEmitter} The current event emitter instance for chaining.
     * @memberof EventEmitter
     */
    once(event, listener) {
      return this.addListener(event, listener, 'once');
    }

    /**
     * Returns this listener count for the given event.
     * @param {string|symbol} event The name of the event to get the listener count of.
     * @returns {number} The number of registered events for "event".
     * @memberof EventEmitter
     */
    listenerCount(event) {
      return (this[events][event] || []).length;
    }

    /**
     * Returns a shallow copy of the listeners for the given event.
     * @param {string|symbol} event The name of the event to get the listeners of.
     * @returns {Array<function>} A shallow copy of the listeners for "event".
     * @memberof EventEmitter
     */
    listeners(event) {
      return (this[events][event] || []).map(getListenerProperty);
    }

    /**
     * @returns {Array<string|symbol>} The list of events which have registered listeners attached.
     * @memberof EventEmitter
     */
    eventNames() {
      return keysOfDefinedProperties(this[events]);
    }

    /**
     * An alias for EventEmitter#addListener
     * @memberof EventEmitter
     * @readonly
     */
    get on() {
      return this.addListener;
    }

    /**
     * An alias for EventEmitter#removeListener
     * @memberof EventEmitter
     * @readonly
     */
    get off() {
      return this.removeListener;
    }
  };
}

// Make the default export a function (the base EventEmitter class) and assign all
// exports to the class as properties. This makes the "exports" a bit more user
// friendly in the browser environment.
module.exports = assign(emitter(), exports);

