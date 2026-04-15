export const validatedOrder = (data) => {
  if (!data?.customerName?.trim()) {
    return {
      valid: false,
      message: "Customer name is required",
    };
  }

  if (!data?.customerPhone?.trim()) {
    return {
      valid: false,
      message: "Customer phone is required",
    };
  }

  if (!data?.customerAddress?.trim()) {
    return {
      valid: false,
      message: "Customer address is required",
    };
  }

  if (!Array.isArray(data?.items)) {
    return {
      valid: false,
      message: "Order have must at least one item",
    };
  }

  // Validate each item
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (!item.name || !item.quantity || !item.price) {
      return { valid: false, message: `Item ${i + 1} is incomplete` };
    }
    if (item.quantity <= 0 || item.price <= 0) {
      return { valid: false, message: `Item ${i + 1} has invalid values` };
    }
  }

  return {
    valid: true,
  };
};

// order id generator
export const generateOrderId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");

  const randomNum = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  console.log(`ORD-${year}${month}${day}-${randomNum}`);

  return `ORD-${year}${month}${day}-${randomNum}`;
};

export const calculateTotal = (items) => {
  const subTotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const tax = subTotal * 0.1; // 10% tax
  const deliveryFee = 100; // flat delivery fee
  const total = subTotal + tax + deliveryFee;

  return {
    subTotal,
    tax,
    deliveryFee,
    total,
  };
};

export const createOrderDocument = (orderData, orderId, totals) => {
  return {
    orderId,
    customerName: orderData.customerName.trim(),
    customerPhone: orderData.customerPhone.trim(),
    customerAddress: orderData.customerAddress.trim(),
    items: orderData.items,
    subTotal: totals.subTotal,
    tax: totals.tax,
    deliveryFee: totals.deliveryFee,
    totalAmount: totals.total,
    specialNotes: orderData.specialNotes || "",
    paymentMethod: orderData.paymentMethod || "cash",
    paymentStatus: "pending",
    status: "pending",
    statusHistory: [
      {
        status: "pending",
        timestamp: new Date(),
        by: "customer",
        note: "Order placed",
      },
    ],
    estimatedTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const isValidStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
};
