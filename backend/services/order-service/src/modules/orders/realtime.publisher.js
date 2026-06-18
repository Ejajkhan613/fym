const { EventEmitter } = require("events");

class RealtimePublisher {
  constructor({ emitter = new EventEmitter(), io = null } = {}) {
    this.emitter = emitter;
    this.io = io;
  }

  publish(event) {
    this.emitter.emit(event.eventName, event);
    this.emitter.emit("order.realtime", event);

    if (this.io) {
      this.io.to(event.channel).emit(event.eventName, event.payload);
      this.io.to(event.channel).emit("order.realtime", event);

      if (event.aggregateId) {
        this.io
          .to(`order:${event.aggregateId}`)
          .emit(event.eventName, event.payload);
        this.io.to(`order:${event.aggregateId}`).emit("order.realtime", event);
      }
    }
  }

  attachSocketServer(io) {
    this.io = io;
    return this;
  }
}

module.exports = {
  RealtimePublisher,
};
