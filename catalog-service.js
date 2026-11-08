// Operações de leitura e escrita do catálogo.
// A autorização real é aplicada pelas regras do Firestore, não apenas pelo frontend.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { db } from "./firebase.js";

const categoriesCollection = collection(db, "categories");
const productsCollection = collection(db, "products");

function mapDocuments(snapshot) {
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

async function getCatalog({ publishedOnly = false } = {}) {
  const categoryConstraints = [orderBy("order", "asc")];
  const productConstraints = [orderBy("order", "asc")];

  if (publishedOnly) {
    categoryConstraints.unshift(where("published", "==", true));
    productConstraints.unshift(where("published", "==", true));
  }

  const [categorySnapshot, productSnapshot] = await Promise.all([
    getDocs(query(categoriesCollection, ...categoryConstraints)),
    getDocs(query(productsCollection, ...productConstraints)),
  ]);

  return {
    categories: mapDocuments(categorySnapshot),
    products: mapDocuments(productSnapshot),
  };
}

function createTimestamps() {
  return {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function updateTimestamp() {
  return { updatedAt: serverTimestamp() };
}

export function getPublicCatalog() {
  return getCatalog({ publishedOnly: true });
}

export function getAdminCatalog() {
  return getCatalog();
}

export function createCategory(data) {
  return addDoc(categoriesCollection, { ...data, ...createTimestamps() });
}

export function updateCategory(id, data) {
  return updateDoc(doc(db, "categories", id), {
    ...data,
    ...updateTimestamp(),
  });
}

export function deleteCategory(id) {
  return deleteDoc(doc(db, "categories", id));
}

export function createProduct(data) {
  return addDoc(productsCollection, { ...data, ...createTimestamps() });
}

export function updateProduct(id, data) {
  return updateDoc(doc(db, "products", id), {
    ...data,
    ...updateTimestamp(),
  });
}

export function deleteProduct(id) {
  return deleteDoc(doc(db, "products", id));
}
