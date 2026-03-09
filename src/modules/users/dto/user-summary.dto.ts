export class UserSummaryDto {
  id!: string;
  name!: string;
  email?: string;
  profileImage?: string | null;
  isFollowing!: boolean;
  isFollowedBy!: boolean;
  // atributo para simplificar la lógica en el frontend, combinando isFollowing e isFollowedBy
  followStatus!: 'none' | 'following' | 'follow_back' | 'mutual' | 'self';
}
