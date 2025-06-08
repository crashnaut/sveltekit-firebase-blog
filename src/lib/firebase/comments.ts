import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  updateDoc,
  increment,
  getDoc,
  serverTimestamp,
  limit,
  type DocumentData,
  Timestamp,
  or,
  and,
  setDoc
} from 'firebase/firestore';
import { getFirebaseInstances } from './config.js';
import { getCurrentUser } from './auth.js';
import type { Comment, NewComment, CommentLike, CommentReply } from '../types/index.js';

/**
 * Add a new comment to a blog post
 */
export async function addComment(comment: NewComment): Promise<Comment | null> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Authentication required to comment');
    }

    const { db } = getFirebaseInstances();
    const commentsRef = collection(db, 'comments');
    
    const newComment = {
      postId: comment.postId,
      userId: user.uid,
      userDisplayName: user.displayName || user.email || 'Anonymous',
      userPhotoURL: user.photoURL || '',
      content: comment.content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likeCount: 0,
      dislikeCount: 0,
      replyCount: 0,
      parentId: comment.parentId || null
    };

    const docRef = await addDoc(commentsRef, newComment);
    
    // If this is a reply, update the parent comment's reply count
    if (comment.parentId) {
      const parentCommentRef = doc(db, 'comments', comment.parentId);
      await updateDoc(parentCommentRef, {
        replyCount: increment(1)
      });
    }

    // Update the blog post's comment count
    const postRef = doc(db, 'posts', comment.postId);
    await updateDoc(postRef, {
      commentCount: increment(1)
    });

    const createdComment = await getDoc(docRef);
    return {
      id: docRef.id,
      ...createdComment.data(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Comment;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw new Error('Failed to add comment');
  }
}

/**
 * Get top-level comments for a specific blog post
 */
export async function getComments(postId: string, includeReplies: boolean = false): Promise<Comment[]> {
  try {
    const { db } = getFirebaseInstances();
    const commentsRef = collection(db, 'comments');
    
    let q = query(
      commentsRef,
      where('postId', '==', postId),
      where('parentId', '==', null),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const comments: Comment[] = [];

    for (const doc of snapshot.docs) {
      const commentData = doc.data();
      const comment: Comment = {
        id: doc.id,
        ...commentData,
        createdAt: commentData.createdAt?.toDate?.()?.toISOString() || commentData.createdAt,
        updatedAt: commentData.updatedAt?.toDate?.()?.toISOString() || commentData.updatedAt
      } as Comment;

      comments.push(comment);
    }

    return comments;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw new Error('Failed to fetch comments');
  }
}

/**
 * Get replies to a specific comment
 */
export async function getCommentReplies(commentId: string): Promise<Comment[]> {
  try {
    const { db } = getFirebaseInstances();
    const commentsRef = collection(db, 'comments');
    
    const q = query(
      commentsRef,
      where('parentId', '==', commentId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    const replies: Comment[] = [];

    for (const doc of snapshot.docs) {
      const commentData = doc.data();
      const reply: Comment = {
        id: doc.id,
        ...commentData,
        createdAt: commentData.createdAt?.toDate?.()?.toISOString() || commentData.createdAt,
        updatedAt: commentData.updatedAt?.toDate?.()?.toISOString() || commentData.updatedAt
      } as Comment;

      replies.push(reply);
    }

    return replies;
  } catch (error) {
    console.error('Error fetching comment replies:', error);
    throw new Error('Failed to fetch comment replies');
  }
}

/**
 * Like or unlike a comment
 */
export async function toggleCommentLike(commentId: string, isLike: boolean = true): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Authentication required to like comments');
    }

    const { db } = getFirebaseInstances();
    const likesRef = collection(db, 'commentLikes');
    
    // Check if user already liked/disliked this comment
    const existingLikeQuery = query(
      likesRef,
      where('commentId', '==', commentId),
      where('userId', '==', user.uid)
    );
    
    const existingLikes = await getDocs(existingLikeQuery);
    const commentRef = doc(db, 'comments', commentId);
    
    if (!existingLikes.empty) {
      // Remove existing like/dislike
      const existingLike = existingLikes.docs[0];
      const existingData = existingLike.data();
      
      await deleteDoc(existingLike.ref);
      
      // Update comment counts
      if (existingData.isLike) {
        await updateDoc(commentRef, { likeCount: increment(-1) });
      } else {
        await updateDoc(commentRef, { dislikeCount: increment(-1) });
      }
    }
    
    // Add new like/dislike
    const newLike: Omit<CommentLike, 'id'> = {
      commentId,
      userId: user.uid,
      createdAt: new Date().toISOString()
    };
    
    await addDoc(likesRef, { ...newLike, isLike });
    
    // Update comment counts
    if (isLike) {
      await updateDoc(commentRef, { likeCount: increment(1) });
    } else {
      await updateDoc(commentRef, { dislikeCount: increment(1) });
    }
  } catch (error) {
    console.error('Error toggling comment like:', error);
    throw new Error('Failed to update comment like');
  }
}

