// Operações de leitura e escrita do catálogo.
// A autorização real é aplicada pelas regras do Firestore, não apenas pelo frontend.
import {
  collection, getDocs, query, where, orderBy,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { db } from "./firebase.js";

export async function getPublicCatalog() {
  const [categorySnapshot, productSnapshot] = await Promise.all([
    getDocs(query(collection(db, "categories"), where("published", "==", true), orderBy("order", "asc"))),
    getDocs(query(collection(db, "products"), where("published", "==", true), orderBy("order", "asc")))
  ]);
  return {
    categories: categorySnapshot.docs.map(item => ({ ...item.data(), id: item.id })),
    products: productSnapshot.docs.map(item => ({ ...item.data(), id: item.id }))
  };
}

export async function createCategory(data) {
  return addDoc(collection(db, "categories"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateCategory(id, data) {
  return updateDoc(doc(db, "categories", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteCategory(id) {
  return deleteDoc(doc(db, "categories", id));
}
export async function createProduct(data) {
  return addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateProduct(id, data) {
  return updateDoc(doc(db, "products", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteProduct(id) {
  return deleteDoc(doc(db, "products", id));
}

export async function getAdminCatalog() {
  const [categorySnapshot, productSnapshot] = await Promise.all([
    getDocs(query(collection(db, "categories"), orderBy("order", "asc"))),
    getDocs(query(collection(db, "products"), orderBy("order", "asc")))
  ]);
  return {
    categories: categorySnapshot.docs.map(item => ({ ...item.data(), id: item.id })),
    products: productSnapshot.docs.map(item => ({ ...item.data(), id: item.id }))
  };
}
