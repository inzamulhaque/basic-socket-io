import { getCollection } from "../config/database.js";
import {
  calculateTotal,
  createOrderDocument,
  validatedOrder,
} from "../utils/helper.js";

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

      const totals = calculateTotal(data.items);
      const orderId = generateOrderId();
      const orderData = createOrderDocument(data, orderId, totals);

      const ordersCollection = getCollection("orders");
      await ordersCollection.insertOne(orderData);

      // Emit order confirmation to the client
      socket.join(orderId); // Join a room with the order ID
      socket.join("customers"); // Join a common room for all customers

      socket.join("admins").emit("newOrder", { orderData }); // Notify admin about new order

      callback({
        success: true,
        message: "Order placed successfully",
        order: orderData,
      });

      console.log(`Order Placed: ${orderID}`);
    } catch (error) {
      console.error(error);
      callback({
        success: false,
        message: "Failed to place order",
      });
    }
  });

  // track order status
  socket.on("trackOrder", async (data, callback) => {
    try {
      const ordersCollection = getCollection("orders");
      const order = await ordersCollection.findOne({ orderId: data?.orderId });
      if (!order) {
        return callback({
          success: false,
          message: "Order not found",
        });
      }

      socket.join(data?.orderId); // Join a room with the order ID

      callback({
        success: true,
        message: "Order found",
        order,
      });
    } catch (error) {
      console.error(error);
      callback({
        success: false,
        message: "Failed to track order",
      });
    }
  });
};