/**
 * Delete a comment (admin or comment author only)
 */
export async function deleteComment(commentId: string): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    const { db } = getFirebaseInstances();
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }
    
    const commentData = commentSnap.data();
    
    // Check if user is the comment author (you can add admin check here)
    if (commentData.userId !== user.uid) {
      throw new Error('Permission denied');
    }
    
    // Delete the comment
    await deleteDoc(commentRef);
    
    // Update blog post comment count
    const postRef = doc(db, 'posts', commentData.postId);
    await updateDoc(postRef, {
      commentCount: increment(-1)
    });
    
    // If this was a reply, update parent comment's reply count
    if (commentData.parentId) {
      const parentCommentRef = doc(db, 'comments', commentData.parentId);
      await updateDoc(parentCommentRef, {
        replyCount: increment(-1)
      });
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw new Error('Failed to delete comment');
  }
}

/**
 * Check if user has liked a comment
 */
export async function hasUserLikedComment(commentId: string): Promise<boolean> {
  try {
    const user = getCurrentUser();
    if (!user) return false;

    const { db } = getFirebaseInstances();
    const likesRef = collection(db, 'commentLikes');
    
    const likeQuery = query(
      likesRef,
      where('commentId', '==', commentId),
      where('userId', '==', user.uid),
      where('isLike', '==', true),
      limit(1)
    );
    
    const snapshot = await getDocs(likeQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking comment like status:', error);
    return false;
  }
}

/**
 * Check if user has disliked a comment
 */
export async function hasUserDislikedComment(commentId: string): Promise<boolean> {
  try {
    const user = getCurrentUser();
    if (!user) return false;

    const { db } = getFirebaseInstances();
    const likesRef = collection(db, 'commentLikes');
    
    const dislikeQuery = query(
      likesRef,
      where('commentId', '==', commentId),
      where('userId', '==', user.uid),
      where('isLike', '==', false),
      limit(1)
    );
    
    const snapshot = await getDocs(dislikeQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking comment dislike status:', error);
    return false;
  }
}

/**
 * Edit a comment (comment author only)
 */
export async function editComment(commentId: string, newContent: string): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('Authentication required');

    const { db } = getFirebaseInstances();
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }
    
    const commentData = commentSnap.data();
    
    if (commentData.userId !== user.uid) {
      throw new Error('Permission denied');
    }
    
    await updateDoc(commentRef, {
      content: newContent,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error editing comment:', error);
    throw new Error('Failed to edit comment');
  }
}

// Alias functions for better naming
export const likeComment = (commentId: string) => toggleCommentLike(commentId, true);
export const unlikeComment = (commentId: string) => toggleCommentLike(commentId, true);
export const dislikeComment = (commentId: string) => toggleCommentLike(commentId, false);
export const undislikeComment = (commentId: string) => toggleCommentLike(commentId, false);
