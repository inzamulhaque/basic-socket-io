import { ReturnDocument } from "mongodb";
import { getCollection } from "../config/database.js";
import {
  calculateTotal,
  createOrderDocument,
  isValidStatusTransition,
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

  // cancel order
  socket.on("cancelOrder", async (data, callback) => {
    try {
      const ordersCollection = getCollection("orders");
      const order = await ordersCollection.findOne({ orderId: data?.orderId });

      if (!order) {
        return callback({
          success: false,
          message: "Order not found",
        });
      }

      if (!["pending", "confirmed"].includes(order.status)) {
        return callback({
          success: false,
          message: "Order cannot be cancelled",
        });
      }

      await ordersCollection.findOneAndUpdate(
        {
          orderId: data?.orderId,
        },
        {
          $set: {
            status: "cancelled",
            updatedAt: new Date(),
          },
          $push: {
            statusHistory: {
              status: "cancelled",
              timestamp: new Date(),
              by: socket.id,
              note: data?.reason || "Cancelled by customer",
            },
          },
        },
      );

      io.to(order.orderId).emit("orderCancelled", {
        orderId: order.orderId,
        customerName: order.customerName,
        message: "Order has been cancelled",
      });

      io.to("admins").emit("orderCancelled", {
        orderId: order.orderId,
        customerName: order.customerName,
        message: "Order has been cancelled",
      });

      callback({
        success: true,
        message: "Order cancelled successfully",
      });
    } catch (error) {
      console.error(error);
      callback({
        success: false,
        message: "Failed to cancel order",
      });
    }
  });

  // get my orders
  socket.on("getMyOrders", async (data, callback) => {
    try {
      const ordersCollection = getCollection("orders");
      const orders = await ordersCollection
        .find({ customerPhone: data?.customerPhone })
        .sort({ createdAt: -1 })
        .toArray();

      callback({
        success: true,
        message: "Orders retrieved successfully",
        orders,
      });
    } catch (error) {
      console.error(error);
      callback({
        success: false,
        message: "Failed to get orders",
      });
    }
  });

  // admins event
  socket.on("adminLogin", (data, callback) => {
    try {
      if (data?.password === process.env.ADMIN_PASSWORD) {
        socket.isAdmin = true;
        socket.join("admins");
        console.log(`Admin logged in: ${socket.id}`);
        callback({
          success: true,
          message: "Logged in as admin",
        });
      } else {
        callback({
          success: false,
          message: "Invalid admin credentials",
        });
      }
    } catch (error) {
      console.error(error);
      callback({
        success: false,
        message: "Failed to login as admin",
      });
    }
  });

  // get all orders for admin
  socket.on("getAllOrders", async (data, callback) => {
    try {
      if (!socket.isAdmin) {
        return callback({
          success: false,
          message: "Unauthorized",
        });
      }

      const ordersCollection = getCollection("orders");
      const filter = data?.status ? { status: data.status } : {};
      const orders = await ordersCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();

      callback({
        success: true,
        message: "Orders retrieved successfully",
        orders,
      });
    } catch (error) {
      console.error(error);
      callback({
        success: false,
        message: "Failed to get orders",
      });
    }
  });

  // update order status by admin
  socket.on("updateOrderStatus", async (data, callback) => {
    try {
      if (!socket.isAdmin) {
        return callback({
          success: false,
          message: "Unauthorized",
        });
      }

      const ordersCollection = getCollection("orders");
      const order = await ordersCollection.findOne({ orderId: data?.orderId });

      if (!order) {
        return callback({
          success: false,
          message: "Order not found",
        });
      }

      if (!isValidStatusTransition(order.status, data.newStatus)) {
        return callback({
          success: false,
          message: "Invalid status transition",
        });
      }

      const result = await ordersCollection.findOneAndUpdate(
        {
          orderId: data?.orderId,
        },
        {
          $set: {
            status: data.newStatus,
            updatedAt: new Date(),
          },

          $push: {
            statusHistory: {
              status: data.newStatus,
              timestamp: new Date(),
              by: socket.id,
              note: data?.note || `Status changed to ${data.newStatus}`,
            },
          },
        },
        {
          ReturnDocument: "after",
        },
      );

      io.to(data.orderId).emit("statusUpdated", {
        orderId: data.orderId,
        newStatus: data.newStatus,
        order: result,
        message: `Order status updated to ${data.newStatus}`,
      });

      socket.to("admins").emit("orderStatusChanged", {
        orderId: data.orderId,
        newStatus: data.newStatus,
        order: result,
        message: `Order status updated to ${data.newStatus}`,
      });

      callback({
        success: true,
        message: "Order status updated successfully",
        order: result,
      });
    } catch (error) {
      console.error(error);
      callback({
        success: false,
        message: "Failed to update order status",
      });
    }
  });

  // accept order by admin
  socket.on("acceptOrder", async (data, callback) => {
    try {
      if (!socket.isAdmin) {
        return callback({
          success: false,
          message: "Unauthorized",
        });
      }

      const ordersCollection = getCollection("orders");
      const order = await ordersCollection.findOne({ orderId: data?.orderId });

      if (!order || order?.status !== "pending") {
        return callback({
          success: false,
          message: "Order not found or cannot be accepted",
        });
      }

      const estimatedTime = data?.estimatedTime || 30; // default estimated time is 30 minutes

      const result = await ordersCollection.findOneAndUpdate(
        {
          orderId: data?.orderId,
        },
        {
          $set: {
            status: "confirmed",
            estimatedTime,
            updatedAt: new Date(),
          },

          $push: {
            statusHistory: {
              status: "confirmed",
              timestamp: new Date(),
              by: socket.id,
              note: `Order accepted with estimated time ${estimatedTime} minutes`,
            },
          },
        },
        {
          ReturnDocument: "after",
        },
      );

      io.to(data.orderId).emit("orderAccepted", {
        orderId: data.orderId,
        estimatedTime,
        order: result,
        message: `Order accepted with estimated time ${estimatedTime} minutes`,
      });

      socket.to("admins").emit("orderAcceptedByAdmin", {
        orderId: data.orderId,
        estimatedTime,
        order: result,
        message: `Order accepted with estimated time ${estimatedTime} minutes`,
      });

      callback({
        success: true,
        message: "Order accepted successfully",
        order: result,
      });
    } catch (error) {
      console.error(error);
      callback({
        success: false,
        message: "Failed to accept order",
      });
    }
  });

  // reject order by admin
  socket.on("rejectOrder", async (data, callback) => {
    try {
      if (!socket.isAdmin) {
        return callback({
          success: false,
          message: "Unauthorized",
        });
      }

      const ordersCollection = getCollection("orders");
      const order = await ordersCollection.findOne({ orderId: data?.orderId });

      if (!order || order?.status !== "pending") {
        return callback({
          success: false,
          message: "Order not found or cannot be rejected",
        });
      }

      const result = await ordersCollection.findOneAndUpdate(
        {
          orderId: data?.orderId,
        },
        {
          $set: {
            status: "cancelled",
            updatedAt: new Date(),
          },
          $push: {
            statusHistory: {
              status: "cancelled",
              timestamp: new Date(),
              by: socket.id,
              note: data?.reason || "Order cancelled by admin",
            },
          },
        },
        {
          new: true,
        },
      );

      io.to(data.orderId).emit("orderRejected", {
        orderId: data.orderId,
        order: result,
        reason: data?.reason || "Order cancelled by admin",
        message: "Order rejected successfully",
      });

      socket.to("admins").emit("orderRejectedByAdmin", {
        orderId: data.orderId,
        order: result,
        reason: data?.reason || "Order cancelled by admin",
        message: "Order rejected successfully",
      });

      callback({
        success: true,
        message: "Order rejected successfully",
        order: result,
      });
    } catch (error) {
      console.error(error);
      callback({
        success: false,
        message: "Failed to reject order",
      });
    }
  });

  // get live stats
  socket.on("getLiveStats", async (data, callback) => {
    try {
      if (!socket.isAdmin) {
        return callback({
          success: false,
          message: "Unauthorized",
        });
      }

      const ordersCollection = getCollection("orders");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = {
        totalOrders: await ordersCollection.countDocuments({
          createdAt: { $gte: today },
        }),
        pendingOrders: await ordersCollection.countDocuments({
          status: "pending",
        }),
        confirmedOrders: await ordersCollection.countDocuments({
          status: "confirmed",
        }),
        cancelledOrders: await ordersCollection.countDocuments({
          status: "cancelled",
        }),
        preparingOrders: await ordersCollection.countDocuments({
          status: "preparing",
        }),
        readyOrders: await ordersCollection.countDocuments({
          status: "ready",
        }),
        outForDeliveryOrders: await ordersCollection.countDocuments({
          status: "out_for_delivery",
        }),
        deliveredOrders: await ordersCollection.countDocuments({
          status: "delivered",
        }),
      };

      callback({
        success: true,
        message: "Live stats retrieved successfully",
        stats,
      });
    } catch (error) {
      console.error(error);
      callback({
        success: false,
        message: "Failed to get live stats",
      });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`👋 User disconnected: ${socket.id}`);
    if (socket.isAdmin) {
      socket.to("admins").emit("adminDisconnected", { adminId: socket.id });
    }
  });
};
