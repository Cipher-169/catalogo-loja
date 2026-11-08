// Operações de leitura e escrita do catálogo.
// A autorização real é aplicada pelas regras do Firestore, não apenas pelo frontend.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
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
  // A ordenação é feita no cliente para incluir documentos antigos sem o campo order
  // e evitar dependência de índices compostos no Firestore.
  const categoryRequest = publishedOnly
    ? getDocs(query(categoriesCollection, where("published", "==", true)))
    : getDocs(categoriesCollection);
  const productRequest = publishedOnly
    ? getDocs(query(productsCollection, where("published", "==", true)))
    : getDocs(productsCollection);
  const [categorySnapshot, productSnapshot] = await Promise.all([categoryRequest, productRequest]);
  const sortByOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0);
  let categories = mapDocuments(categorySnapshot);
  let products = mapDocuments(productSnapshot);

  if (publishedOnly) {
    categories = categories.filter(item => item.published === true);
    products = products.filter(item => item.published === true);
  }

  return {
    categories: categories.sort(sortByOrder),
    products: products.sort(sortByOrder),
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

export async function updateCategory(id, data) {
  const categoryRef = doc(db, "categories", id);
  const currentSnapshot = await getDoc(categoryRef);
  if (!currentSnapshot.exists()) throw new Error("Esta categoria não existe mais.");
  const previousName = currentSnapshot.data().name;
  const batch = writeBatch(db);
  batch.update(categoryRef, { ...data, ...updateTimestamp() });

  // Ao renomear a categoria, mantém os produtos vinculados ao novo nome.
  if (previousName && previousName !== data.name) {
    const linkedProducts = await getDocs(query(productsCollection, where("category", "==", previousName)));
    if (linkedProducts.size > 499) {
      throw new Error("Há muitos produtos vinculados para renomear em uma única operação. Divida a atualização em etapas.");
    }
    linkedProducts.docs.forEach(product => batch.update(product.ref, { category: data.name, ...updateTimestamp() }));
  }
  return batch.commit();
}

export async function deleteCategory(id) {
  const categoryRef = doc(db, "categories", id);
  const categorySnapshot = await getDoc(categoryRef);
  if (!categorySnapshot.exists()) throw new Error("Esta categoria não existe mais.");
  const categoryName = categorySnapshot.data().name;
  const linkedProducts = await getDocs(query(productsCollection, where("category", "==", categoryName)));
  if (!linkedProducts.empty) {
    throw new Error("Esta categoria possui produtos vinculados. Reatribua ou exclua esses produtos antes de excluir a categoria.");
  }
  return deleteDoc(categoryRef);
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
