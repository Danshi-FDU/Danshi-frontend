export type PlatformStats = {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  totalViews: number;
  activeUsers: number;
  pendingPosts: number;
  todayStats: {
    newUsers: number;
    newPosts: number;
    newComments: number;
    newViews: number;
  };
};

export type UserAggregateStats = {
  postCount: number;
  totalLikes: number;
  totalFavorites: number;
  totalViews: number;
  commentCount: number;
  followerCount: number;
  followingCount: number;
};
