const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// This function triggers whenever a new order is created in 'incomingWebOrders'
exports.assignOrderNumber = functions.firestore
  .document("incomingWebOrders/{docId}")
  .onCreate(async (snap, context) => {
    const incomingOrderData = snap.data();
    const SHOP_ID = "tux"; // Your Shop ID

    // 1. Get the Atomic Counter from the same place the POS uses
    const counterRef = db.doc(`shops/${SHOP_ID}/state/counters`);

    let newOrderNo;
    try {
      // 2. Run a transaction to safely get and increment the order number
      await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        const currentNo = counterDoc.exists ? counterDoc.data().lastOrderNo || 0 : 0;
        newOrderNo = currentNo + 1;

        transaction.set(
          counterRef,
          { lastOrderNo: newOrderNo, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
      });

      if (!newOrderNo) {
        throw new Error("Failed to allocate new order number.");
      }

      // 3. Create the final order object with the new number
      const finalOrder = {
        ...incomingOrderData,
        orderNo: newOrderNo,
        createdAt: incomingOrderData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // 4. Write the final, numbered order to the collection the POS is listening to
      await db.collection(`shops/${SHOP_ID}/onlineOrders`).add(finalOrder);

      // 5. Clean up by deleting the temporary incoming order
      return snap.ref.delete();

    } catch (error) {
      console.error("Transaction failed: ", error);
      // Optional: You could move the failed order to an 'error' collection here
      return null;
    }
  });
