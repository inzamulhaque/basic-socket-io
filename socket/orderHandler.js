import { validatedOrder } from "../utils/helper.js";

export const orderHandler = (io, socket) => {
  console.log("orderHandler", socket.id);

  // place order
  socket.on("placeOrder", async (data, callback) => {
    try {
      console.log(`place order from ${socket.id}`);
      const validation = validatedOrder(data);

      if (!validation.valid) {
        return callback({
          success: false,
          message: validation.message,
        });
      }
    } catch (error) {
      console.error(error);
    }
  });
};
