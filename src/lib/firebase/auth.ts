import { 
	signInWithEmailAndPassword, 
	signOut as firebaseSignOut, 
	onAuthStateChanged,
	signInWithPopup,
	GoogleAuthProvider,
	type User 
} from 'firebase/auth';
import { getFirebaseInstances } from './config.js';

let currentUser: User | null = null;

/**
 * Get the currently authenticated user
 */
export function getCurrentUser(): User | null {
	return currentUser;
}

/**
 * Initialize auth state listener
 */
export function initializeAuth(callback?: (user: User | null) => void) {
	const { auth } = getFirebaseInstances();
	
	return onAuthStateChanged(auth, (user) => {
		currentUser = user;
		if (callback) {
			callback(user);
		}
	});
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<User> {
	try {
		const { auth } = getFirebaseInstances();
		const userCredential = await signInWithEmailAndPassword(auth, email, password);
		return userCredential.user;
	} catch (error) {
		console.error('Error signing in:', error);
		throw new Error('Failed to sign in. Please check your credentials.');
	}
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<User> {
	try {
		const { auth } = getFirebaseInstances();
		const provider = new GoogleAuthProvider();
		const userCredential = await signInWithPopup(auth, provider);
		return userCredential.user;
	} catch (error) {
		console.error('Error signing in with Google:', error);
		throw new Error('Failed to sign in with Google.');
	}
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
	try {
		const { auth } = getFirebaseInstances();
		await firebaseSignOut(auth);
		currentUser = null;
	} catch (error) {
		console.error('Error signing out:', error);
		throw new Error('Failed to sign out.');
	}
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
	return currentUser !== null;
}
