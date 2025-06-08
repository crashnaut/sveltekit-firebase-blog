export interface BlogPost {
    id: string;
    title: string;
    content: string;
    excerpt: string;
    author: string;
    date: string;
    imageUrl: string;
    imageHint: string;
    commentCount?: number;
    likeCount?: number;
    createdAt?: string;
    updatedAt?: string;
    published?: boolean;
    tags?: string[];
}

export interface BlogPostsResult {
    posts: BlogPost[];
    hasMore: boolean;
    lastPost?: any;
    error?: string;
}

export interface Comment {
    id: string;
    postId: string;
    userId: string;
    userDisplayName: string;
    userPhotoURL?: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    likeCount?: number;
    dislikeCount?: number;
    parentId?: string;
    replyCount?: number;
}

export interface NewComment {
    postId: string;
    content: string;
    parentId?: string;
}

export interface CommentLike {
    id?: string;
    commentId: string;
    userId: string;
    createdAt: string;
}

export interface CommentReply {
    commentId: string;
    content: string;
    parentId: string;
}

export interface BlogConfig {
    postsPerPage?: number;
    enableComments?: boolean;
    enableLikes?: boolean;
    requireAuth?: boolean;
    moderateComments?: boolean;
}
