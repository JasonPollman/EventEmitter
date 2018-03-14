# @jasonpollman/event-emitter
**A node.js like `EventEmitter` that works in the browser.**

This library adheres to the same `EventEmitter` interface that comes packaged with node.js (with
the exception of `prependListener` and `prependOnceListener`).

**The following methods are implemented:**

- EventEmitter.defaultMaxListeners
- EventEmitter#addListener(eventName, listener)
- EventEmitter#emit(eventName[, ...args])
- EventEmitter#eventNames()
- EventEmitter#getMaxListeners()
- EventEmitter#listenerCount(eventName)
- EventEmitter#listeners(eventName)
- EventEmitter#on(eventName, listener)
- EventEmitter#once(eventName, listener)
- EventEmitter#removeAllListeners([eventName])
- EventEmitter#removeListener(eventName, listener)
- EventEmitter#setMaxListeners(n)

**The exported library is UMD**    
So it's consumable by both AMD and Common JS frameworks.

## Install

Via NPM:
```bash
npm install @jasonpollman/event-emitter --save
```

In the browser:
```html
<script src="dist/EventEmitter.js"></script>
```

### Usage

```js
import EventEmitter from '@jasonpollman/event-emitter';

const emitter = new EventEmitter();

emitter.on('example', () => console.log('The "example" event was emitted!'));
emitter.emit('example');
```