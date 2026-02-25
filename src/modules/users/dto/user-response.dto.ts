export class UserResponseDto {
  id!: string;
  name!: string;
  email!: string;
  createdAt!: Date;
  followersCount!: number;
  followingCount!: number;
  isFollowing!: boolean;
  isFollowedBy!: boolean;
  // atributo para simplificar la lógica en el frontend, combinando isFollowing e isFollowedBy
  followStatus!: 'none' | 'following' | 'follow_back' | 'mutual' | 'self';
}
