import { Controller, Get, Query } from '@nestjs/common';
import { TrendingService } from './trending.service';
import { TrendingItem } from './dto/trending.dto';

@Controller('trending')
export class TrendingController {
	constructor(private readonly trendingService: TrendingService) {}

	@Get()
	async getTrending(
		@Query('country') country?: string,
		@Query('limit') limit?: string,
		@Query('includeCounts') includeCounts?: string,
	) {
		const n = limit ? parseInt(limit, 10) || 10 : 10;
		const c = country || 'united-states';
		const ic = includeCounts === 'true' || includeCounts === '1';
		// Obtener tendencias y devolver un objeto con meta información
		const tendencias: TrendingItem[] = await this.trendingService.getTrending(c, n, ic);
		return { country: c, count: tendencias.length, tendencias };
	}
}
