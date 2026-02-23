export interface LikeNotifyDto {
  userId: string; // recipient (author of the tweet)
  tweetId: string;
  likerId: string; // who liked
  createdAt?: string;
}
