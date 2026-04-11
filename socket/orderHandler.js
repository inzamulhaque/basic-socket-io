const orderHandler = (io, socket) => {
  console.log("orderHandler", socket.id);

  // place order
  socket.on("placeOrder", async (data, callback) => {
    try {
      console.log(`place order from ${socket.id}`);
      //   const validation = validatedOrder(data);
    } catch (error) {
      console.error(error);
    }
  });
};

module.exports = orderHandler;
