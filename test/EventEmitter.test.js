import {
  expect,
  assert,
} from 'chai';

import EventEmitter, {
  findIndex,
  validateEventArgument,
  keysOfDefinedProperties,
  validateListenerArgument,
} from '../src/EventEmitter';

const noop = () => {};

describe('EventEmitter', () => {
  let instance;

  beforeEach(() => {
    instance = new EventEmitter();
  });

  afterEach(() => {
    EventEmitter.defaultMaxListeners = 10;
  });

  it('Should have a static `defaultMaxListeners` property set to 10', () => {
    expect(EventEmitter.defaultMaxListeners).to.equal(10);
  });

  it('Should have a static `defaultMaxListeners` that can be set', () => {
    expect(EventEmitter.defaultMaxListeners).to.equal(10);

    EventEmitter.defaultMaxListeners = 20;
    expect(EventEmitter.defaultMaxListeners).to.equal(20);

    EventEmitter.defaultMaxListeners = 10;
    expect(EventEmitter.defaultMaxListeners).to.equal(10);
  });

  it('Should not allow `defaultMaxListeners` to be non-negative', () => {
    expect(EventEmitter.defaultMaxListeners).to.equal(10);

    EventEmitter.defaultMaxListeners = -100;
    expect(EventEmitter.defaultMaxListeners).to.equal(0);
  });

  it('Should set it to 0 if some non-numeric value is given', () => {
    expect(EventEmitter.defaultMaxListeners).to.equal(10);

    EventEmitter.defaultMaxListeners = 'foobar';
    expect(EventEmitter.defaultMaxListeners).to.equal(0);
  });

  describe('instances', () => {
    it('Should be an instance of EventEmitter', () => {
      expect(instance).to.be.an.instanceof(EventEmitter);
    });

    it('Should register event listeners', (done) => {
      const onTestEventEmitted = (...args) => {
        expect(args).to.eql([1, 2, 3]);
        done();
      };

      instance.on('test', onTestEventEmitted);

      expect(instance.listenerCount('test')).to.equal(1);
      expect(instance.listeners('test')).to.eql([onTestEventEmitted]);
      expect(instance.eventNames()).to.eql(['test']);

      instance.emit('test', 1, 2, 3);
    });


    it('Should refer to the EventEmitter within listeners', (done) => {
      // eslint-disable-next-line require-jsdoc
      function onTestEventEmitted() {
        expect(this).to.equal(instance);
        done();
      }

      instance.on('test', onTestEventEmitted);
      instance.emit('test');
    });

    it('Should register event listeners (nested on/emit calls)', (done) => {
      instance.once('b', () => {
        instance.on('a', done);
      });

      instance.on('a', () => {
        instance.emit('b');
      });

      instance.emit('a');
      instance.emit('a');
    });

    it('Should register event listeners (nested on/emit calls 2)', (done) => {
      instance.once('b', () => {
        instance.once('a', done);
      });

      instance.once('a', () => {
        instance.emit('b');
      });

      instance.emit('a');
      instance.emit('a');
    });

    it('Should register event listeners (nested on/emit calls 3)', (done) => {
      instance.once('a', () => {
        instance.emit('b');
      });

      instance.once('b', () => {
        instance.emit('c');
      });

      instance.once('c', () => {
        instance.emit('d');
      });

      instance.once('d', done);

      expect(instance.eventNames()).to.eql(['a', 'b', 'c', 'd']);
      expect(instance.listenerCount('a')).to.eql(1);
      expect(instance.listenerCount('b')).to.eql(1);
      expect(instance.listenerCount('c')).to.eql(1);
      expect(instance.listenerCount('d')).to.eql(1);

      instance.emit('a');
    });

    it('Should perform well on "hot" routes', (done) => {
      const max = 100000;

      let n = 0;
      let m = 0;

      instance.setMaxListeners(max);
      instance.on('done', (value) => {
        expect(n).to.equal(max);
        expect(m).to.equal(max);

        expect(value).to.equal(max);
        expect(instance.listenerCount('hot event')).to.equal(max);
        expect(instance.listenerCount('other hot event')).to.equal(1);
        done();
      });

      instance.on('other hot event', () => { m++; });

      const onEmitted = i => () => {
        n++;

        instance.emit('other hot event');
        if (i === max - 1) instance.emit('done', n);
      };

      for (let i = 0; i < max; i++) instance.on('hot event', onEmitted(i));
      instance.emit('hot event');
    });

    describe('EventEmitter#once', () => {
      it('Should dispose of one time event listeners once the event has emitted (1)', (done) => {
        const onTestEventEmitted = (...args) => {
          expect(args).to.eql([1, 2, 3]);
          done();
        };

        instance.once('test', onTestEventEmitted);

        expect(instance.listenerCount('test')).to.equal(1);
        expect(instance.listeners('test')).to.eql([onTestEventEmitted]);
        expect(instance.eventNames()).to.eql(['test']);

        instance.emit('test', 1, 2, 3);

        expect(instance.listenerCount('test')).to.equal(0);
        expect(instance.listeners('test')).to.eql([]);
        expect(instance.eventNames()).to.eql([]);
      });

      it('Should dispose of one time event listeners once the event has emitted (2)', (done) => {
        const onTestEventEmitted = (...args) => {
          expect(args).to.eql([1, 2, 3]);
          done();
        };

        const dummyListenerA = () => {};
        const dummyListenerB = () => {};

        instance.once('test', onTestEventEmitted);
        instance.on('test', dummyListenerA);
        instance.on('test', dummyListenerB);

        expect(instance.listenerCount('test')).to.equal(3);
        expect(instance.listeners('test')).to.eql([onTestEventEmitted, dummyListenerA, dummyListenerB]);
        expect(instance.eventNames()).to.eql(['test']);

        instance.emit('test', 1, 2, 3);

        expect(instance.listenerCount('test')).to.equal(2);
        expect(instance.listeners('test')).to.eql([dummyListenerA, dummyListenerB]);
        expect(instance.eventNames()).to.eql([]);
      });
    });

    describe('EventEmitter#removeListener', () => {
      it('Should be a noop if the given listener isn\'t attached', () => {
        instance.on('test', noop);
        expect(instance.removeListener('foo', noop)).to.equal(instance);
        expect(instance.removeListener('test', () => {})).to.equal(instance);
        expect(instance.listeners('test')).to.eql([noop]);
      });

      it('Should remove a registered event listener', () => {
        instance.on('test', noop);
        expect(instance.removeListener('test', noop)).to.equal(instance);
        expect(instance.removeListener('test', () => {})).to.equal(instance);
        expect(instance.listeners('test')).to.eql([]);
      });
    });

    describe('EventEmitter#off', () => {
      it('Should be a noop if the given listener isn\'t attached', () => {
        instance.on('test', noop);
        expect(instance.off('foo', noop)).to.equal(instance);
        expect(instance.off('test', () => {})).to.equal(instance);
        expect(instance.listeners('test')).to.eql([noop]);
      });

      it('Should remove a registered event listener', () => {
        instance.on('test', noop);
        expect(instance.off('test', noop)).to.equal(instance);
        expect(instance.off('test', () => {})).to.equal(instance);
        expect(instance.listeners('test')).to.eql([]);
      });
    });

    describe('EventEmitter#emit', () => {
      it('Should be a noop if no events are registered', () => {
        expect(instance.emit('foo')).to.equal(instance);
      });

      it('Should throw a warning if the number of max listeners has been reached', () => {
        /* eslint-disable no-console */
        const { warn } = console;

        let warned = false;
        console.warn = () => { warned = true; };

        try {
          expect(instance.maxListenersWarnedOnce).to.equal(undefined);

          for (let i = 0; i < instance.getMaxListeners() + 1; i++) {
            instance.addListener('quxx', noop);
          }

          expect(instance.maxListenersWarnedOnce).to.equal(true);
          expect(warned).to.equal(true);
        } finally {
          console.warn = warn;
        }

        /* eslint-enable no-console */
      });
    });

    describe('EventEmitter#addListener', () => {
      it('Should throw if the event name isn\'t a string or symbol', () => {
        assert.throws(() => instance.addListener({}));
      });

      it('Should throw if the event listener isn\'t a function', () => {
        assert.throws(() => instance.addListener('foo', {}));
      });
    });

    describe('EventEmitter#removeAllListeners', () => {
      it('Should remove all listeners for all events if no event name is given', () => {
        instance.on('foo', noop);
        instance.on('bar', noop);
        instance.once('baz', noop);

        expect(instance.removeAllListeners()).to.equal(instance);
        expect(instance.listeners('foo')).to.eql([]);
        expect(instance.listeners('bar')).to.eql([]);
        expect(instance.listeners('baz')).to.eql([]);
      });

      it('Should remove all listeners for a given events if an event name is given', () => {
        instance.on('foo', noop);
        instance.on('bar', noop);
        instance.once('baz', noop);

        expect(instance.removeAllListeners('foo')).to.equal(instance);
        expect(instance.listeners('foo')).to.eql([]);
        expect(instance.listeners('bar')).to.eql([noop]);
        expect(instance.listeners('baz')).to.eql([noop]);
      });
    });

    describe('EventEmitter#listeners', () => {
      it('Should always return an array', () => {
        instance.on('foo', noop);
        expect(instance.listeners()).to.eql([]);
        expect(instance.listeners(Date.now())).to.eql([]);
        expect(instance.listeners({})).to.eql([]);
      });

      it('Should return a shallow copy of the listeners array for the given event', () => {
        instance.on('test', noop);
        expect(instance.listeners('test')).to.eql([noop]);
      });
    });

    describe('EventEmitter#listenerCount', () => {
      it('Should always return a number', () => {
        instance.on('foo', noop);
        expect(instance.listenerCount()).to.eql(0);
        expect(instance.listenerCount(Date.now())).to.eql(0);
        expect(instance.listenerCount({})).to.eql(0);
      });

      it('Should return the number of listeners for the given event', () => {
        instance.on('test', noop);
        expect(instance.listenerCount('test')).to.eql(1);

        instance.on('test', noop);
        expect(instance.listenerCount('test')).to.eql(2);
      });
    });

    describe('EventEmitter#eventNames', () => {
      it('Should always return an array', () => {
        expect(instance.eventNames()).to.eql([]);
        expect(instance.eventNames(null)).to.eql([]);
        expect(instance.eventNames(0)).to.eql([]);
        expect(instance.eventNames(undefined)).to.eql([]);
      });

      it('Should return the names of events', () => {
        instance.on('test', noop);
        expect(instance.eventNames()).to.eql(['test']);

        instance.on('test', noop);
        expect(instance.eventNames()).to.eql(['test']);

        instance.on('test2', noop);
        expect(instance.eventNames()).to.eql(['test', 'test2']);

        instance.on('test2', noop);
        expect(instance.eventNames()).to.eql(['test', 'test2']);

        instance.removeAllListeners('test2');
        expect(instance.eventNames()).to.eql(['test']);

        instance.removeAllListeners('test');
        expect(instance.eventNames()).to.eql([]);
      });
    });

    describe('EventEmitter#getMaxlisteners', () => {
      it('Should return the number of "max listeners" for the current event emitter instance', () => {
        expect(instance.getMaxListeners()).to.equal(10);
      });
    });

    describe('EventEmitter#setMaxlisteners', () => {
      it('Should set the number of "max listeners" for the current event emitter instance', () => {
        expect(instance.getMaxListeners()).to.equal(10);
        expect(instance.setMaxListeners(50)).to.equal(instance);
        expect(instance.getMaxListeners()).to.equal(50);
      });

      it('Should not set negative numbers', () => {
        expect(instance.getMaxListeners()).to.equal(10);
        expect(instance.setMaxListeners(-50)).to.equal(instance);
        expect(instance.getMaxListeners()).to.equal(0);
      });

      it('Should not set non-numeric values', () => {
        expect(instance.getMaxListeners()).to.equal(10);
        expect(instance.setMaxListeners({})).to.equal(instance);
        expect(instance.getMaxListeners()).to.equal(0);
      });
    });
  });

  describe('validateEventArgument', () => {
    it('Should throw if the given argument isn\'t a valid event (string or symbol)', () => {
      assert.throws(
        () => validateEventArgument({}),
        'Argument for parameter "event" must be a string or symbol.',
      );
    });

    it('Should not throw if given a string', () => {
      expect(validateEventArgument('foo')).to.equal(undefined);
    });

    it('Should not throw if given a symbol', () => {
      expect(validateEventArgument(Symbol('foo'))).to.equal(undefined);
    });
  });

  describe('validateListenerArgument', () => {
    it('Should throw if the given argument isn\'t a valid listener (function)', () => {
      assert.throws(
        () => validateListenerArgument({}),
        'Argument for parameter "listener" must be a function.',
      );
    });

    it('Should not throw if given a function', () => {
      expect(validateListenerArgument(() => {})).to.equal(undefined);
    });
  });

  describe('findIndex', () => {
    it('Should behave like Array.prototype.findIndex (1)', () => {
      const data = [1, 2, 3, 4];
      expect(findIndex(data, value => value === 3)).to.equal(2);
    });

    it('Should behave like Array.prototype.findIndex (2)', () => {
      const data = [1, 2, 3, 4];
      const index = findIndex(data, (value, key, collection) => {
        expect(collection).to.equal(data);
        return key === 2;
      });

      expect(index).to.equal(2);
    });

    it('Should behave like Array.prototype.findIndex (3)', () => {
      const data = [1, 2, 3, 4];
      const index = findIndex(data, (value, key, collection) => {
        expect(collection).to.equal(data);
        return false;
      });

      expect(index).to.equal(-1);
    });
  });

  describe('keysOfDefinedProperties', () => {
    it('Should return all of the keys of an object whose properties are not `undefined` (1)', () => {
      expect(keysOfDefinedProperties({ foo: 'bar' })).to.eql(['foo']);
    });

    it('Should return all of the keys of an object whose properties are not `undefined` (2)', () => {
      expect(keysOfDefinedProperties({})).to.eql([]);
    });

    it('Should return all of the keys of an object whose properties are not `undefined` (3)', () => {
      expect(keysOfDefinedProperties({ foo: {}, bar: null, baz: undefined })).to.eql([
        'foo',
        'bar',
      ]);
    });
  });
});
