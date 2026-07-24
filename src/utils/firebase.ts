/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  Timestamp
} from 'firebase/firestore';

// Configuração do Firebase carregada a partir das credenciais do projeto
const firebaseConfig = {
  apiKey: "AIzaSyA9GRpttRZlB331LjTTRQg61KneHWibAdg",
  authDomain: "gen-lang-client-0715548343.firebaseapp.com",
  projectId: "gen-lang-client-0715548343",
  storageBucket: "gen-lang-client-0715548343.firebasestorage.app",
  messagingSenderId: "211645716466",
  appId: "1:211645716466:web:4b9e10d7d1dc8711ce7d6b"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore utilizando a base de dados customizada do AI Studio
const db = getFirestore(app, "ai-studio-jfcheck-ecf2c19f-8a9c-4b57-8025-a9ebdd99d347");

/**
 * Salva os dados compactados de uma Entrega Técnica no Firestore com prazo de expiração de 3 dias.
 */
export async function salvarEntregaCompartilhada(id: string, compressedData: any): Promise<void> {
  const docRef = doc(db, 'shared_entregas', id);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 dias em milissegundos

  await setDoc(docRef, {
    id,
    compressedData,
    createdAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt)
  });

  // Tenta realizar uma limpeza em segundo plano de registros expirados de forma não-bloqueante
  limparRegistrosExpirados().catch(err => {
    console.error("Erro na limpeza de expirados em segundo plano:", err);
  });
}

/**
 * Obtém uma Entrega Técnica compartilhada no Firestore.
 * Retorna null se não existir ou se estiver expirada.
 */
export async function obterEntregaCompartilhada(id: string): Promise<any | null> {
  try {
    const docRef = doc(db, 'shared_entregas', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    const expiresAt: Timestamp = data.expiresAt;

    // Se estiver expirado, deleta do Firestore e retorna null
    if (expiresAt && expiresAt.toDate() < new Date()) {
      deleteDoc(docRef).catch(console.error);
      return null;
    }

    return data.compressedData;
  } catch (err) {
    console.error("Erro ao carregar entrega do Firestore:", err);
    return null;
  }
}

/**
 * Limpa todos os registros que já passaram do prazo de expiração.
 */
export async function limparRegistrosExpirados(): Promise<void> {
  try {
    const colRef = collection(db, 'shared_entregas');
    const q = query(colRef, where('expiresAt', '<', Timestamp.fromDate(new Date())));
    const querySnapshot = await getDocs(q);

    const promises: Promise<void>[] = [];
    querySnapshot.forEach((docSnap) => {
      promises.push(deleteDoc(docSnap.ref));
    });

    if (promises.length > 0) {
      await Promise.all(promises);
      console.log(`[Firebase Cleanup] ${promises.length} registros expirados foram limpos.`);
    }
  } catch (err) {
    console.error("Erro ao limpar registros expirados:", err);
  }
}

/**
 * Envia um e-mail de forma automática gravando um documento na coleção 'mail' do Firestore.
 * Esta coleção é monitorada pela Extensão do Firebase "Trigger Email from Firestore".
 */
export async function enviarEmailAutomaticoFirebase(
  para: string, 
  assunto: string, 
  texto: string, 
  html?: string
): Promise<string> {
  const mailRef = collection(db, 'mail');
  const docRef = await addDoc(mailRef, {
    to: para,
    message: {
      subject: assunto,
      text: texto,
      html: html || texto.replace(/\n/g, '<br>')
    },
    createdAt: Timestamp.now()
  });
  return docRef.id;
}
