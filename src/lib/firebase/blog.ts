import {
	collection,
	getDocs,
	getDoc,
	doc,
	query,
	orderBy,
	limit,
	startAfter,
	addDoc,
	updateDoc,
	deleteDoc,
	setDoc,
	serverTimestamp,
	increment,
	where,
	type QueryDocumentSnapshot
} from 'firebase/firestore';
import { getFirebaseInstances } from './config.js';
import { getCurrentUser } from './auth.js';
import type { BlogPost, BlogPostsResult } from '../types/index.js';

const POSTS_PER_PAGE = 6;

/**
 * Get paginated blog posts from Firestore
 */
export async function getBlogPosts(page = 1, lastPost?: QueryDocumentSnapshot): Promise<BlogPostsResult> {
	const { db } = getFirebaseInstances();
	const postsRef = collection(db, 'posts');
	let q = query(postsRef, orderBy('date', 'desc'), limit(POSTS_PER_PAGE + 1));

	if (lastPost) {
		q = query(postsRef, orderBy('date', 'desc'), startAfter(lastPost), limit(POSTS_PER_PAGE + 1));
	}

	try {
		const snapshot = await getDocs(q);
		const hasMore = snapshot.docs.length > POSTS_PER_PAGE;
		const posts = snapshot.docs.slice(0, POSTS_PER_PAGE).map((doc) => ({
id: doc.id,
...doc.data()
		})) as BlogPost[];

		return {
			posts,
			lastPost: hasMore ? snapshot.docs[POSTS_PER_PAGE - 1] : null,
			hasMore
		};
	} catch (error) {
		console.error('Error fetching blog posts:', error);
		throw new Error('Failed to fetch blog posts. Please try again later.');
	}
}

/**
 * Get a single blog post by ID
 */
export async function getBlogPost(id: string): Promise<BlogPost | null> {
	try {
		const { db } = getFirebaseInstances();
		const docRef = doc(db, 'posts', id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data()
			} as BlogPost;
		}
		return null;
	} catch (error) {
		console.error('Error fetching blog post:', error);
		throw new Error('Failed to fetch blog post. Please try again later.');
	}
}

/**
 * Create a new blog post directly in Firestore
 */
export async function createBlogPost(blogPost: Omit<BlogPost, 'id'>): Promise<BlogPost> {
	try {
		const currentUser = getCurrentUser();
		if (!currentUser) {
			throw new Error('Authentication required');
		}

		const { db } = getFirebaseInstances();
		
		// Create a slug if not provided
		const slug = blogPost.title
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^\w-]/g, '');
		
		const postWithId = {
			...blogPost,
			id: slug,
			createdAt: blogPost.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		const docRef = doc(db, 'posts', slug);
		await setDoc(docRef, postWithId);
		
		return postWithId as BlogPost;
	} catch (error) {
		console.error('Error creating blog post:', error);
		throw new Error(error instanceof Error ? error.message : 'Failed to create blog post');
	}
}

/**
 * Update an existing blog post in Firestore
 */
export async function updateBlogPost(id: string, blogPostData: Partial<BlogPost>): Promise<BlogPost> {
	try {
		const currentUser = getCurrentUser();
		if (!currentUser) {
			throw new Error('Authentication required');
		}

		const { db } = getFirebaseInstances();
		blogPostData.updatedAt = new Date().toISOString();
		
		const docRef = doc(db, 'posts', id);
		const docSnap = await getDoc(docRef);
		
		if (!docSnap.exists()) {
			throw new Error('Blog post not found');
		}
		
		await updateDoc(docRef, blogPostData);
		
		const updatedDocSnap = await getDoc(docRef);
		
		return {
			id,
			...updatedDocSnap.data()
		} as BlogPost;
	} catch (error) {
		console.error('Error updating blog post:', error);
		throw new Error(error instanceof Error ? error.message : 'Failed to update blog post');
	}
}

/**
 * Delete a blog post from Firestore
 */
export async function deleteBlogPost(id: string): Promise<boolean> {
	try {
		const currentUser = getCurrentUser();
		if (!currentUser) {
			throw new Error('Authentication required');
		}
		
		const { db } = getFirebaseInstances();
		const docRef = doc(db, 'posts', id);
		await deleteDoc(docRef);
		
		return true;
	} catch (error) {
		console.error('Error deleting blog post:', error);
		throw new Error(error instanceof Error ? error.message : 'Failed to delete blog post');
	}
}

/**
 * Like a blog post
 */
export async function likePost(postId: string): Promise<void> {
	try {
		const user = getCurrentUser();
		if (!user) throw new Error('Authentication required');

		const { db } = getFirebaseInstances();
		const likesRef = collection(db, 'postLikes');
		const postRef = doc(db, 'posts', postId);
		
		// Check if already liked
		const existingLikeQuery = query(
			likesRef,
			where('postId', '==', postId),
			where('userId', '==', user.uid)
		);
		
		const existingLikes = await getDocs(existingLikeQuery);
		
		if (existingLikes.empty) {
			// Add like
			await addDoc(likesRef, {
				postId,
				userId: user.uid,
				createdAt: new Date().toISOString()
			});
			
			// Update post like count
			await updateDoc(postRef, {
				likeCount: increment(1)
			});
		}
	} catch (error) {
		console.error('Error liking post:', error);
		throw new Error('Failed to like post');
	}
}

/**
 * Unlike a blog post
 */
export async function unlikePost(postId: string): Promise<void> {
	try {
		const user = getCurrentUser();
		if (!user) throw new Error('Authentication required');

		const { db } = getFirebaseInstances();
		const likesRef = collection(db, 'postLikes');
		const postRef = doc(db, 'posts', postId);
		
		// Find and remove existing like
		const existingLikeQuery = query(
			likesRef,
			where('postId', '==', postId),
			where('userId', '==', user.uid)
		);
		
		const existingLikes = await getDocs(existingLikeQuery);
		
		if (!existingLikes.empty) {
			await deleteDoc(existingLikes.docs[0].ref);
			
			// Update post like count
			await updateDoc(postRef, {
				likeCount: increment(-1)
			});
		}
	} catch (error) {
		console.error('Error unliking post:', error);
		throw new Error('Failed to unlike post');
	}
}

/**
 * Check if user has liked a post
 */
export async function hasUserLikedPost(postId: string): Promise<boolean> {
	try {
		const user = getCurrentUser();
		if (!user) return false;

		const { db } = getFirebaseInstances();
		const likesRef = collection(db, 'postLikes');
		
		const likeQuery = query(
			likesRef,
			where('postId', '==', postId),
			where('userId', '==', user.uid),
			limit(1)
		);
		
		const snapshot = await getDocs(likeQuery);
		return !snapshot.empty;
	} catch (error) {
		console.error('Error checking like status:', error);
		return false;
	}
}
