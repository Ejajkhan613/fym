function createOrderRealtimeGateway(io) {
  io.on("connection", (socket) => {
    const { customerId, pharmacyId, orderId } = socket.handshake.query || {};

    if (customerId) {
      socket.join(`customer:${customerId}`);
    }

    if (pharmacyId) {
      socket.join(`pharmacy:${pharmacyId}`);
    }

    if (orderId) {
      socket.join(`order:${orderId}`);
    }

    socket.on("order:join", ({ id }) => {
      if (id) {
        socket.join(`order:${id}`);
      }
    });

    socket.on("pharmacy:join", ({ id }) => {
      if (id) {
        socket.join(`pharmacy:${id}`);
      }
    });

    socket.on("customer:join", ({ id }) => {
      if (id) {
        socket.join(`customer:${id}`);
      }
    });
  });

  return io;
}

module.exports = {
  createOrderRealtimeGateway,
};
