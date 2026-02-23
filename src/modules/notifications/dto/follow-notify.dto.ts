export interface FollowNotifyDto {
  userId: string;      // receptor
  followerId: string;  // quien sigue
  createdAt?: string;
}