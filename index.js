const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.numberOnlineOrder = functions.firestore
  .document("shops/{shopId}/onlineOrders/{docId}")
  .onCreate(async (snap, context) => {
    const orderData = snap.data();
    const { shopId, docId } = context.params;

    if (orderData.isNumbered) {
      console.log(`Order ${docId} is already numbered. Exiting.`);
      return null;
    }

    const counterRef = db.doc(`shops/${shopId}/state/counters`);
    let newOrderNo;

    try {
      await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        const currentNo = counterDoc.exists ? counterDoc.data().lastOnlineOrderNo || 0 : 0;
        newOrderNo = currentNo + 1;
        transaction.set(
          counterRef,
          { lastOnlineOrderNo: newOrderNo, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
      });

      if (!newOrderNo) {
        throw new Error("Failed to allocate a new online order number.");
      }

      const batch = db.batch();
      const formattedOrderNo = `W-${newOrderNo}`;

      // 1. Update the main order for the POS
      const mainOrderRef = snap.ref;
      batch.update(mainOrderRef, { 
        orderNo: formattedOrderNo,
        isNumbered: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // This is the document ID from the /profiles/{uid}/orders collection
      const profileOrderId = orderData.idemKey?.replace('website-order-', '');

      if (profileOrderId) {
        // 2. Update the user's private order history in their profile
        if (orderData.userId) {
          const userOrderRef = db.doc(`profiles/${orderData.userId}/orders/${profileOrderId}`);
          batch.update(userOrderRef, { orderNo: formattedOrderNo });
        }
        
        // 3. (NEW) Update the copy in the root /orders collection
        const rootOrderRef = db.doc(`orders/${profileOrderId}`);
        batch.update(rootOrderRef, { orderNo: formattedOrderNo });
      }
      
      await batch.commit();
      console.log(`Successfully assigned Order #${formattedOrderNo} everywhere for document ${docId}.`);

    } catch (error) {
      console.error("Transaction to number online order failed: ", error);
      return null;
    }
    return null;
  });
