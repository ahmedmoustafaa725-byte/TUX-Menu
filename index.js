const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// This function triggers when the website creates a new order in the onlineOrders collection.
exports.numberOnlineOrder = functions.firestore
  .document("shops/{shopId}/onlineOrders/{docId}")
  .onCreate(async (snap, context) => {
    const orderData = snap.data();
    const { shopId, docId } = context.params;

    // Exit if the order somehow already has a real number (prevents loops).
    if (orderData.isNumbered) {
      console.log(`Order ${docId} is already numbered. Exiting.`);
      return null;
    }

    // 1. Reference the atomic counter for online orders.
    const counterRef = db.doc(`shops/${shopId}/state/counters`);
    let newOrderNo;

    try {
      // 2. Run a transaction to safely get and increment the online order number.
      await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        // Use the 'lastOnlineOrderNo' field, defaulting to 0 if it doesn't exist.
        const currentNo = counterDoc.exists ? counterDoc.data().lastOnlineOrderNo || 0 : 0;
        newOrderNo = currentNo + 1;

        // Update the counter document with the new number.
        transaction.set(
          counterRef,
          { lastOnlineOrderNo: newOrderNo, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
      });

      if (!newOrderNo) {
        throw new Error("Failed to allocate a new online order number.");
      }

      // 3. Prepare a batch to update both the main online order and the user's private order history.
      const batch = db.batch();

      // Format the number with a "W-" prefix for "Website".
      const formattedOrderNo = `W-${newOrderNo}`;

      // Update the main order document that the POS listens to.
      const mainOrderRef = snap.ref;
      batch.update(mainOrderRef, { 
        orderNo: formattedOrderNo,
        isNumbered: true, // A flag to prevent this function from running again.
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4. Update the user's private order in their profile so they see the real number.
      // This uses the IDs you are already saving from the website.
      if (orderData.userId && orderData.idemKey) {
        const profileOrderId = orderData.idemKey.replace('website-order-', '');
        if(profileOrderId) {
            const userOrderRef = db.doc(`profiles/${orderData.userId}/orders/${profileOrderId}`);
            batch.update(userOrderRef, { orderNo: formattedOrderNo });
        }
      }
      
      // Commit all updates at once.
      await batch.commit();
      console.log(`Successfully assigned Order #${formattedOrderNo} to document ${docId}.`);

    } catch (error) {
      console.error("Transaction to number online order failed: ", error);
      return null;
    }
    return null;
  });
