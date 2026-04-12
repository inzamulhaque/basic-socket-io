export const validatedOrder = (data) => {
  if (!data?.customerName?.trim()) {
    return {
      valid: false,
      message: "Customer name is required",
    };
  }

  if (!data?.customerphone?.trim()) {
    return {
      valid: false,
      message: "Customer phone is required",
    };
  }

  if (!data?.address?.trim()) {
    return {
      valid: false,
      message: "Customer address is required",
    };
  }

  if (Array.isArray(data?.items)) {
    return {
      valid: false,
      message: "Order have must at least one item",
    };
  }

  return {
    valid: true,
  };
};

// order id generator
export const generateOrderId = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");

  const randomNum = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
};
